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

type PressureSignal = 'air' | 'traffic' | 'combined' | 'balanced';

const WAQI_TOKEN = process.env.WAQI_TOKEN || process.env.VITE_WAQI_TOKEN || '';
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || process.env.VITE_TOMTOM_API_KEY || '';
const LIVE_TIMEOUT_MS = 800;
const SEASONAL_BASELINE_PATH = path.join(process.cwd(), 'public', 'data', 'seasonal-baseline.json');

const CITY_LIVE_CONFIG: Record<string, LiveCityConfig> = {
  'bangkok-thailand': {
    waqiFeed: 'bangkok',
    tomTomPoint: { lat: 13.7563, lng: 100.5018 },
    retentionRate: 0.79,
  },
  'paris-france': {
    waqiFeed: 'paris',
    tomTomPoint: { lat: 48.8566, lng: 2.3522 },
    retentionRate: 0.84,
  },
  'london-uk': {
    waqiFeed: 'london',
    tomTomPoint: { lat: 51.5072, lng: -0.1276 },
    retentionRate: 0.82,
  },
  'tokyo-japan': {
    waqiFeed: 'tokyo',
    tomTomPoint: { lat: 35.6762, lng: 139.6503 },
    retentionRate: 0.86,
  },
  'new-york-us': {
    waqiFeed: 'new-york',
    tomTomPoint: { lat: 40.7128, lng: -74.006 },
    retentionRate: 0.74,
  },
  'rome-italy': {
    waqiFeed: 'rome',
    tomTomPoint: { lat: 41.9028, lng: 12.4964 },
    retentionRate: 0.78,
  },
  'barcelona-spain': {
    waqiFeed: 'barcelona',
    tomTomPoint: { lat: 41.3874, lng: 2.1686 },
    retentionRate: 0.81,
  },
  'dubai-uae': {
    waqiFeed: 'dubai',
    tomTomPoint: { lat: 25.2048, lng: 55.2708 },
    retentionRate: 0.72,
  },
  'seoul-south-korea': {
    waqiFeed: 'seoul',
    tomTomPoint: { lat: 37.5665, lng: 126.978 },
    retentionRate: 0.83,
  },
  'mexico-city-mexico': {
    waqiFeed: 'mexico-city',
    tomTomPoint: { lat: 19.4326, lng: -99.1332 },
    retentionRate: 0.82,
  },
};

const DEFAULT_CITY_CONFIG: LiveCityConfig = {
  waqiFeed: 'paris',
  tomTomPoint: { lat: 48.8566, lng: 2.3522 },
  retentionRate: 0.8,
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

function computeRelativeDeltaPercent(liveValue: number, baselineValue: number): number {
  if (!Number.isFinite(liveValue) || !Number.isFinite(baselineValue) || baselineValue <= 0) return 0;
  return ((liveValue - baselineValue) / baselineValue) * 100;
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

function resolvePressureSignal(
  state: VitalState,
  aqiDelta: number,
  trafficDelta: number,
): PressureSignal {
  if (state === 'steady') return 'balanced';

  const airHeavy = aqiDelta > 15;
  const trafficHeavy = trafficDelta > 15;

  if (airHeavy && trafficHeavy) return 'combined';
  if (airHeavy) return 'air';
  if (trafficHeavy) return 'traffic';
  return 'balanced';
}

function buildConditionNarrative(cityTitle: string, state: VitalState, signal: PressureSignal): string {
  if (state === 'steady') {
    return `The city is breathing easy in ${cityTitle}, and street flow feels close to its seasonal rhythm.`;
  }

  if (signal === 'combined') {
    return `The air feels heavy in ${cityTitle}, and the streets are carrying more pressure than usual.`;
  }

  if (signal === 'air') {
    return `The air feels heavier than usual in ${cityTitle}, and the city is working harder to breathe.`;
  }

  if (signal === 'traffic') {
    return `The streets feel denser than usual in ${cityTitle}, with road lanes under extra pressure.`;
  }

  return `City pressure feels elevated in ${cityTitle}, with both movement and air carrying extra load.`;
}

function buildActionNarrative(state: VitalState, signal: PressureSignal): string {
  if (state === 'steady') {
    return 'Because conditions are steady, keep this leg walk-first and use transit for longer hops to preserve the lighter rhythm.';
  }

  if (signal === 'combined') {
    return 'Because both air and traffic feel heavy, choose rail-first routes with short walks to give the streets immediate relief.';
  }

  if (signal === 'air') {
    return 'Because the air feels heavy, choose rail or bike-share for this segment to give the city a quick breathing break.';
  }

  if (signal === 'traffic') {
    return 'Because street pressure is high, bypass gridlock on transit or bike lanes to give the streets immediate relief.';
  }

  return 'Because conditions feel heavy, choose transit-first movement to reduce road pressure quickly.';
}

function buildImpactNarrative(state: VitalState): string {
  if (state === 'steady') {
    return 'This keeps streets calm and accessible for the families and neighborhood businesses who rely on them every day.';
  }

  return 'This keeps key corridors clearer for the families, artisans, and local workers who live and move through this district.';
}

function buildResponse(
  cityId: string,
  baselineEntry: SeasonalBaselineEntry,
  isLive: boolean,
  aqiValue: number,
  trafficDelayPct: number,
  sourceRef: string,
): CityVitalsApiResponse {
  const cityTitle = formatCityLabel(cityId);
  const baselineAqi = baselineEntry.steady.aqi;
  const baselineTraffic = baselineEntry.steady.traffic_delay_pct;

  const aqiDelta = computeRelativeDeltaPercent(aqiValue, baselineAqi);
  const trafficDelta = computeRelativeDeltaPercent(trafficDelayPct, baselineTraffic);

  const state: VitalState = aqiDelta > 15 || trafficDelta > 15 ? 'heavy' : 'steady';
  const signal = resolvePressureSignal(state, aqiDelta, trafficDelta);

  const retentionRate = clamp(
    parseNumber(baselineEntry.retention_rate) ?? resolveLiveConfig(cityId).retentionRate,
    0,
    1,
  );

  return {
    title: cityTitle,
    context_id: `${cityId}-${state}`,
    current_conditions: buildConditionNarrative(cityTitle, state, signal),
    action: buildActionNarrative(state, signal),
    impact: buildImpactNarrative(state),
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

  const [liveAqi, liveTrafficDelay] = await Promise.all([
    fetchLiveAqi(liveConfig.waqiFeed),
    fetchLiveTrafficDelay(liveConfig.tomTomPoint),
  ]);

  const hasLiveData = liveAqi != null && liveTrafficDelay != null;

  if (!hasLiveData) {
    const baselineResponse = buildResponse(
      cityId,
      baselineEntry,
      false,
      baselineEntry.steady.aqi,
      baselineEntry.steady.traffic_delay_pct,
      baselineEntry.source_ref || 'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)',
    );
    sendJson(res, 200, baselineResponse);
    return;
  }

  const liveResponse = buildResponse(
    cityId,
    baselineEntry,
    true,
    liveAqi,
    liveTrafficDelay,
    'Ref: WAQI + TomTom + GDS-Index 2026',
  );

  sendJson(res, 200, liveResponse);
}
