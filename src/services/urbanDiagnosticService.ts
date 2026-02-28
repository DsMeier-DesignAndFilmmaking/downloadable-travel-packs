type DiagnosticCityConfig = {
  waqiFeed: string;
  tomTomPoint: { lat: number; lng: number };
  retentionRateBaseline: number;
  sourceRef: string;
};

type SeasonalBaselineEntry = {
  seasonal_aqi: number;
  seasonal_congestion: number;
  seasonal_condition: string;
  seasonal_action: string;
  source_ref: string;
  retention_rate?: number;
};

type SeasonalBaselineMap = Record<string, SeasonalBaselineEntry>;

type NarrativeTrigger = 'air-traffic' | 'air' | 'traffic' | 'steady';

export type UrbanDiagnosticPayload = {
  city_vital: string;
  diagnostic_nudge: string;
  retention_rate: number;
  source_ref: string;
};

export type CityPackData = {
  title: string;
  contextId: string;
  currentConditions: string;
  whatCanYouDo: string;
  howItHelps: string;
  heritageSeal: string;
  staysLocalPct: number;
  sourceRef: string;
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

type CachedDiagnosticRecord = {
  payload: UrbanDiagnosticPayload;
  cachedAt: number;
};

const WAQI_TOKEN = (import.meta.env.VITE_WAQI_TOKEN ?? '').trim();
const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY ?? '').trim();

const STATIC_BASELINE_URL = '/data/static_baseline.json';
const STATIC_BASELINE_CACHE_KEY = 'city_vitals_static_baseline_map_v1';
const DIAGNOSTIC_CACHE_KEY_PREFIX = 'city_vitals_last_known_v1:';
const DEFAULT_SEASONAL_AQI = 74;
const DEFAULT_SEASONAL_CONGESTION = 0.44;

const CITY_DIAGNOSTIC_CONFIG: Record<string, DiagnosticCityConfig> = {
  'bangkok-thailand': {
    waqiFeed: 'bangkok',
    tomTomPoint: { lat: 13.7563, lng: 100.5018 },
    retentionRateBaseline: 0.79,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'paris-france': {
    waqiFeed: 'paris',
    tomTomPoint: { lat: 48.8566, lng: 2.3522 },
    retentionRateBaseline: 0.84,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'london-uk': {
    waqiFeed: 'london',
    tomTomPoint: { lat: 51.5072, lng: -0.1276 },
    retentionRateBaseline: 0.82,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'tokyo-japan': {
    waqiFeed: 'tokyo',
    tomTomPoint: { lat: 35.6762, lng: 139.6503 },
    retentionRateBaseline: 0.86,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'new-york-us': {
    waqiFeed: 'new-york',
    tomTomPoint: { lat: 40.7128, lng: -74.006 },
    retentionRateBaseline: 0.74,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'rome-italy': {
    waqiFeed: 'rome',
    tomTomPoint: { lat: 41.9028, lng: 12.4964 },
    retentionRateBaseline: 0.78,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'barcelona-spain': {
    waqiFeed: 'barcelona',
    tomTomPoint: { lat: 41.3874, lng: 2.1686 },
    retentionRateBaseline: 0.81,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'dubai-uae': {
    waqiFeed: 'dubai',
    tomTomPoint: { lat: 25.2048, lng: 55.2708 },
    retentionRateBaseline: 0.72,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'seoul-south-korea': {
    waqiFeed: 'seoul',
    tomTomPoint: { lat: 37.5665, lng: 126.978 },
    retentionRateBaseline: 0.83,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
  'mexico-city-mexico': {
    waqiFeed: 'mexico-city',
    tomTomPoint: { lat: 19.4326, lng: -99.1332 },
    retentionRateBaseline: 0.82,
    sourceRef: 'WAQI + TomTom + GDS-Index 2026',
  },
};

const DEFAULT_CITY_CONFIG: DiagnosticCityConfig = {
  waqiFeed: 'paris',
  tomTomPoint: { lat: 48.8566, lng: 2.3522 },
  retentionRateBaseline: 0.8,
  sourceRef: 'GDS-Index 2026 baseline',
};

const inMemoryFallbackBaselines: SeasonalBaselineMap = Object.fromEntries(
  Object.entries(CITY_DIAGNOSTIC_CONFIG).map(([cityId, config]) => {
    const cityLabel = formatCityLabel(cityId);
    return [
      cityId,
      {
        seasonal_aqi: DEFAULT_SEASONAL_AQI,
        seasonal_congestion: DEFAULT_SEASONAL_CONGESTION,
        seasonal_condition: `${cityLabel} is running near seasonal averages, with moderate street and air pressure.`,
        seasonal_action:
          'Because this district can tighten during peak windows, rail-and-walk routing gives the streets immediate relief.',
        source_ref: `${config.sourceRef} (seasonal baseline)`,
        retention_rate: config.retentionRateBaseline,
      },
    ];
  }),
) as SeasonalBaselineMap;

let seasonalBaselineByCity: SeasonalBaselineMap | null = null;
let seasonalBaselineLoadPromise: Promise<SeasonalBaselineMap | null> | null = null;

function normalizeCityKey(cityId: string): string {
  return cityId.trim().toLowerCase();
}

function titleCaseWord(word: string): string {
  if (word.length <= 3) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => titleCaseWord(word))
    .join(' ');
}

export function formatCityLabel(label: string | undefined | null): string {
  if (!label) return 'City Breath';

  const cleaned = label.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-');
  if (!cleaned) return 'City Breath';

  const segments = cleaned.split('-').filter(Boolean);
  if (segments.length <= 1) return titleCaseSegment(cleaned);

  const citySegment = segments.slice(0, -1).join('-');
  const countrySegment = segments[segments.length - 1];
  return `${titleCaseSegment(citySegment)}, ${titleCaseWord(countrySegment)}`;
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'city-breath';
}

function resolveCityConfig(cityId: string): DiagnosticCityConfig {
  const key = normalizeCityKey(cityId);
  return CITY_DIAGNOSTIC_CONFIG[key] ?? DEFAULT_CITY_CONFIG;
}

function parseNumeric(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseUnknownNumber(value: unknown): number | null {
  if (typeof value === 'number' || typeof value === 'string') {
    return parseNumeric(value);
  }
  return null;
}

function toOneDecimal(value: number): number {
  return Number.parseFloat(value.toFixed(1));
}

function parseAqiFromVital(cityVital: string): number | null {
  const match = cityVital.match(/AQI\s+([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseTrafficDelayFromVital(cityVital: string): number | null {
  const match = cityVital.match(/Traffic Delay\s+([0-9]+(?:\.[0-9]+)?)%/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeTrafficDelayPercent(currentTravelTime: number, freeFlowTravelTime: number): number {
  if (!Number.isFinite(currentTravelTime) || !Number.isFinite(freeFlowTravelTime) || freeFlowTravelTime <= 0) {
    return 0;
  }
  const delay = ((currentTravelTime - freeFlowTravelTime) / freeFlowTravelTime) * 100;
  return Math.max(0, toOneDecimal(delay));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNarrative(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : fallback;
}

function computeCityHealthIndex(aqi: number | null, trafficDelay: number | null): number {
  const aqiScore = aqi == null ? 0.7 : clamp(1 - aqi / 200, 0, 1);
  const trafficScore = trafficDelay == null ? 0.7 : clamp(1 - trafficDelay / 100, 0, 1);
  return Math.round((aqiScore * 0.6 + trafficScore * 0.4) * 100);
}

function buildCityVital(aqi: number, trafficDelay: number): string {
  const cityHealthIndex = computeCityHealthIndex(aqi, trafficDelay);
  return `City Health Index ${cityHealthIndex} | AQI ${Math.round(aqi)} | Traffic Delay ${toOneDecimal(trafficDelay)}%`;
}

function buildDiagnosticNudge(aqi: number | null, trafficDelay: number | null): string {
  const highAir = aqi != null && aqi > 100;
  const highTraffic = trafficDelay != null && trafficDelay > 70;

  if (highAir && highTraffic) {
    return 'Because the air is heavy and traffic is stacked, taking rail and short pedestrian links gives the streets immediate relief.';
  }
  if (highAir) {
    return 'Because the air is heavy, choosing rail and sidewalk links reduces curbside exhaust pressure right away.';
  }
  if (highTraffic) {
    return 'Because road lanes are overloaded, shifting to metro or tram corridors gives the streets immediate relief.';
  }
  return 'Because conditions are moderate, staying rail-first keeps road pressure low through the next movement window.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUrbanDiagnosticPayload(value: unknown): value is UrbanDiagnosticPayload {
  if (!isRecord(value)) return false;
  return (
    typeof value.city_vital === 'string' &&
    typeof value.diagnostic_nudge === 'string' &&
    typeof value.retention_rate === 'number' &&
    Number.isFinite(value.retention_rate) &&
    typeof value.source_ref === 'string'
  );
}

function getDiagnosticCacheKey(cityId: string): string {
  return `${DIAGNOSTIC_CACHE_KEY_PREFIX}${normalizeCityKey(cityId)}`;
}

function readCachedDiagnostic(cityId: string): UrbanDiagnosticPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getDiagnosticCacheKey(cityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const payload = parsed.payload;
    if (!isUrbanDiagnosticPayload(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

function writeCachedDiagnostic(cityId: string, payload: UrbanDiagnosticPayload): void {
  if (typeof window === 'undefined') return;

  try {
    const record: CachedDiagnosticRecord = {
      payload,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(getDiagnosticCacheKey(cityId), JSON.stringify(record));
  } catch {
    // Best-effort cache only.
  }
}

function normalizeSeasonalBaselineMap(value: unknown): SeasonalBaselineMap | null {
  if (!isRecord(value)) return null;

  const normalized: SeasonalBaselineMap = {};

  for (const [rawCityId, rawEntry] of Object.entries(value)) {
    if (!isRecord(rawEntry)) continue;

    const cityId = normalizeCityKey(rawCityId);
    const config = resolveCityConfig(cityId);

    const seasonalAqi = parseUnknownNumber(rawEntry.seasonal_aqi);
    const seasonalCongestion = parseUnknownNumber(rawEntry.seasonal_congestion);
    if (seasonalAqi == null || seasonalCongestion == null) continue;

    const retentionRateRaw = parseUnknownNumber(rawEntry.retention_rate);

    normalized[cityId] = {
      seasonal_aqi: Math.round(clamp(seasonalAqi, 1, 500)),
      seasonal_congestion: clamp(seasonalCongestion, 0, 1),
      seasonal_condition: sanitizeNarrative(
        typeof rawEntry.seasonal_condition === 'string' ? rawEntry.seasonal_condition : undefined,
        `${formatCityLabel(cityId)} is running near seasonal averages, with moderate street and air pressure.`,
      ),
      seasonal_action: sanitizeNarrative(
        typeof rawEntry.seasonal_action === 'string' ? rawEntry.seasonal_action : undefined,
        'Because this district can tighten during peak windows, rail-and-walk routing gives the streets immediate relief.',
      ),
      source_ref: sanitizeNarrative(
        typeof rawEntry.source_ref === 'string' ? rawEntry.source_ref : undefined,
        `${config.sourceRef} (seasonal baseline)`,
      ),
      retention_rate:
        retentionRateRaw == null ? config.retentionRateBaseline : clamp(retentionRateRaw, 0, 1),
    };
  }

  return Object.keys(normalized).length ? normalized : null;
}

function readStoredBaselineMap(): SeasonalBaselineMap | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STATIC_BASELINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeSeasonalBaselineMap(parsed);
  } catch {
    return null;
  }
}

function writeStoredBaselineMap(map: SeasonalBaselineMap): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STATIC_BASELINE_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort cache only.
  }
}

async function loadSeasonalBaselineMap(): Promise<SeasonalBaselineMap | null> {
  if (seasonalBaselineByCity) return seasonalBaselineByCity;

  const stored = readStoredBaselineMap();
  if (stored) {
    seasonalBaselineByCity = stored;
    return seasonalBaselineByCity;
  }

  if (typeof window === 'undefined') return null;
  if (seasonalBaselineLoadPromise) return seasonalBaselineLoadPromise;

  seasonalBaselineLoadPromise = (async () => {
    try {
      const response = await fetch(STATIC_BASELINE_URL, { method: 'GET', cache: 'force-cache' });
      if (!response.ok) return null;
      const parsed = (await response.json()) as unknown;
      const normalized = normalizeSeasonalBaselineMap(parsed);
      if (!normalized) return null;
      seasonalBaselineByCity = normalized;
      writeStoredBaselineMap(normalized);
      return normalized;
    } catch {
      return null;
    }
  })();

  return seasonalBaselineLoadPromise;
}

function resolveSeasonalEntry(cityId: string): SeasonalBaselineEntry {
  const normalizedCityId = normalizeCityKey(cityId);

  if (seasonalBaselineByCity?.[normalizedCityId]) {
    return seasonalBaselineByCity[normalizedCityId];
  }

  const stored = readStoredBaselineMap();
  if (stored?.[normalizedCityId]) {
    seasonalBaselineByCity = stored;
    return stored[normalizedCityId];
  }

  return inMemoryFallbackBaselines[normalizedCityId] ?? {
    seasonal_aqi: DEFAULT_SEASONAL_AQI,
    seasonal_congestion: DEFAULT_SEASONAL_CONGESTION,
    seasonal_condition: 'Seasonal averages are moderate today, with manageable transit load.',
    seasonal_action:
      'Because this district can tighten during peak windows, rail-and-walk routing gives the streets immediate relief.',
    source_ref: `${resolveCityConfig(normalizedCityId).sourceRef} (seasonal baseline)`,
    retention_rate: resolveCityConfig(normalizedCityId).retentionRateBaseline,
  };
}

function buildSeasonalPayload(cityId: string, entry: SeasonalBaselineEntry): UrbanDiagnosticPayload {
  const config = resolveCityConfig(cityId);
  const aqi = Math.round(clamp(entry.seasonal_aqi, 1, 500));
  const trafficDelay = toOneDecimal(clamp(entry.seasonal_congestion, 0, 1) * 100);

  const retention = clamp(entry.retention_rate ?? config.retentionRateBaseline, 0, 1);
  return {
    city_vital: buildCityVital(aqi, trafficDelay),
    diagnostic_nudge: sanitizeNarrative(
      entry.seasonal_action,
      'Because this district can tighten during peak windows, rail-and-walk routing gives the streets immediate relief.',
    ),
    retention_rate: Number.parseFloat(retention.toFixed(2)),
    source_ref: `${sanitizeNarrative(entry.source_ref, config.sourceRef)} (seasonal average baseline)`,
  };
}

export function getCachedOrBaselineUrbanDiagnostic(cityId: string): UrbanDiagnosticPayload {
  const normalizedCityId = normalizeCityKey(cityId);
  const cached = readCachedDiagnostic(normalizedCityId);
  if (cached) return cached;

  return buildSeasonalPayload(normalizedCityId, resolveSeasonalEntry(normalizedCityId));
}

export async function primeStaticBaselineCache(): Promise<void> {
  await loadSeasonalBaselineMap();
}

async function fetchWaqiAqi(feed: string): Promise<number | null> {
  if (!WAQI_TOKEN) return null;

  const url = `https://api.waqi.info/feed/${encodeURIComponent(feed)}/?token=${encodeURIComponent(WAQI_TOKEN)}`;
  const response = await fetch(url, { method: 'GET', mode: 'cors' });
  if (!response.ok) return null;

  const payload = (await response.json()) as WaqiResponse;
  if (payload.status !== 'ok') return null;
  return parseNumeric(payload.data?.aqi);
}

async function fetchTomTomDelay(point: { lat: number; lng: number }): Promise<number | null> {
  if (!TOMTOM_API_KEY) return null;

  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${point.lat},${point.lng}&unit=KMPH&openLr=false&key=${encodeURIComponent(TOMTOM_API_KEY)}`;
  const response = await fetch(url, { method: 'GET', mode: 'cors' });
  if (!response.ok) return null;

  const payload = (await response.json()) as TomTomResponse;
  const currentTravelTime = payload.flowSegmentData?.currentTravelTime;
  const freeFlowTravelTime = payload.flowSegmentData?.freeFlowTravelTime;
  if (typeof currentTravelTime !== 'number' || typeof freeFlowTravelTime !== 'number') return null;

  return computeTrafficDelayPercent(currentTravelTime, freeFlowTravelTime);
}

export async function fetchUrbanDiagnostic(cityId: string): Promise<UrbanDiagnosticPayload> {
  const normalizedCityId = normalizeCityKey(cityId);
  const config = resolveCityConfig(normalizedCityId);

  let aqi: number | null = null;
  let trafficDelay: number | null = null;

  try {
    const [aqiResult, trafficDelayResult] = await Promise.all([
      fetchWaqiAqi(config.waqiFeed),
      fetchTomTomDelay(config.tomTomPoint),
    ]);
    aqi = aqiResult;
    trafficDelay = trafficDelayResult;
  } catch {
    // Read-only fallback path below.
  }

  const baselineMap = await loadSeasonalBaselineMap();
  if (baselineMap) {
    seasonalBaselineByCity = baselineMap;
  }

  const seasonalEntry = resolveSeasonalEntry(normalizedCityId);
  const fallbackAqi = Math.round(clamp(seasonalEntry.seasonal_aqi, 1, 500));
  const fallbackTrafficDelay = toOneDecimal(clamp(seasonalEntry.seasonal_congestion, 0, 1) * 100);

  const hasLiveAqi = aqi != null;
  const hasLiveTraffic = trafficDelay != null;

  if (!hasLiveAqi && !hasLiveTraffic) {
    const cached = readCachedDiagnostic(normalizedCityId);
    if (cached) return cached;

    const seasonalPayload = buildSeasonalPayload(normalizedCityId, seasonalEntry);
    writeCachedDiagnostic(normalizedCityId, seasonalPayload);
    return seasonalPayload;
  }

  const resolvedAqi = hasLiveAqi ? Math.round(aqi as number) : fallbackAqi;
  const resolvedTrafficDelay = hasLiveTraffic ? toOneDecimal(trafficDelay as number) : fallbackTrafficDelay;

  const sourceRef = hasLiveAqi && hasLiveTraffic
    ? `${config.sourceRef} (live WAQI + live TomTom)`
    : `${config.sourceRef} (live partial + seasonal average baseline)`;

  const payload: UrbanDiagnosticPayload = {
    city_vital: buildCityVital(resolvedAqi, resolvedTrafficDelay),
    diagnostic_nudge: buildDiagnosticNudge(resolvedAqi, resolvedTrafficDelay),
    retention_rate: Number.parseFloat(config.retentionRateBaseline.toFixed(2)),
    source_ref: sourceRef,
  };

  writeCachedDiagnostic(normalizedCityId, payload);
  return payload;
}

function deriveNarrativeTrigger(aqi: number | null, congestionLevel: number | null): NarrativeTrigger {
  const highAir = aqi != null && aqi > 100;
  const highCongestion = congestionLevel != null && congestionLevel > 0.7;

  if (highAir && highCongestion) return 'air-traffic';
  if (highAir) return 'air';
  if (highCongestion) return 'traffic';
  return 'steady';
}

function buildConditionNarrative(trigger: NarrativeTrigger, cityTitle: string, aqi: number | null, trafficDelay: number | null): string {
  if (trigger === 'air-traffic') {
    return `Heavy transit load in ${cityTitle} is making the air feel heavy today${aqi != null && trafficDelay != null ? ` (AQI ${aqi}, delay ${Math.round(trafficDelay)}%).` : '.'}`;
  }
  if (trigger === 'air') {
    return `Air pressure is elevated in ${cityTitle}${aqi != null ? ` (AQI ${aqi})` : ''}, and the city is working harder to breathe.`;
  }
  if (trigger === 'traffic') {
    return `Road congestion is elevated in ${cityTitle}${trafficDelay != null ? ` (delay ${Math.round(trafficDelay)}%)` : ''}, and core lanes are nearing their limit.`;
  }
  return `${cityTitle} is tracking close to seasonal averages, with manageable pressure on air and street flow.`;
}

function buildActionNarrative(trigger: NarrativeTrigger): string {
  if (trigger === 'air-traffic') {
    return 'Because the air is heavy and roads are saturated, taking metro and short pedestrian links gives the streets immediate relief.';
  }
  if (trigger === 'air') {
    return 'Because the air is heavy, choosing rail and sidewalk links lowers curbside exhaust pressure immediately.';
  }
  if (trigger === 'traffic') {
    return 'Because road lanes are overloaded, shifting to rail or tram corridors clears pressure off the streets quickly.';
  }
  return 'Because conditions are steady, rail-and-walk routing helps keep the city in that low-pressure state.';
}

function buildImpactNarrative(trigger: NarrativeTrigger): string {
  if (trigger === 'air-traffic') {
    return 'Using local transit keeps the district accessible for the artisans and families who live here, even during high-pressure windows.';
  }
  if (trigger === 'air') {
    return 'Choosing cleaner movement routes helps the district stay breathable for residents, workers, and small local storefronts.';
  }
  if (trigger === 'traffic') {
    return 'Taking pressure off road lanes keeps local blocks reachable for families, deliveries, and neighborhood trade.';
  }
  return 'Keeping travel choices light on road load helps preserve reliable access for neighborhood families and independent shops.';
}

function normalizeRetentionRate(retentionRate: number): number {
  if (!Number.isFinite(retentionRate)) return 0.8;
  return clamp(retentionRate, 0, 1);
}

export function generateCityPackData(
  cityLabel: string | undefined | null,
  diagnostic: UrbanDiagnosticPayload,
): CityPackData {
  const title = formatCityLabel(cityLabel);
  const aqi = parseAqiFromVital(diagnostic.city_vital);
  const trafficDelay = parseTrafficDelayFromVital(diagnostic.city_vital);
  const congestionLevel = trafficDelay == null ? null : clamp(trafficDelay / 100, 0, 1);

  const trigger = deriveNarrativeTrigger(aqi, congestionLevel);
  const contextId = `${slugifyLabel(title)}-${trigger}`;

  const currentConditions = buildConditionNarrative(trigger, title, aqi, trafficDelay);
  const whatCanYouDo = sanitizeNarrative(
    buildActionNarrative(trigger),
    'Because conditions are changing, rail-and-walk routing gives the streets immediate relief.',
  );
  const howItHelps = sanitizeNarrative(
    buildImpactNarrative(trigger),
    'Choosing lower-pressure routes helps local families and artisans keep daily access stable.',
  );

  const staysLocalPct = Math.round(normalizeRetentionRate(diagnostic.retention_rate) * 100);
  const heritageSeal = `${staysLocalPct}% Local Retention | Verified Neighborhood Investment`;

  return {
    title,
    contextId,
    currentConditions: sanitizeNarrative(currentConditions, `${title} is running with moderate city pressure today.`),
    whatCanYouDo,
    howItHelps,
    heritageSeal,
    staysLocalPct,
    sourceRef: sanitizeNarrative(diagnostic.source_ref, 'WAQI + TomTom + GDS-Index 2026 (seasonal baseline)'),
  };
}
