/**
 * Google Pulse — City Vitals from Google Air Quality + Pollen APIs.
 * POST /api/vitals/google-pulse
 * Body: { lat: number; lng: number; cityId: string }
 *
 * All requests are server-side; API key is never sent to the client.
 */

import fs from 'node:fs';
import path from 'node:path';

import { formatCityLabel } from '../../src/utils/formatCityLabel';

type VercelRequest = {
  method?: string;
  body?: string;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  end(body?: string): void;
};

type SeasonalBaselineEntry = {
  steady: {
    aqi: number;
    traffic_delay_pct?: number;
  };
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

const MAPS_API_KEY = (process.env.Maps_Platform_API_Key || process.env.MAPS_PLATFORM_API_KEY || '').trim();
const SEASONAL_BASELINE_PATH = path.join(process.cwd(), 'public', 'data', 'seasonal-baseline.json');
const GOOGLE_REQUEST_TIMEOUT_MS = 8000;
const AQI_HEAVY_DELTA_PCT = 15;

let baselineCache: SeasonalBaselineMap | null = null;

function normalizeCityId(value: string): string {
  return value.trim().toLowerCase().replaceAll('_', '-');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readSeasonalBaselineMap(): SeasonalBaselineMap {
  if (baselineCache) return baselineCache;

  try {
    const raw = fs.readFileSync(SEASONAL_BASELINE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      baselineCache = {};
      return baselineCache;
    }

    const normalized: SeasonalBaselineMap = {};
    for (const [cityIdRaw, entryRaw] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entryRaw || typeof entryRaw !== 'object') continue;
      const entry = entryRaw as Record<string, unknown>;
      const steady = entry.steady;
      if (!steady || typeof steady !== 'object') continue;
      const steadyRecord = steady as Record<string, unknown>;
      const aqi = parseNumber(steadyRecord.aqi as number | string | undefined);
      if (aqi == null) continue;

      normalized[normalizeCityId(cityIdRaw)] = {
        steady: {
          aqi: Math.round(clamp(aqi, 1, 500)),
          traffic_delay_pct: parseNumber(steadyRecord.traffic_delay_pct as number | string | undefined) ?? undefined,
        },
        retention_rate: parseNumber(entry.retention_rate as number | string | undefined) ?? undefined,
        source_ref: typeof entry.source_ref === 'string' ? entry.source_ref : undefined,
      };
    }
    baselineCache = normalized;
    return baselineCache;
  } catch {
    baselineCache = {};
    return baselineCache;
  }
}

function getBaselineAqi(cityId: string): number {
  const map = readSeasonalBaselineMap();
  const entry = map[normalizeCityId(cityId)];
  return entry?.steady?.aqi ?? 70;
}

function getRetentionRate(cityId: string): number {
  const map = readSeasonalBaselineMap();
  const entry = map[normalizeCityId(cityId)];
  const rate = parseNumber(entry?.retention_rate);
  return clamp(rate ?? 0.8, 0, 1);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogleAirQuality(lat: number, lng: number): Promise<GoogleAirQualityResponse | null> {
  if (!MAPS_API_KEY) return null;

  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(MAPS_API_KEY)}`;
  const body = JSON.stringify({
    location: { latitude: lat, longitude: lng },
    extraComputations: ['HEALTH_RECOMMENDATIONS', 'LOCAL_AQI'],
    languageCode: 'en',
  });

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
      GOOGLE_REQUEST_TIMEOUT_MS
    );
    if (!response.ok) return null;
    return (await response.json()) as GoogleAirQualityResponse;
  } catch {
    return null;
  }
}

async function fetchGooglePollen(lat: number, lng: number): Promise<unknown> {
  if (!MAPS_API_KEY) return null;

  const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${encodeURIComponent(MAPS_API_KEY)}&location.latitude=${lat}&location.longitude=${lng}&days=1`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, GOOGLE_REQUEST_TIMEOUT_MS);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function buildSteadyResponse(cityId: string): GooglePulseApiResponse {
  const title = formatCityLabel(cityId);
  const retentionRate = getRetentionRate(cityId);
  const pct = Math.round(retentionRate * 100);
  const sourceRef = 'Ref: Google Air Quality + Pollen (Maps Platform) — Seasonal Baseline';

  return {
    title,
    context_id: `${cityId}-steady`,
    current_conditions: 'The district is breathing easy today with fresh, clear skies.',
    action: "It's a perfect day for a walk or bike ride to keep the neighborhood quiet and vibrant.",
    impact: 'Your choice helps preserve the peaceful charm of these historic blocks.',
    neighborhood_investment: `${pct}% Stays Local`,
    is_live: false,
    source_ref: sourceRef,
  };
}

function sendJson(res: VercelResponse, status: number, body: GooglePulseApiResponse | { error: string }): void {
  res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body: { lat?: number; lng?: number; cityId?: string } = {};
  try {
    if (req.body) body = JSON.parse(req.body) as typeof body;
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null;
  const lng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null;
  const cityIdRaw = typeof body.cityId === 'string' ? body.cityId.trim() : '';
  const cityId = normalizeCityId(cityIdRaw);

  if (!cityId) {
    sendJson(res, 400, { error: 'Missing or invalid cityId' });
    return;
  }

  if (lat == null || lng == null) {
    sendJson(res, 200, buildSteadyResponse(cityId));
    return;
  }

  const aqiBaseline = getBaselineAqi(cityId);
  const [airData] = await Promise.all([
    fetchGoogleAirQuality(lat, lng),
    fetchGooglePollen(lat, lng),
  ]);

  const title = formatCityLabel(cityId);
  const retentionRate = getRetentionRate(cityId);
  const pct = Math.round(retentionRate * 100);

  if (!airData?.indexes?.length) {
    sendJson(res, 200, buildSteadyResponse(cityId));
    return;
  }

  const uaqiEntry = airData.indexes.find((i) => i.code === 'uaqi');
  const liveAqi = uaqiEntry?.aqi != null ? Number(uaqiEntry.aqi) : null;

  const baselineThreshold = aqiBaseline * (1 + AQI_HEAVY_DELTA_PCT / 100);
  const isHeavy = liveAqi != null && liveAqi > baselineThreshold;

  const generalPopulation =
    (airData.healthRecommendations?.generalPopulation ?? '').trim() || null;

  const current_conditions = isHeavy && generalPopulation
    ? generalPopulation
    : 'The district is breathing easy today with fresh, clear skies.';

  const action = isHeavy
    ? 'Since the air is feeling heavy, using the local rail or metrobus keeps you in a filtered environment and gives the streets a break.'
    : "It's a perfect day for a walk or bike ride to keep the neighborhood quiet and vibrant.";

  const impact = isHeavy
    ? "By bypassing the gridlock, you're helping lower curbside emissions for the local shopkeepers."
    : 'Your choice helps preserve the peaceful charm of these historic blocks.';

  const response: GooglePulseApiResponse = {
    title,
    context_id: `${cityId}-${isHeavy ? 'heavy' : 'steady'}`,
    current_conditions,
    action,
    impact,
    neighborhood_investment: `${pct}% Stays Local`,
    is_live: true,
    source_ref: 'Ref: Google Air Quality + Pollen (Maps Platform)',
  };

  sendJson(res, 200, response);
}
