/**
 * Google Pulse — City Vitals from Google Air Quality + Pollen APIs.
 * POST /api/vitals/google-pulse
 */

import fs from 'node:fs';
import path from 'node:path';

// --- INLINED UTILITIES (Fixes ERR_MODULE_NOT_FOUND) ---
function formatCityLabel(label: string): string {
  if (!label) return '';
  return label
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// --- TYPES ---
type VercelRequest = {
  method?: string;
  body?: any; // Vercel can parse this automatically or pass as string
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  json(body: any): void;
  end(body?: string): void;
};

type SeasonalBaselineEntry = {
  steady: { aqi: number; traffic_delay_pct?: number };
  retention_rate?: number;
  source_ref?: string;
};

type SeasonalBaselineMap = Record<string, SeasonalBaselineEntry>;

type GooglePulseApiResponse = {
  title: string;
  context_id: string;
  current_conditions: string;
  action: string;
  impact: string;
  neighborhood_investment: string;
  is_live: boolean;
  source_ref: string;
};

type GoogleAirQualityResponse = {
  indexes?: Array<{ code?: string; aqi?: number }>;
  healthRecommendations?: { generalPopulation?: string };
}

// --- CONFIG & CONSTANTS ---
const MAPS_API_KEY = (process.env.Maps_Platform_API_Key || process.env.MAPS_PLATFORM_API_KEY || '').trim();
const SEASONAL_BASELINE_PATH = path.join(process.cwd(), 'public', 'data', 'seasonal-baseline.json');
const GOOGLE_REQUEST_TIMEOUT_MS = 5000;
const AQI_HEAVY_DELTA_PCT = 15;

let baselineCache: SeasonalBaselineMap | null = null;

// --- HELPERS ---
function normalizeCityId(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readSeasonalBaselineMap(): SeasonalBaselineMap {
  if (baselineCache) return baselineCache;
  try {
    if (!fs.existsSync(SEASONAL_BASELINE_PATH)) return {};
    const raw = fs.readFileSync(SEASONAL_BASELINE_PATH, 'utf8');
    baselineCache = JSON.parse(raw) as SeasonalBaselineMap;
    return baselineCache;
  } catch (err) {
    console.error("Baseline Read Error:", err);
    return {};
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// --- CORE HANDLER ---
export default async function handler(req: any, res: any): Promise<void> {
  // 1. Method Guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Parse Body (Vercel handles parsing usually, but we check both)
  let parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { lat, lng } = parsedBody;
  const cityIdRaw = parsedBody.cityId || '';
  const cityId = normalizeCityId(cityIdRaw);

  if (!cityId) {
    return res.status(400).json({ error: 'Missing cityId' });
  }

  // 3. Load Baselines
  const baselines = readSeasonalBaselineMap();
  const cityBaseline = baselines[cityId] || baselines[normalizeCityId(cityId)];
  const aqiBaseline = cityBaseline?.steady?.aqi ?? 50;
  const retentionRate = clamp(cityBaseline?.retention_rate ?? 0.8, 0, 1);
  const pct = Math.round(retentionRate * 100);

  // 4. Default / Fallback Builder
  const buildFallback = (isLive = false, isHeavy = false) => ({
    title: formatCityLabel(cityId),
    context_id: `${cityId}-${isHeavy ? 'heavy' : 'steady'}`,
    current_conditions: isHeavy 
        ? "The air feels a bit heavy today; consider lower-intensity activities." 
        : "The district is breathing easy today with fresh, clear skies.",
    action: isHeavy
        ? "Since the roads are feeling the squeeze, taking the local rail keeps the streets clear."
        : "It's a perfect day for a walk or bike ride to keep the neighborhood quiet and vibrant.",
    impact: isHeavy
        ? "By bypassing the gridlock, you're helping lower curbside emissions for local residents."
        : "Your choice helps preserve the peaceful charm of these historic blocks.",
    neighborhood_investment: `${pct}% Stays Local`,
    is_live: isLive,
    source_ref: isLive ? 'Ref: Google Maps Platform' : 'Ref: Seasonal Baseline'
  });

  // 5. Fetch Live Data if Coordinates exist
  if (!lat || !lng || !MAPS_API_KEY) {
    return res.status(200).json(buildFallback(false, false));
  }

  try {
    const airUrl = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${MAPS_API_KEY}`;
    const airRes = await fetchWithTimeout(airUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { latitude: lat, longitude: lng },
        extraComputations: ['HEALTH_RECOMMENDATIONS', 'LOCAL_AQI'],
        languageCode: 'en',
      })
    }, GOOGLE_REQUEST_TIMEOUT_MS);

    if (!airRes.ok) throw new Error("Google API Health Check Failed");

    const airData = (await airRes.json()) as GoogleAirQualityResponse;
    const liveAqi = airData.indexes?.find(i => i.code === 'uaqi')?.aqi ?? aqiBaseline;
    const isHeavy = liveAqi > (aqiBaseline * (1 + AQI_HEAVY_DELTA_PCT / 100));
    
    const googleAdvice = airData.healthRecommendations?.generalPopulation;
    const finalResponse = buildFallback(true, isHeavy);

    // Override fallback text with live Google data if available
    if (isHeavy && googleAdvice) {
      finalResponse.current_conditions = googleAdvice;
    }

    return res.status(200).json(finalResponse);

  } catch (err) {
    console.error("Live Fetch Error, falling back to steady:", err);
    return res.status(200).json(buildFallback(false, false));
  }
}