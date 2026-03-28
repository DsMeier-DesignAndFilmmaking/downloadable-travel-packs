/**
 * useHadeContext — Single source of truth for the full HadeContext (all 8 fields).
 *
 * Replaces the scattered localStorage read pattern and the `hade:update` custom
 * event bus. State updates propagate via React state, not window events.
 *
 * Public API:
 *   const { context, setArrivalStage, setCrowdLevel, setAccommodationStatus,
 *           setLocalEventFlag, setAqi, isDisplaced, timeWindowMinutes } = useHadeContext(slug)
 *
 * Migration note: The existing useArrivalStage and useAqi hooks remain untouched
 * for backward compat. Components migrate to this hook incrementally.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ArrivalStage, HadeContext, TravelerProfile } from '@/types/cityPack';
import { buildHadeContext, mapArrivalStageToHade } from './context';
import { getActiveProfile, setActiveProfile } from './profile';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseHadeContextResult {
  /** The full reactive HadeContext object — all 8 fields populated. */
  context: HadeContext;

  /**
   * Maps the 4-value UI ArrivalStage to the 3-value engine stage,
   * writes localStorage, and updates React state — replacing the 5 scattered
   * localStorage writes in CityGuideView.tsx.
   */
  setArrivalStage: (stage: ArrivalStage) => void;

  /** Set neighbourhood-level crowd density (sourced from pulseService in future). */
  setCrowdLevel: (level: HadeContext['crowdLevel']) => void;

  /**
   * Set accommodation check-in status. When set to 'delayed', the derived
   * `isDisplaced` field becomes true and Priority-0 recommendations activate.
   */
  setAccommodationStatus: (status: HadeContext['accommodationStatus']) => void;

  /** Set a local event flag string (e.g. 'festival', 'closure'). Pass null to clear. */
  setLocalEventFlag: (flag: string | null) => void;

  /**
   * Called by EnvironmentalImpactBlock via the onAqiResolved prop when live
   * AQI data arrives — replaces the had:update event dispatch from the service.
   */
  setAqi: (aqiValue: number) => void;

  /** Convenience alias for context.userDisplaced — true when accommodation is delayed. */
  isDisplaced: boolean;

  /**
   * Micro-feedback weight in range [-1, 1]. Positive values reinforce current
   * recommendation style; negative values push the engine to alternate options.
   */
  setSignalWeight: (next: number | ((current: number) => number)) => void;

  /** Reserved for future crowdLevel data source integration. Currently undefined. */
  timeWindowMinutes: number | undefined;

  /** Persists a TravelerProfile to localStorage and updates React state. Pass undefined to clear. */
  setProfile: (profile: TravelerProfile | undefined) => void;
}

// ─── LocalStorage key helpers ─────────────────────────────────────────────────

function landedKey(slug: string): string {
  return `landed_${slug}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHadeContext(slug: string): UseHadeContextResult {
  // Initialise from the existing buildHadeContext call — preserves the
  // localStorage-seed behaviour so first render is not blank.
  const [context, setContext] = useState<HadeContext>(() =>
    buildHadeContext({ slug })
  );

  // ─── setArrivalStage ──────────────────────────────────────────────────────
  // Writes localStorage (so legacy hooks and server-restart reads stay in sync)
  // and updates React state — replacing all 5 scattered writes in CityGuideView.

  const setArrivalStage = useCallback(
    (stage: ArrivalStage) => {
      const key = landedKey(slug);
      try {
        if (stage === 'pre-arrival') {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, stage);
        }
      } catch {
        // localStorage unavailable (private browsing, storage full) — state still updates
      }
      const hadeStage = mapArrivalStageToHade(stage);
      setContext((prev) => ({ ...prev, arrivalStage: hadeStage }));
    },
    [slug]
  );

  // ─── setCrowdLevel ────────────────────────────────────────────────────────

  const setCrowdLevel = useCallback((level: HadeContext['crowdLevel']) => {
    setContext((prev) => ({ ...prev, crowdLevel: level }));
  }, []);

  // ─── setAccommodationStatus ───────────────────────────────────────────────
  // Derives userDisplaced automatically after each update.

  const setAccommodationStatus = useCallback(
    (status: HadeContext['accommodationStatus']) => {
      setContext((prev) => ({
        ...prev,
        accommodationStatus: status,
        userDisplaced: status === 'delayed',
      }));
    },
    []
  );

  // ─── setLocalEventFlag ────────────────────────────────────────────────────

  const setLocalEventFlag = useCallback((flag: string | null) => {
    setContext((prev) => ({ ...prev, localEventFlag: flag }));
  }, []);

  // ─── setAqi ───────────────────────────────────────────────────────────────
  // Fed by EnvironmentalImpactBlock via the onAqiResolved prop. Converts the raw
  // numeric AQI value to the engine's categorical level string.

  const setAqi = useCallback((aqiValue: number) => {
    const aqiLevel: HadeContext['aqiLevel'] =
      aqiValue <= 50 ? 'good' : aqiValue <= 100 ? 'moderate' : 'unhealthy';
    setContext((prev) => ({ ...prev, aqiLevel }));
  }, []);

  // ─── setSignalWeight ──────────────────────────────────────────────────────

  const setSignalWeight = useCallback((next: number | ((current: number) => number)) => {
    setContext((prev) => {
      const current = typeof prev.signalWeight === 'number' ? prev.signalWeight : 0;
      const resolved = typeof next === 'function' ? next(current) : next;
      const clamped = Number.isFinite(resolved)
        ? Math.max(-1, Math.min(1, resolved))
        : current;
      return { ...prev, signalWeight: clamped };
    });
  }, []);

  // ─── setProfile ───────────────────────────────────────────────────────────

  const setProfile = useCallback((profile: TravelerProfile | undefined) => {
    setActiveProfile(profile);
    setContext((prev) => ({ ...prev, profile }));
  }, []);

  // ─── Derived values ───────────────────────────────────────────────────────

  const isDisplaced = context.userDisplaced === true;
  // timeWindowMinutes: reserved for future crowdLevel real-time data source
  const timeWindowMinutes: number | undefined = undefined;

  // ─── Stable result object ─────────────────────────────────────────────────

  return useMemo(
    () => ({
      context,
      setArrivalStage,
      setCrowdLevel,
      setAccommodationStatus,
      setLocalEventFlag,
      setAqi,
      setSignalWeight,
      setProfile,
      isDisplaced,
      timeWindowMinutes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, setArrivalStage, setCrowdLevel, setAccommodationStatus, setLocalEventFlag, setAqi, setSignalWeight, setProfile]
  );
}
