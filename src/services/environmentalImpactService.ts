/**
 * environmentalImpactService.ts
 *
 * Client-side service for fetching, caching, and serving
 * Environmental Impact data for city guide pages.
 *
 * Cache strategy (SWR pattern — same as urbanDiagnosticService):
 *   1. Return localStorage snapshot immediately if present (instant UI)
 *   2. Fetch fresh live data in the background
 *   3. On success: update state + refresh localStorage
 *   4. On failure: keep stale snapshot (never blank the UI)
 */

const ENDPOINT = '/api/vitals/environmental-impact';
const CACHE_PREFIX = 'env-impact-cache-v1-';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — air quality is meaningful at this cadence
const TIMEOUT_MS = 7000;

// ─── Public types ─────────────────────────────────────────────────────────────

export type PollutantDisplay = {
  code: string;
  label: string;
  value: number;
  unit: string;
};

export type PollenBand = 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';

export type EnvironmentalImpactReport = {
  cityId: string;
  cityLabel: string;
  // Air
  aqiValue: number;
  aqiCategory: string;
  aqiTrend: 'improving' | 'stable' | 'worsening' | 'unknown';
  dominantPollutant: string;
  pollutants: PollutantDisplay[];
  googleHealthAdvice: string;
  // Pollen
  pollenTreeBand: PollenBand;
  pollenGrassBand: PollenBand;
  pollenWeedBand: PollenBand;
  highestPollenThreat: string;
  // Cultural pressure
  overtourismIndex: number;
  overtourismLabel: string;
  primaryStress: string;
  neighbourhoodRetentionPct: number;
  // Traveller guidance
  currentConditionsSummary: string;
  whatYouCanDo: string[];
  howItHelps: string;
  // Meta
  isLive: boolean;
  sourceRefs: string[];
  fetchedAt: string;
};

export type FetchEnvironmentalImpactOptions = {
  lat?: number;
  lng?: number;
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

type StoredReport = {
  report: EnvironmentalImpactReport;
  savedAt: number;
};

function cacheKey(cityId: string): string {
  return `${CACHE_PREFIX}${cityId.trim().toLowerCase()}`;
}

function readCache(cityId: string): EnvironmentalImpactReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(cityId));
    if (!raw) return null;
    const parsed: StoredReport = JSON.parse(raw);
    // Respect TTL so stale data doesn't persist indefinitely
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return isValidReport(parsed.report) ? parsed.report : null;
  } catch {
    return null;
  }
}

function writeCache(cityId: string, report: EnvironmentalImpactReport): void {
  if (typeof window === 'undefined') return;
  try {
    const stored: StoredReport = { report, savedAt: Date.now() };
    window.localStorage.setItem(cacheKey(cityId), JSON.stringify(stored));
  } catch {
    // localStorage quota exceeded — non-fatal, skip silently
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

function isValidReport(v: unknown): v is EnvironmentalImpactReport {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.cityId === 'string' &&
    typeof r.cityLabel === 'string' &&
    typeof r.aqiValue === 'number' &&
    typeof r.currentConditionsSummary === 'string' &&
    Array.isArray(r.whatYouCanDo) &&
    typeof r.howItHelps === 'string'
  );
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchFromApi(
  cityId: string,
  options?: FetchEnvironmentalImpactOptions,
): Promise<EnvironmentalImpactReport> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cityId,
        lat: options?.lat,
        lng: options?.lng,
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const payload = await res.json();
    if (!isValidReport(payload)) throw new Error('Invalid response shape');

    writeCache(cityId, payload);
    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a cached report instantly (if available), then fetches a fresh
 * one in the background. Call `onUpdate` to receive the live version.
 *
 * This is designed for use inside a useEffect — see useEnvironmentalImpact.ts
 */
export async function getEnvironmentalImpactReport(
  cityIdRaw: string,
  options?: FetchEnvironmentalImpactOptions,
): Promise<EnvironmentalImpactReport> {
  const cityId = cityIdRaw.trim().toLowerCase();
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  // Always prefer cache when offline
  if (isOffline) {
    const cached = readCache(cityId);
    if (cached) return cached;
    // Return a minimal offline placeholder
    return buildOfflinePlaceholder(cityId);
  }

  // Return live fetch (caller controls whether to also show stale first)
  return fetchFromApi(cityId, options);
}

/**
 * Synchronously returns the cached report for a city (no network call).
 * Used to pre-populate UI before the live fetch resolves.
 */
export function getCachedEnvironmentalReport(
  cityIdRaw: string,
): EnvironmentalImpactReport | null {
  return readCache(cityIdRaw.trim().toLowerCase());
}

// ─── Offline placeholder ──────────────────────────────────────────────────────

function formatCityLabel(cityId: string): string {
  const parts = cityId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  if (parts.length < 2) return parts.join(' ');
  const country = parts[parts.length - 1];
  const city = parts.slice(0, -1).join(' ');
  return `${city}, ${country}`;
}

function buildOfflinePlaceholder(cityId: string): EnvironmentalImpactReport {
  const label = formatCityLabel(cityId);

  return {
    cityId,
    cityLabel: label,
    aqiValue: 0,
    aqiCategory: 'Offline',
    aqiTrend: 'unknown',
    dominantPollutant: '',
    pollutants: [],
    googleHealthAdvice: '',
    pollenTreeBand: 'None',
    pollenGrassBand: 'None',
    pollenWeedBand: 'None',
    highestPollenThreat: 'No data',
    overtourismIndex: 0,
    overtourismLabel: 'Unknown',
    primaryStress: 'unknown',
    neighbourhoodRetentionPct: 0,
    currentConditionsSummary:
      'Environmental data unavailable offline. Connect to the internet to load live conditions.',
    whatYouCanDo: [
      'Use public transport wherever available.',
      'Support locally owned restaurants and accommodation.',
      'Visit major attractions during off-peak hours.',
    ],
    howItHelps:
      'Your choices as a traveller directly affect the communities and environment you visit. Even small changes — transit over taxi, local over chain — compound across thousands of visitors into measurable positive impact.',
    isLive: false,
    sourceRefs: ['Offline — cached data unavailable'],
    fetchedAt: new Date().toISOString(),
  };
}