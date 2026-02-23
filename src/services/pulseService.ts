import { cities as staticCities } from '@/data/cities';

export interface PulseIntelligence {
  type: 'safety' | 'news' | 'event';
  title: string;
  description: string;
  source: string;
  urgency: boolean;
  publishedAt?: string;
  url?: string;
  image?: string;
}

type UnknownRecord = Record<string, unknown>;

type GNewsArticle = {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  image?: string;
  source?: { name?: string; url?: string };
};

type GNewsResponse = {
  articles?: GNewsArticle[];
};

type CachedPulsePayload = {
  data: PulseIntelligence[];
  timestamp: number;
};

const SAFETY_KEYWORDS = ['strike', 'protest', 'warning', 'alert', 'closed', 'danger', 'delay', 'emergency'];
const EVENT_KEYWORDS = ['festival', 'concert', 'match', 'parade', 'expo', 'fair', 'conference'];
const GLOBAL_NOISE_KEYWORDS = ['global', 'world', 'international', 'geopolitics', 'markets'];
const BLACKLIST_DOMAINS = ['birminghammail.co.uk', 'dailymail.co.uk', 'thesun.co.uk', 'mirror.co.uk', 'yahoo.com'];
const PULSE_TIMEOUT_MS = 5000;
const PULSE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function hasLocalCitySignal(article: GNewsArticle, cityName: string): boolean {
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

function toPulseIntelligence(article: GNewsArticle): PulseIntelligence | null {
  if (!article.title) return null;
  const title = article.title.trim();
  const description = article.description?.trim() || 'No description provided.';
  const searchable = `${title} ${description}`.toLowerCase();
  const isSafety = SAFETY_KEYWORDS.some((keyword) => searchable.includes(keyword));
  const isEvent = !isSafety && EVENT_KEYWORDS.some((keyword) => searchable.includes(keyword));

  return {
    type: isSafety ? 'safety' : isEvent ? 'event' : 'news',
    title,
    description,
    source: article.source?.name?.trim() || 'News Feed',
    urgency: isSafety,
    publishedAt: article.publishedAt,
    url: article.url,
    image: article.image,
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function parseGNewsResponse(raw: unknown): GNewsResponse | null {
  if (!isRecord(raw) || !Array.isArray(raw.articles)) return null;
  return raw as GNewsResponse;
}

function getHostName(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isBlacklistedSource(article: GNewsArticle): boolean {
  const articleHost = getHostName(article.url);
  const sourceHost = getHostName(article.source?.url);
  const hosts = [articleHost, sourceHost].filter(Boolean);

  return hosts.some((host) =>
    BLACKLIST_DOMAINS.some((blacklistedDomain) => host === blacklistedDomain || host.endsWith(`.${blacklistedDomain}`)),
  );
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PULSE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`CITY_PULSE_HTTP_${response.status}`);
  }

  return (await response.json()) as unknown;
}

/**
 * Ghost Protocol fetch path with AllOrigins as the sole upstream route.
 */
async function fetchWithFallback(url: string): Promise<GNewsResponse | null> {
  const proxyOneUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`;
  try {
    const proxyOne = await fetchJsonWithTimeout(proxyOneUrl);
    if (!isRecord(proxyOne) || typeof proxyOne.contents !== 'string') {
      throw new Error('CITY_PULSE_PARSE_ERROR');
    }

    const parsedContents = JSON.parse(proxyOne.contents) as unknown;
    const parsedProxyOne = parseGNewsResponse(parsedContents);
    if (parsedProxyOne) return parsedProxyOne;
  } catch {
    console.warn('Route 1 throttled.');
  }

  return null;
}

function getPulseCacheKey(slug: string): string {
  return `pulse_data_${slug}`;
}

function readFreshPulseCache(slug?: string): PulseIntelligence[] | null {
  if (!slug || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getPulseCacheKey(slug));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedPulsePayload;
    if (!cached || !Array.isArray(cached.data) || typeof cached.timestamp !== 'number') {
      window.localStorage.removeItem(getPulseCacheKey(slug));
      return null;
    }

    if (Date.now() - cached.timestamp > PULSE_CACHE_TTL_MS) {
      window.localStorage.removeItem(getPulseCacheKey(slug));
      return null;
    }

    return cached.data;
  } catch {
    window.localStorage.removeItem(getPulseCacheKey(slug));
    return null;
  }
}

function writePulseCache(slug: string | undefined, data: PulseIntelligence[]): void {
  if (!slug || typeof window === 'undefined' || data.length === 0) return;

  const payload: CachedPulsePayload = {
    data,
    timestamp: Date.now(),
  };
  window.localStorage.setItem(getPulseCacheKey(slug), JSON.stringify(payload));
}

async function fetchGNewsPulse(cityName: string): Promise<PulseIntelligence[]> {
  // MVP note: VITE_GNEWS_API_KEY is client-exposed in this serverless frontend pattern.
  const apiKey = import.meta.env.VITE_GNEWS_API_KEY?.trim();
  if (!apiKey) return [];

  const sanitizedCity = cityName.trim();
  if (!sanitizedCity) return [];

  const tacticalQuery = `"${sanitizedCity}" AND (traffic OR "transit alert" OR safety)`;
  const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(tacticalQuery)}&lang=en&max=3&apikey=${apiKey}`;
  const parsed = await fetchWithFallback(gnewsUrl);
  const articles = parsed?.articles ?? [];

  return articles
    .filter((article) => !isBlacklistedSource(article))
    .filter((article) => hasLocalCitySignal(article, sanitizedCity))
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

export async function fetchCityPulse(cityName: string, slug?: string): Promise<PulseIntelligence[]> {
  const cachedData = readFreshPulseCache(slug);
  if (cachedData?.length) return cachedData;

  // Scalable wrapper: add more providers (PredictHQ / safety feeds) here via allSettled.
  const providers: Array<() => Promise<PulseIntelligence[]>> = [
    () => fetchGNewsPulse(cityName),
  ];

  const settled = await Promise.allSettled(providers.map((provider) => provider()));
  const merged: PulseIntelligence[] = [];

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    merged.push(...result.value);
  }

  const deduped = dedupeByTitle(merged);
  writePulseCache(slug, deduped);
  return deduped;
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildOfflineIntel(citySlug: string, cityName: string): PulseIntelligence[] {
  const staticCity = staticCities.find((entry) => entry.slug === citySlug);
  const friendlyCity = toTitleCase(cityName || citySlug.replace(/-/g, ' '));

  if (!staticCity) {
    return [
      {
        type: 'safety',
        title: `${friendlyCity}: Offline Safety Intel`,
        description: 'Live feed delayed. Use official transit and keep valuables secured in dense arrival zones.',
        source: 'Offline Intel',
        urgency: true,
      },
      {
        type: 'news',
        title: `${friendlyCity}: Local Mobility Baseline`,
        description: 'Default to official rail/bus routes and licensed taxi stands until signal improves.',
        source: 'Offline Intel',
        urgency: false,
      },
    ];
  }

  return [
    {
      type: 'safety',
      title: `${friendlyCity}: Safety Baseline`,
      description: staticCity.scams[0] || staticCity.emergency.notes || 'Monitor crowded transit points and keep valuables secure.',
      source: 'Offline Intel',
      urgency: true,
    },
    {
      type: 'event',
      title: `${friendlyCity}: Transit Snapshot`,
      description: staticCity.transit.app || staticCity.transit.payment || 'Use official public transport and verified ride options.',
      source: 'Offline Intel',
      urgency: false,
    },
    {
      type: 'news',
      title: `${friendlyCity}: Utility Snapshot`,
      description: staticCity.frictionPoints.water || staticCity.frictionPoints.toilets || 'Keep backup utility supplies while offline.',
      source: 'Offline Intel',
      urgency: false,
    },
  ];
}

export async function fetchCityPulseForSlug(citySlug: string, cityName: string): Promise<PulseIntelligence[]> {
  try {
    const live = await fetchCityPulse(cityName, citySlug);
    if (live.length === 0) return [];
    return live;
  } catch {
    return buildOfflineIntel(citySlug, cityName);
  }
}
