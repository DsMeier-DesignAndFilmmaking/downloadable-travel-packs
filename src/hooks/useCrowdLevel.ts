import { useMemo } from 'react';
import type { HadeContext } from '@/types/cityPack';

export type CrowdLevel = NonNullable<HadeContext['crowdLevel']>;

export interface UseCrowdLevelOptions {
  timeOfDay: HadeContext['timeOfDay'];
  localEventFlag?: string | null;
}

function baseCrowdLevel(timeOfDay: HadeContext['timeOfDay']): CrowdLevel {
  switch (timeOfDay) {
    case 'morning':   return 'light';
    case 'afternoon': return 'moderate';
    case 'evening':   return 'heavy';
    case 'night':     return 'moderate';
  }
}

function boostOnce(level: CrowdLevel): CrowdLevel {
  if (level === 'light')    return 'moderate';
  if (level === 'moderate') return 'heavy';
  return 'heavy';
}

/**
 * Derives a crowd level from time-of-day heuristics, optionally boosted
 * one tier when a local event is active.
 *
 * Baseline:
 *   morning   → light
 *   afternoon → moderate
 *   evening   → heavy
 *   night     → moderate
 *
 * If `localEventFlag` is a non-empty string, the base level is boosted
 * one tier (light→moderate, moderate→heavy, heavy stays heavy).
 */
export function useCrowdLevel({ timeOfDay, localEventFlag }: UseCrowdLevelOptions): CrowdLevel {
  return useMemo(() => {
    const base = baseCrowdLevel(timeOfDay);
    return localEventFlag ? boostOnce(base) : base;
  }, [timeOfDay, localEventFlag]);
}
