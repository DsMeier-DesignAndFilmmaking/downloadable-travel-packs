/**
 * Vercel Serverless Function: HADE LLM Decision Engine
 * POST /api/generate-hade
 *
 * Accepts city data from the CityPack model and returns an LLM-generated
 * HADE recommendation grounded in the city's specific neighborhoods.
 *
 * 3-model waterfall: Gemini (primary) → Llama/Groq → Claude/OpenRouter
 */

// ─── Section 1: Inline Vercel types ──────────────────────────────────────────

type VercelRequest = {
  method?: string;
  body?: string;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  end(body?: string): void;
};

// ─── Section 2: Environment variables ────────────────────────────────────────

const GEMINI_API_KEY     = (process.env.GEMINI_API_KEY     || '').trim();
const GROQ_API_KEY       = (process.env.GROQ_API_KEY       || '').trim();
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

// ─── Section 3: Constants ─────────────────────────────────────────────────────

const LLM_TIMEOUT_MS   = 8000;
const GEMINI_MODEL     = 'gemini-1.5-flash';           // hardcoded for quota stability
const GROQ_MODEL       = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';

// ─── Section 4: Input / output types ─────────────────────────────────────────

// Minimal subset of CityPackNeighborhood (inlined — api/ cannot import from src/)
type HadeCityNeighborhood = {
  name: string;
  vibe: string;
  safetyScore: number;
};

// Minimal subset of CityPack accepted in the request body
type HadeCityData = {
  name: string;
  theme: string;                    // city vibes / narrative overview
  neighborhoods: HadeCityNeighborhood[];
  survival: {
    tipping: string;
    tapWater: string;
    currentScams: string[];
  };
  real_time_hacks?: string[];
};

// The response interface this endpoint guarantees
interface HadeDecisionResponse {
  primary: {
    keyword: string;     // single action word e.g. "Explore", "Eat", "Rest"
    description: string; // 1–2 sentences grounded in city-specific data
    subNode: string;     // must be a name from the neighborhoods array
  };
  tags: string[];        // 2–4 descriptive lowercase strings
}

// Internal types for upstream API shapes
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type OpenAiCompatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

// ─── Section 5: Helper utilities ─────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sendJson(
  res: VercelResponse,
  status: number,
  body: HadeDecisionResponse | { error: string },
): void {
  res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(body));
}

function buildSystemPrompt(city: HadeCityData): string {
  const neighborhoodList = city.neighborhoods
    .map(n => `  - ${n.name}: ${n.vibe} (safety ${n.safetyScore}/10)`)
    .join('\n');

  const scamList = city.survival.currentScams.length > 0
    ? city.survival.currentScams.join('; ')
    : 'None reported';

  const hacksSection = city.real_time_hacks && city.real_time_hacks.length > 0
    ? `\nReal-time hacks:\n${city.real_time_hacks.map(h => `  - ${h}`).join('\n')}`
    : '';

  return `You are a local city intelligence engine for ${city.name}.

City vibe: ${city.theme}

Neighborhoods (you MUST choose subNode from exactly one of these names — copy it verbatim):
${neighborhoodList}

Survival context:
  - Tipping: ${city.survival.tipping}
  - Tap water: ${city.survival.tapWater}
  - Known scams: ${scamList}${hacksSection}

Your task: Generate a single HADE decision recommendation for a traveller currently in ${city.name}.

STRICT RULES:
1. "subNode" MUST be one of the exact neighborhood names listed above — copy it verbatim, no paraphrasing.
2. "keyword" must be a single short action word (e.g. "Explore", "Eat", "Rest", "Move", "Escape").
3. "description" must be 1–2 sentences grounded in the specific city data above. Reference the chosen neighborhood by name.
4. "tags" must be an array of 2–4 lowercase descriptive strings (e.g. "evening", "safe", "local", "outdoor", "transit").
5. Return ONLY a valid JSON object — no markdown, no code fences, no explanation, no trailing text.

Required JSON schema (return exactly this shape):
{
  "primary": {
    "keyword": string,
    "description": string,
    "subNode": string
  },
  "tags": string[]
}`;
}

function parseAndValidateLlmResponse(
  raw: string,
  neighborhoods: HadeCityNeighborhood[],
): HadeDecisionResponse | null {
  // Strip markdown code fences and whitespace; extract from first { to last }
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Record<string, unknown>;
  const primary = record['primary'];
  if (!primary || typeof primary !== 'object') return null;

  const primaryRecord = primary as Record<string, unknown>;
  const keyword     = primaryRecord['keyword'];
  const description = primaryRecord['description'];
  const subNode     = primaryRecord['subNode'];
  const tags        = record['tags'];

  // Strict type-guards
  if (typeof keyword !== 'string'     || keyword.trim().length === 0) return null;
  if (typeof description !== 'string' || description.trim().length === 0) return null;
  if (typeof subNode !== 'string'     || subNode.trim().length === 0) return null;
  if (!Array.isArray(tags) || tags.length === 0) return null;
  if (!tags.every(t => typeof t === 'string')) return null;

  // subNode grounding: MUST be one of the provided neighborhood names
  const validNames = neighborhoods.map(n => n.name);
  const resolvedSubNode = validNames.includes(subNode) ? subNode : validNames[0];

  return {
    primary: {
      keyword:     keyword.trim(),
      description: description.trim(),
      subNode:     resolvedSubNode,
    },
    tags: (tags as string[]).slice(0, 4).map(t => t.trim().toLowerCase()),
  };
}

// ─── Section 6: LLM provider functions ───────────────────────────────────────

async function callGemini(
  prompt: string,
  neighborhoods: HadeCityNeighborhood[],
): Promise<HadeDecisionResponse | null> {
  if (!GEMINI_API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
      LLM_TIMEOUT_MS,
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') return null;

    return parseAndValidateLlmResponse(text, neighborhoods);
  } catch {
    return null;
  }
}

async function callLlama(
  prompt: string,
  neighborhoods: HadeCityNeighborhood[],
): Promise<HadeDecisionResponse | null> {
  if (!GROQ_API_KEY) return null;

  try {
    const response = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      },
      LLM_TIMEOUT_MS,
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as OpenAiCompatResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return null;

    return parseAndValidateLlmResponse(text, neighborhoods);
  } catch {
    return null;
  }
}

async function callClaude(
  prompt: string,
  neighborhoods: HadeCityNeighborhood[],
): Promise<HadeDecisionResponse | null> {
  if (!OPENROUTER_API_KEY) return null;

  try {
    const response = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      },
      LLM_TIMEOUT_MS,
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as OpenAiCompatResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return null;

    return parseAndValidateLlmResponse(text, neighborhoods);
  } catch {
    return null;
  }
}

// ─── Section 7: Default export handler ───────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Method guard
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    if (req.body) {
      const parsed = JSON.parse(req.body) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        sendJson(res, 400, { error: 'Request body must be a JSON object' });
        return;
      }
      body = parsed as Record<string, unknown>;
    }
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  // Validate cityData presence
  const cityDataRaw = body['cityData'];
  if (!cityDataRaw || typeof cityDataRaw !== 'object' || Array.isArray(cityDataRaw)) {
    sendJson(res, 400, { error: 'Missing or invalid cityData field' });
    return;
  }

  const cd = cityDataRaw as Record<string, unknown>;

  // Validate required cityData fields
  if (typeof cd['name'] !== 'string' || (cd['name'] as string).trim().length === 0) {
    sendJson(res, 400, { error: 'cityData.name must be a non-empty string' });
    return;
  }
  if (typeof cd['theme'] !== 'string' || (cd['theme'] as string).trim().length === 0) {
    sendJson(res, 400, { error: 'cityData.theme must be a non-empty string' });
    return;
  }
  if (!Array.isArray(cd['neighborhoods']) || (cd['neighborhoods'] as unknown[]).length === 0) {
    sendJson(res, 400, { error: 'cityData.neighborhoods must be a non-empty array' });
    return;
  }

  const survivalRaw = cd['survival'];
  if (!survivalRaw || typeof survivalRaw !== 'object' || Array.isArray(survivalRaw)) {
    sendJson(res, 400, { error: 'cityData.survival must be an object' });
    return;
  }

  // Construct typed cityData
  const survivalRecord = survivalRaw as Record<string, unknown>;
  const cityData: HadeCityData = {
    name:          (cd['name'] as string).trim(),
    theme:         (cd['theme'] as string).trim(),
    neighborhoods: (cd['neighborhoods'] as HadeCityNeighborhood[]),
    survival: {
      tipping:      typeof survivalRecord['tipping'] === 'string' ? survivalRecord['tipping'] : '',
      tapWater:     typeof survivalRecord['tapWater'] === 'string' ? survivalRecord['tapWater'] : '',
      currentScams: Array.isArray(survivalRecord['currentScams'])
        ? (survivalRecord['currentScams'] as string[]).filter(s => typeof s === 'string')
        : [],
    },
    real_time_hacks: Array.isArray(cd['real_time_hacks'])
      ? (cd['real_time_hacks'] as string[]).filter(h => typeof h === 'string')
      : undefined,
  };

  // Build shared prompt
  const prompt = buildSystemPrompt(cityData);

  // 3-model waterfall: Gemini → Llama → Claude
  let result = await callGemini(prompt, cityData.neighborhoods);
  if (result === null) result = await callLlama(prompt, cityData.neighborhoods);
  if (result === null) result = await callClaude(prompt, cityData.neighborhoods);

  if (result === null) {
    sendJson(res, 503, { error: 'All LLM providers unavailable' });
    return;
  }

  sendJson(res, 200, result);
}
