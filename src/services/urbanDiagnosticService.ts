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
  steady: {
    aqi: number;
    traffic_delay_pct: number;
  };
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

const CITY_VITALS_API_ENDPOINT = '/api/city-vitals';
const SEASONAL_BASELINE_URL = '/data/seasonal-baseline.json';
const API_REQUEST_TIMEOUT_MS = 2000;
const IDB_NAME = 'city-vitals-cache-db';
const IDB_STORE = 'reports';
const IDB_VERSION = 1;

let seasonalBaselineCache: SeasonalBaselineMap | null = null;

function normalizeCityId(cityId: string): string {
  return cityId.trim().toLowerCase().replaceAll('_', '-');
}

function sanitizeText(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : fallback;
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
      steady: {
        aqi: Math.round(clamp(aqi, 1, 500)),
        traffic_delay_pct: clamp(trafficDelayPct, 0, 100),
      },
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
    currentConditions: sanitizeText(
      payload.current_conditions,
      'The city is breathing easy right now, with movement close to its seasonal rhythm.',
    ),
    whatCanYouDo: sanitizeText(
      payload.action,
      'Because conditions are steady, keep this leg walk-first to preserve low street pressure.',
    ),
    howItHelps: sanitizeText(
      payload.impact,
      'This helps keep local streets accessible for families and neighborhood businesses.',
    ),
    neighborhoodInvestment: sanitizeText(payload.neighborhood_investment, '80% Stays Local'),
    isLive: payload.is_live,
    sourceRef: sanitizeText(payload.source_ref, 'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)'),
  };
}

function buildSteadyBaselineReport(cityId: string, baseline?: SeasonalBaselineEntry): CityVitalsReport {
  const title = formatCityLabel(cityId);
  const retentionRate = clamp(parseNumber(baseline?.retention_rate) ?? 0.8, 0, 1);
  const neighborhoodInvestment = `${Math.round(retentionRate * 100)}% Stays Local`;

  return {
    title,
    contextId: `${cityId}-steady`,
    currentConditions: `The city is breathing easy in ${title}, and street flow feels close to its seasonal rhythm.`,
    whatCanYouDo:
      'Because conditions are steady, keep this leg walk-first and use transit for longer hops to preserve the lighter rhythm.',
    howItHelps:
      'This keeps streets calm and accessible for the families and neighborhood businesses who rely on them every day.',
    neighborhoodInvestment,
    isLive: false,
    sourceRef: sanitizeText(
      baseline?.source_ref,
      'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)',
    ),
  };
}

async function loadSeasonalBaselines(): Promise<SeasonalBaselineMap | null> {
  if (seasonalBaselineCache) return seasonalBaselineCache;

  try {
    const response = await fetch(SEASONAL_BASELINE_URL, { method: 'GET', cache: 'force-cache' });
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
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
  if (!map) return undefined;
  return map[cityId];
}

function openCityVitalsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'cityId' });
      }
    };
  });
}

async function readCityVitalsFromIDB(cityId: string): Promise<CityVitalsReport | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openCityVitalsDB();
    return await new Promise<CityVitalsReport | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.get(cityId);

      request.onerror = () => {
        db.close();
        reject(request.error);
      };

      request.onsuccess = () => {
        const record = request.result as StoredCityVitals | undefined;
        db.close();
        resolve(record?.report ?? null);
      };
    });
  } catch {
    return null;
  }
}

async function writeCityVitalsToIDB(cityId: string, report: CityVitalsReport): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await openCityVitalsDB();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const row: StoredCityVitals = {
        cityId,
        report,
        savedAt: Date.now(),
      };

      const request = store.put(row);
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Best-effort cache only.
  }
}

async function fetchFromCityVitalsApi(cityId: string): Promise<CityVitalsReport> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    const endpoint = `${CITY_VITALS_API_ENDPOINT}?cityId=${encodeURIComponent(cityId)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CityVitals API failed (${response.status})`);
    }

    const payload = (await response.json()) as unknown;
    if (!isApiCityVitalsResponse(payload)) {
      throw new Error('CityVitals API returned invalid shape');
    }

    const report = mapApiPayloadToReport(payload);
    await writeCityVitalsToIDB(cityId, report);
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

  const cached = await readCityVitalsFromIDB(cityId);
  if (cached) return cached;

  return getSteadyBaselineCityVitals(cityId);
}

export async function fetchCityVitals(cityIdRaw: string): Promise<CityVitalsReport> {
  const cityId = normalizeCityId(cityIdRaw);

  try {
    return await fetchFromCityVitalsApi(cityId);
  } catch {
    const fallback = await getSteadyBaselineCityVitals(cityId);
    await writeCityVitalsToIDB(cityId, fallback);
    return fallback;
  }
}
