export interface PulseIntelligence {
  type: 'safety' | 'news' | 'event';
  title: string;
  description: string;
  source: string;
  urgency: boolean;
  publishedAt?: string;
  url?: string;
}

type NewsApiArticle = {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
};

type NewsApiResponse = {
  articles?: NewsApiArticle[];
};

const SAFETY_KEYWORDS = ['strike', 'protest', 'warning', 'alert', 'closed', 'danger', 'delay', 'emergency'];
const EVENT_KEYWORDS = ['festival', 'concert', 'match', 'parade', 'expo', 'fair', 'conference'];
const GLOBAL_NOISE_KEYWORDS = ['global', 'world', 'international', 'geopolitics', 'markets'];

function hasLocalCitySignal(article: NewsApiArticle, cityName: string): boolean {
  const title = article.title?.toLowerCase() ?? '';
  const description = article.description?.toLowerCase() ?? '';
  const text = `${title} ${description}`.trim();
  if (!text) return false;

  const cityLower = cityName.toLowerCase().trim();
  const cityTokens = cityLower.split(/\s+/).filter(Boolean);
  const includesCity =
    text.includes(cityLower) || cityTokens.some((token) => token.length > 2 && text.includes(token));

  if (!includesCity && GLOBAL_NOISE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return false;
  }

  return includesCity;
}

function toPulseIntelligence(article: NewsApiArticle): PulseIntelligence | null {
  if (!article.title) return null;
  const title = article.title.trim();
  const description = article.description?.trim() || 'No description provided.';
  const titleLower = title.toLowerCase();
  const isSafety = SAFETY_KEYWORDS.some((keyword) => titleLower.includes(keyword));
  const isEvent = !isSafety && EVENT_KEYWORDS.some((keyword) => titleLower.includes(keyword));

  return {
    type: isSafety ? 'safety' : isEvent ? 'event' : 'news',
    title,
    description,
    source: article.source?.name?.trim() || 'News Feed',
    urgency: isSafety,
    publishedAt: article.publishedAt,
    url: article.url,
  };
}

async function fetchNewsApiPulse(cityName: string): Promise<PulseIntelligence[]> {
  // MVP note: VITE_NEWS_API_KEY is client-exposed in this serverless frontend pattern.
  const apiKey = import.meta.env.VITE_NEWS_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing VITE_NEWS_API_KEY');

  const q = encodeURIComponent(cityName);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=3`;

  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`NewsAPI request failed (${response.status}) for ${cityName}`);
  }

  const payload = (await response.json()) as NewsApiResponse;
  const articles = payload.articles ?? [];

  return articles
    .filter((article) => hasLocalCitySignal(article, cityName))
    .map(toPulseIntelligence)
    .filter((item): item is PulseIntelligence => Boolean(item));
}

function dedupeByTitle(items: PulseIntelligence[]): PulseIntelligence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchCityPulse(cityName: string): Promise<PulseIntelligence[]> {
  // Scalable wrapper: add more providers (PredictHQ / safety feeds) here via allSettled.
  const providers: Array<() => Promise<PulseIntelligence[]>> = [
    () => fetchNewsApiPulse(cityName),
  ];

  const settled = await Promise.allSettled(providers.map((provider) => provider()));
  const merged: PulseIntelligence[] = [];

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    merged.push(...result.value);
  }

  return dedupeByTitle(merged);
}
