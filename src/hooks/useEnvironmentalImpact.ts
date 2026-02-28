/**
 * useEnvironmentalImpact.ts
 *
 * SWR-style hook:
 *   Phase 1 — Immediately returns cached snapshot (no loading flash)
 *   Phase 2 — Fetches live data in background, updates state on success
 *   Phase 3 — On error, keeps Phase 1 snapshot intact (never blanks UI)
 *
 * Usage:
 *   const { report, isLoading, isLive, error } = useEnvironmentalImpact({
 *     cityId: 'bangkok-thailand',
 *     lat: 13.7563,
 *     lng: 100.5018,
 *   });
 */

import { useEffect, useRef, useState } from 'react';
import {
  getCachedEnvironmentalReport,
  getEnvironmentalImpactReport,
  type EnvironmentalImpactReport,
} from '@/services/environmentalImpactService';

export type UseEnvironmentalImpactOptions = {
  cityId: string;
  lat?: number;
  lng?: number;
};

export type UseEnvironmentalImpactResult = {
  report: EnvironmentalImpactReport | null;
  isLoading: boolean;   // true only when no data at all (first-ever load, no cache)
  isLive: boolean;      // true when current report came from a live API call
  error: string | null;
};

export function useEnvironmentalImpact(
  options: UseEnvironmentalImpactOptions,
): UseEnvironmentalImpactResult {
  const { cityId, lat, lng } = options;

  // Seed state from localStorage synchronously so first render shows data
  const [report, setReport] = useState<EnvironmentalImpactReport | null>(() =>
    cityId ? getCachedEnvironmentalReport(cityId) : null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(!report);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent stale closures if cityId changes mid-flight
  const activeKeyRef = useRef<string>('');

  useEffect(() => {
    if (!cityId) return;

    const key = `${cityId}-${lat ?? 'none'}-${lng ?? 'none'}`;
    activeKeyRef.current = key;

    // Phase 1: seed from cache without triggering loading state
    const cached = getCachedEnvironmentalReport(cityId);
    if (cached) {
      setReport(cached);
      setIsLoading(false);
      setIsLive(false);
    } else {
      setIsLoading(true);
    }

    setError(null);

    // Phase 2: live fetch
    let cancelled = false;

    getEnvironmentalImpactReport(cityId, { lat, lng })
      .then((fresh) => {
        if (cancelled || activeKeyRef.current !== key) return;
        setReport(fresh);
        setIsLive(fresh.isLive);
        setIsLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || activeKeyRef.current !== key) return;
        // Keep stale data — only surface error if we have nothing to show
        setIsLoading(false);
        if (!report && !cached) {
          setError(err instanceof Error ? err.message : 'Failed to load environmental data');
        }
        console.warn('[useEnvironmentalImpact] live fetch failed:', err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, lat, lng]);

  return { report, isLoading, isLive, error };
}