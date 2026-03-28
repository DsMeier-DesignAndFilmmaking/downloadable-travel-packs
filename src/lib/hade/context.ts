// HADE Context Builder
// Reads real inputs (time of day, AQI, arrival stage) and returns a
// structured HadeContext used by the decision engine.
// No side effects — all localStorage reads are guarded and wrapped in try/catch.

import type { ArrivalStage, HadeContext } from '@/types/cityPack';
import { getActiveProfile } from './profile';

export type { ArrivalStage, HadeContext } from '@/types/cityPack';

// ─── Time of day ──────────────────────────────────────────────────────────────
// morning:   05:00–10:59
// afternoon: 11:00–16:59
// evening:   17:00–20:59
// night:     21:00–04:59

function resolveTimeOfDay(hour: number): HadeContext['timeOfDay'] {
  if (hour >= 5 && hour <= 10) return 'morning';
  if (hour >= 11 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

// ─── AQI ─────────────────────────────────────────────────────────────────────
// 0–50   → good
// 51–100 → moderate
// 101+   → unhealthy

function resolveAqiLevel(value: number): HadeContext['aqiLevel'] {
  if (value <= 50) return 'good';
  if (value <= 100) return 'moderate';
  return 'unhealthy';
}

// ─── AQI cache reader ─────────────────────────────────────────────────────────
// Reads the environmental impact cache written by environmentalImpactService.ts.
// Cache key format: env-impact-cache-v1-${cityId}
// Stored shape:     { report: EnvironmentalImpactReport, savedAt: number }

/** Exported so environmentalImpactService.ts can import it — eliminates the "must match" risk. */
export const CACHE_TTL_MS = 30 * 60 * 1000;

function readAqiFromCache(slug: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`env-impact-cache-v1-${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      report?: { aqiValue?: unknown };
      savedAt?: number;
    };
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    const value = parsed?.report?.aqiValue;
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

// ─── Arrival stage ────────────────────────────────────────────────────────────
// Reads the arrived status written by CityGuideView.tsx.
// Storage key: landed_${slug}
// Stored values: 'entry-immigration' | 'airport-exit' | 'left-airport'
// Mapping: 'entry-immigration' | 'airport-exit' → 'landed'
//          'left-airport'                        → 'in_transit'
//          key absent (UI 'pre-arrival' state)   → 'exploring'

export function resolveArrivalStage(slug: string): HadeContext['arrivalStage'] {
  if (typeof window === 'undefined') return 'exploring';
  try {
    const raw = window.localStorage.getItem(`landed_${slug}`);
    if (raw === null) return 'exploring';
    if (raw === 'entry-immigration' || raw === 'airport-exit') return 'landed';
    if (raw === 'left-airport') return 'in_transit';
    return 'exploring';
  } catch {
    return 'exploring';
  }
}

// ─── ArrivalStage → HadeArrivalStage mapping ──────────────────────────────────
// Converts the 4-value UI stage (CityGuideView) to the 3-value engine stage.
// Extracted so useHadeContext.ts can call it without duplicating the logic.

export function mapArrivalStageToHade(stage: ArrivalStage | null): HadeContext['arrivalStage'] {
  if (stage === 'entry-immigration' || stage === 'airport-exit') return 'landed';
  if (stage === 'left-airport') return 'in_transit';
  return 'exploring'; // covers 'pre-arrival' and null
}

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildHadeContext(opts: {
  slug: string;
  aqi?: number | null;
  arrivalStage?: HadeContext['arrivalStage'];
}): HadeContext {
  const { slug, aqi, arrivalStage } = opts;
  const hour = new Date().getHours();

  // AQI priority: explicit prop → localStorage cache → null (unknown, no data)
  const resolvedAqi =
    typeof aqi === 'number' ? aqi : readAqiFromCache(slug);

  return {
    timeOfDay: resolveTimeOfDay(hour),
    aqiLevel: resolvedAqi === null ? 'unknown' : resolveAqiLevel(resolvedAqi),
    arrivalStage: arrivalStage ?? resolveArrivalStage(slug),
    profile: getActiveProfile(),
  };
}
