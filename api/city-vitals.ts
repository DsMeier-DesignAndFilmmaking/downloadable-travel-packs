import fs from 'node:fs';
import path from 'node:path';

import { formatCityLabel } from '../src/utils/formatCityLabel';

type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  end(body?: string): void;
};

type LiveCityConfig = {
  waqiFeed: string;
  tomTomPoint: { lat: number; lng: number };
  retentionRate: number;
  /** e.g. "the metro", "the train" — used in heavy-state action narrative */
  primary_transit: string;
};

type SeasonalBaselineEntry = {
  steady: {
    aqi: number;
    traffic_delay_pct: number;
  };
  retention_rate?: number;
  source_ref?: string;
};

type SeasonalBaselineMap = Record<string, SeasonalBaselineEntry>;

type CityVitalsApiResponse = {
  title: string;
  context_id: string;
  current_conditions: string;
  action: string;
  impact: string;
  neighborhood_investment: string;
  is_live: boolean;
  source_ref: string;
};

type WaqiResponse = {
  status?: string;
  data?: {
    aqi?: number | string;
  };
};

type TomTomResponse = {
  flowSegmentData?: {
    currentTravelTime?: number;
    freeFlowTravelTime?: number;
  };
};

type VitalState = 'steady' | 'heavy';

const WAQI_TOKEN = (process.env.WAQI_TOKEN || process.env.VITE_WAQI_TOKEN || '').trim();
const TOMTOM_API_KEY = (process.env.TOMTOM_API_KEY || process.env.VITE_TOMTOM_API_KEY || '').trim();
const LIVE_TIMEOUT_MS = 1000;
const AQI_HEAVY_DELTA = 15;
/** Traffic Speed < FreeFlow * 0.8 => delay > 25% */
const TRAFFIC_HEAVY_DELAY_PCT = 25;
const SEASONAL_BASELINE_PATH = path.join(process.cwd(), 'public', 'data', 'seasonal-baseline.json');

const CITY_LIVE_CONFIG: Record<string, LiveCityConfig> = {
  'bangkok-thailand': {
    waqiFeed: 'bangkok',
    tomTomPoint: { lat: 13.7563, lng: 100.5018 },
    retentionRate: 0.79,
    primary_transit: 'the BTS or MRT',
  },
  'paris-france': {
    waqiFeed: 'paris',
    tomTomPoint: { lat: 48.8566, lng: 2.3522 },
    retentionRate: 0.84,
    primary_transit: 'the metro',
  },
  'london-uk': {
    waqiFeed: 'london',
    tomTomPoint: { lat: 51.5072, lng: -0.1276 },
    retentionRate: 0.82,
    primary_transit: 'the Tube or bus',
  },
  'tokyo-japan': {
    waqiFeed: 'tokyo',
    tomTomPoint: { lat: 35.6762, lng: 139.6503 },
    retentionRate: 0.86,
    primary_transit: 'the train or metro',
  },
  'new-york-us': {
    waqiFeed: 'new-york',
    tomTomPoint: { lat: 40.7128, lng: -74.006 },
    retentionRate: 0.74,
    primary_transit: 'the subway',
  },
  'rome-italy': {
    waqiFeed: 'rome',
    tomTomPoint: { lat: 41.9028, lng: 12.4964 },
    retentionRate: 0.78,
    primary_transit: 'the metro',
  },
  'barcelona-spain': {
    waqiFeed: 'barcelona',
    tomTomPoint: { lat: 41.3874, lng: 2.1686 },
    retentionRate: 0.81,
    primary_transit: 'the metro or tram',
  },
  'dubai-uae': {
    waqiFeed: 'dubai',
    tomTomPoint: { lat: 25.2048, lng: 55.2708 },
    retentionRate: 0.72,
    primary_transit: 'the metro',
  },
  'seoul-south-korea': {
    waqiFeed: 'seoul',
    tomTomPoint: { lat: 37.5665, lng: 126.978 },
    retentionRate: 0.83,
    primary_transit: 'the metro',
  },
  'mexico-city-mexico': {
    waqiFeed: 'mexico-city',
    tomTomPoint: { lat: 19.4326, lng: -99.1332 },
    retentionRate: 0.82,
    primary_transit: 'the Metro',
  },
};

const DEFAULT_CITY_CONFIG: LiveCityConfig = {
  waqiFeed: 'paris',
  tomTomPoint: { lat: 48.8566, lng: 2.3522 },
  retentionRate: 0.8,
  primary_transit: 'the metro',
};

const DEFAULT_BASELINE_ENTRY: SeasonalBaselineEntry = {
  steady: {
    aqi: 70,
    traffic_delay_pct: 45,
  },
  retention_rate: 0.8,
  source_ref: 'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)',
};

let baselineCache: SeasonalBaselineMap | null = null;

function normalizeCityId(value: string): string {
  return value.trim().toLowerCase().replaceAll('_', '-');
}

function getQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toPercent(retentionRate: number): number {
  return Math.round(clamp(retentionRate, 0, 1) * 100);
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
      const entryRecord = entryRaw as Record<string, unknown>;
      const steady = entryRecord.steady;
      if (!steady || typeof steady !== 'object') continue;
      const steadyRecord = steady as Record<string, unknown>;

      const aqi = parseNumber(steadyRecord.aqi as number | string | undefined);
      const trafficDelayPct = parseNumber(steadyRecord.traffic_delay_pct as number | string | undefined);
      if (aqi == null || trafficDelayPct == null) continue;

      normalized[normalizeCityId(cityIdRaw)] = {
        steady: {
          aqi: Math.round(clamp(aqi, 1, 500)),
          traffic_delay_pct: clamp(trafficDelayPct, 0, 100),
        },
        retention_rate: parseNumber(entryRecord.retention_rate as number | string | undefined) ?? undefined,
        source_ref: typeof entryRecord.source_ref === 'string' ? entryRecord.source_ref : undefined,
      };
    }

    baselineCache = normalized;
    return baselineCache;
  } catch {
    baselineCache = {};
    return baselineCache;
  }
}

function resolveBaselineEntry(cityId: string): SeasonalBaselineEntry {
  const map = readSeasonalBaselineMap();
  return map[cityId] ?? DEFAULT_BASELINE_ENTRY;
}

function resolveLiveConfig(cityId: string): LiveCityConfig {
  return CITY_LIVE_CONFIG[cityId] ?? DEFAULT_CITY_CONFIG;
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

async function fetchLiveAqi(waqiFeed: string): Promise<number | null> {
  if (!WAQI_TOKEN) return null;

  const url = `https://api.waqi.info/feed/${encodeURIComponent(waqiFeed)}/?token=${encodeURIComponent(WAQI_TOKEN)}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, LIVE_TIMEOUT_MS);
    if (!response.ok) return null;

    const payload = (await response.json()) as WaqiResponse;
    if (payload.status !== 'ok') return null;

    const aqi = parseNumber(payload.data?.aqi);
    if (aqi == null) return null;

    return Math.round(clamp(aqi, 1, 500));
  } catch {
    return null;
  }
}

async function fetchLiveTrafficDelay(point: { lat: number; lng: number }): Promise<number | null> {
  if (!TOMTOM_API_KEY) return null;

  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${point.lat},${point.lng}&unit=KMPH&openLr=false&key=${encodeURIComponent(TOMTOM_API_KEY)}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, LIVE_TIMEOUT_MS);
    if (!response.ok) return null;

    const payload = (await response.json()) as TomTomResponse;
    const currentTravelTime = payload.flowSegmentData?.currentTravelTime;
    const freeFlowTravelTime = payload.flowSegmentData?.freeFlowTravelTime;

    if (typeof currentTravelTime !== 'number' || typeof freeFlowTravelTime !== 'number' || freeFlowTravelTime <= 0) {
      return null;
    }

    const delay = ((currentTravelTime - freeFlowTravelTime) / freeFlowTravelTime) * 100;
    return clamp(Number.parseFloat(delay.toFixed(1)), 0, 500);
  } catch {
    return null;
  }
}

type VitalState = 'steady' | 'heavy';

function isHeavyState(
  liveAqi: number | null,
  liveTrafficDelayPct: number | null,
  baselineAqi: number,
): boolean {
  const aqiHeavy = liveAqi != null && liveAqi > baselineAqi + AQI_HEAVY_DELTA;
  const trafficHeavy =
    liveTrafficDelayPct != null && liveTrafficDelayPct > TRAFFIC_HEAVY_DELAY_PCT;
  return aqiHeavy || trafficHeavy;
}

function buildResponse(
  cityId: string,
  baselineEntry: SeasonalBaselineEntry,
  liveConfig: LiveCityConfig,
  isLive: boolean,
  state: VitalState,
  sourceRef: string,
): CityVitalsApiResponse {
  const cityTitle = formatCityLabel(cityId);
  const retentionRate = clamp(
    parseNumber(baselineEntry.retention_rate) ?? liveConfig.retentionRate,
    0,
    1,
  );

  const current_conditions =
    state === 'heavy'
      ? 'The air feels a bit heavy today; the city is working harder to breathe.'
      : `${cityTitle} is breathing easy this morning with clear skies.`;

  const action =
    state === 'heavy'
      ? `Since the roads are feeling the squeeze, taking ${liveConfig.primary_transit} gives the streets a much-needed break.`
      : "It's a perfect day to walk or bike; it keeps the neighborhood quiet and vibrant.";

  const impact =
    state === 'heavy'
      ? "By bypassing the gridlock, you're helping lower curbside emissions for the local shopkeepers."
      : 'Your choice helps preserve the peaceful charm of these historic blocks.';

  return {
    title: cityTitle,
    context_id: `${cityId}-${state}`,
    current_conditions,
    action,
    impact,
    neighborhood_investment: `${toPercent(retentionRate)}% Stays Local`,
    is_live: isLive,
    source_ref: sourceRef,
  };
}

function sendJson(res: VercelResponse, status: number, body: CityVitalsApiResponse | { error: string }): void {
  res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const cityIdRaw = getQueryValue(req.query.cityId || req.query.city_id);
  const cityId = normalizeCityId(cityIdRaw);

  if (!cityId) {
    sendJson(res, 400, { error: 'Missing cityId query parameter' });
    return;
  }

  const baselineEntry = resolveBaselineEntry(cityId);
  const liveConfig = resolveLiveConfig(cityId);
  const baselineAqi = baselineEntry.steady.aqi;

  const [liveAqi, liveTrafficDelay] = await Promise.all([
    fetchLiveAqi(liveConfig.waqiFeed),
    fetchLiveTrafficDelay(liveConfig.tomTomPoint),
  ]);

  const hasLiveData = liveAqi != null || liveTrafficDelay != null;
  const state: VitalState =
    hasLiveData && isHeavyState(liveAqi, liveTrafficDelay, baselineAqi) ? 'heavy' : 'steady';

  const sourceRef =
    hasLiveData && (liveAqi != null || liveTrafficDelay != null)
      ? 'Ref: WAQI + TomTom + GDS-Index 2026'
      : baselineEntry.source_ref || 'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)';

  const response = buildResponse(cityId, baselineEntry, liveConfig, hasLiveData, state, sourceRef);
  sendJson(res, 200, response);
}
