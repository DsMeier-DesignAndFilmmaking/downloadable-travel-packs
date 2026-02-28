import { formatCityLabel } from '@/utils/formatCityLabel';

type ApiCityVitalsResponse = {
  title: string;
  context_id: string;
  current_conditions: string;
  action: string;
  impact: string;
  neighborhood_investment: string;
  is_live: boolean;
  source_ref: string;
};

type SeasonalBaselineEntry = {
  steady: { aqi: number; traffic_delay_pct: number };
  retention_rate?: number;
  source_ref?: string;
};

type SeasonalBaselineMap = Record<string, SeasonalBaselineEntry>;

type StoredCityVitals = {
  cityId: string;
  report: CityVitalsReport;
  savedAt: number;
};

export type CityVitalsReport = {
  title: string;
  contextId: string;
  currentConditions: string;
  whatCanYouDo: string;
  howItHelps: string;
  neighborhoodInvestment: string;
  isLive: boolean;
  sourceRef: string;
};

export { formatCityLabel };

const GOOGLE_PULSE_ENDPOINT = '/api/vitals/google-pulse';
const SEASONAL_BASELINE_URL = '/data/seasonal-baseline.json';
// Increased timeout to accommodate Google API processing time
const API_REQUEST_TIMEOUT_MS = 5000; 


function getLocalStorageKey(cityId: string): string {
  return `city-vitals-cache-${cityId}`;
}

let seasonalBaselineCache: SeasonalBaselineMap | null = null;

function normalizeCityId(cityId: string): string {
  return cityId.trim().toLowerCase().replaceAll('_', '-');
}

function sanitizeText(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.replace(/\s+/g, ' ').trim() || fallback;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiCityVitalsResponse(value: unknown): value is ApiCityVitalsResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === 'string' &&
    typeof value.context_id === 'string' &&
    typeof value.current_conditions === 'string' &&
    typeof value.action === 'string' &&
    typeof value.impact === 'string' &&
    typeof value.neighborhood_investment === 'string' &&
    typeof value.is_live === 'boolean' &&
    typeof value.source_ref === 'string'
  );
}

function isCityVitalsReport(value: unknown): value is CityVitalsReport {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === 'string' &&
    typeof value.contextId === 'string' &&
    typeof value.currentConditions === 'string' &&
    typeof value.whatCanYouDo === 'string' &&
    typeof value.howItHelps === 'string' &&
    typeof value.neighborhoodInvestment === 'string' &&
    typeof value.isLive === 'boolean' &&
    typeof value.sourceRef === 'string'
  );
}

function readCityVitalsFromLocalStorage(cityId: string): CityVitalsReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(cityId));
    if (!raw) return null;
    
    // Cast the parsed JSON to our StoredCityVitals type
    const parsed = JSON.parse(raw) as StoredCityVitals;
    
    // You could even add logic here to expire the cache after 24 hours:
    // const IS_EXPIRED = Date.now() - parsed.savedAt > 86400000;
    // if (IS_EXPIRED) return null;

    return isCityVitalsReport(parsed.report) ? parsed.report : null;
  } catch {
    return null;
  }
}

function writeCityVitalsToLocalStorage(cityId: string, report: CityVitalsReport): void {
  if (typeof window === 'undefined') return;
  try {
    // Now using the StoredCityVitals type to structure the data
    const dataToSave: StoredCityVitals = {
      cityId,
      report,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(getLocalStorageKey(cityId), JSON.stringify(dataToSave));
  } catch (err) {
    console.error("Storage failed", err);
  }
}

function normalizeSeasonalBaselineMap(value: unknown): SeasonalBaselineMap | null {
  if (!isRecord(value)) return null;
  const normalized: SeasonalBaselineMap = {};
  for (const [cityIdRaw, baselineRaw] of Object.entries(value)) {
    if (!isRecord(baselineRaw)) continue;
    const steadyRaw = baselineRaw.steady;
    if (!isRecord(steadyRaw)) continue;
    const aqi = parseNumber(steadyRaw.aqi as number | string | undefined);
    const trafficDelayPct = parseNumber(steadyRaw.traffic_delay_pct as number | string | undefined);
    if (aqi == null || trafficDelayPct == null) continue;
    normalized[normalizeCityId(cityIdRaw)] = {
      steady: { aqi: Math.round(clamp(aqi, 1, 500)), traffic_delay_pct: clamp(trafficDelayPct, 0, 100) },
      retention_rate: parseNumber(baselineRaw.retention_rate as number | string | undefined) ?? undefined,
      source_ref: typeof baselineRaw.source_ref === 'string' ? baselineRaw.source_ref : undefined,
    };
  }
  return Object.keys(normalized).length ? normalized : null;
}

function mapApiPayloadToReport(payload: ApiCityVitalsResponse): CityVitalsReport {
  return {
    title: sanitizeText(payload.title, 'City Breath'),
    contextId: sanitizeText(payload.context_id, 'city-breath-steady'),
    currentConditions: sanitizeText(payload.current_conditions, 'The city is breathing easy right now.'),
    whatCanYouDo: sanitizeText(payload.action, 'Keep this leg walk-first to preserve low street pressure.'),
    howItHelps: sanitizeText(payload.impact, 'This helps keep local streets accessible.'),
    neighborhoodInvestment: sanitizeText(payload.neighborhood_investment, '80% Stays Local'),
    isLive: payload.is_live,
    sourceRef: sanitizeText(payload.source_ref, 'Ref: Google Air Quality + Pollen (Maps Platform)'),
  };
}

function buildSteadyBaselineReport(cityId: string, baseline?: SeasonalBaselineEntry): CityVitalsReport {
  const title = formatCityLabel(cityId);
  const retentionRate = clamp(parseNumber(baseline?.retention_rate) ?? 0.8, 0, 1);
  return {
    title,
    contextId: `${cityId}-steady`,
    currentConditions: 'The district is breathing easy today with fresh, clear skies.',
    whatCanYouDo: "It's a perfect day for a walk or bike ride to keep the neighborhood quiet.",
    howItHelps: 'Your choice helps preserve the peaceful charm of these historic blocks.',
    neighborhoodInvestment: `${Math.round(retentionRate * 100)}% Stays Local`,
    isLive: false,
    sourceRef: sanitizeText(baseline?.source_ref, 'Ref: Google Air Quality + Pollen — Seasonal Baseline'),
  };
}

async function loadSeasonalBaselines(): Promise<SeasonalBaselineMap | null> {
  if (seasonalBaselineCache) return seasonalBaselineCache;
  try {
    const response = await fetch(SEASONAL_BASELINE_URL, { method: 'GET', cache: 'force-cache' });
    if (!response.ok) return null;
    const payload = await response.json();
    const normalized = normalizeSeasonalBaselineMap(payload);
    if (!normalized) return null;
    seasonalBaselineCache = normalized;
    return seasonalBaselineCache;
  } catch {
    return null;
  }
}

async function getSeasonalBaselineEntry(cityId: string): Promise<SeasonalBaselineEntry | undefined> {
  const map = await loadSeasonalBaselines();
  return map ? map[cityId] : undefined;
}

async function fetchFromGooglePulseApi(cityId: string, lat: number, lng: number): Promise<CityVitalsReport> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GOOGLE_PULSE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, cityId }),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const payload = await response.json();
    if (!isApiCityVitalsResponse(payload)) throw new Error('Invalid API Shape');
    const report = mapApiPayloadToReport(payload);
    writeCityVitalsToLocalStorage(cityId, report);
    return report;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function primeSeasonalBaselineCache(): Promise<void> {
  await loadSeasonalBaselines();
}

export async function getSteadyBaselineCityVitals(cityIdRaw: string): Promise<CityVitalsReport> {
  const cityId = normalizeCityId(cityIdRaw);
  const baselineEntry = await getSeasonalBaselineEntry(cityId);
  return buildSteadyBaselineReport(cityId, baselineEntry);
}

export async function getCachedOrBaselineCityVitals(cityIdRaw: string): Promise<CityVitalsReport> {
  const cityId = normalizeCityId(cityIdRaw);
  return readCityVitalsFromLocalStorage(cityId) || getSteadyBaselineCityVitals(cityId);
}

export type FetchCityVitalsOptions = {
  coordinates?: { lat: number; lng: number };
};

export async function fetchCityVitals(cityIdRaw: string, options?: FetchCityVitalsOptions): Promise<CityVitalsReport> {
  const cityId = normalizeCityId(cityIdRaw);
  const coords = options?.coordinates;
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const fallback = await getSteadyBaselineCityVitals(cityId);

  if (isOffline || !coords) return fallback;

  try {
    return await fetchFromGooglePulseApi(cityId, coords.lat, coords.lng);
  } catch (err) {
    console.warn("Pulse API Failed, falling back to baseline", err);
    return fallback;
  }
}