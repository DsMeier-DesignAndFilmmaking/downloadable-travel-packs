/**
 * usePivotScanner
 *
 * Async orchestrator for the Pivot Scanner feature.
 *
 * 1. Requests a one-shot GPS fix via navigator.geolocation.getCurrentPosition.
 * 2. Geocodes all neighborhood names for the city (Google Geocoder, results
 *    cached in localStorage under `pivot-geo-cache-v1-${slug}` so subsequent
 *    scans pay no extra geocoding cost).
 * 3. Calls the pure scanCurrentLocation() engine function with the resolved
 *    coordinates and the live HadeContext.
 * 4. Returns scan state and a trigger function for PivotScannerFAB to consume.
 *
 * The hook is intentionally free of any UI logic — it only manages async state.
 */

import { useState, useCallback } from 'react';
import { scanCurrentLocation, type PivotScanResult } from '@/lib/hade/engine';
import type { CityPack, HadeContext } from '@/types/cityPack';

// ─── Types ─────────────────────────────────────────────────────────────────────

type NeighborhoodCoords = Record<string, { lat: number; lng: number }>;

export type PivotScanState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'done'; result: PivotScanResult }
  | { status: 'error'; message: string };

// ─── Constants ─────────────────────────────────────────────────────────────────

const GEO_CACHE_KEY_PREFIX = 'pivot-geo-cache-v1';

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function usePivotScanner(cityPack: CityPack, hadeContext: HadeContext) {
  const [state, setState] = useState<PivotScanState>({ status: 'idle' });

  const cacheKey = `${GEO_CACHE_KEY_PREFIX}-${cityPack.slug}`;

  /**
   * Geocodes every neighborhood name for the city and returns a name→coords map.
   * Reads from localStorage first; persists the result after a successful fetch.
   * Requires the Google Maps Geocoder to be available on window.google.maps.
   */
  const resolveNeighborhoodCoords = useCallback(async (): Promise<NeighborhoodCoords> => {
    // Try localStorage cache first.
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as NeighborhoodCoords;
    } catch {
      // Corrupt or missing cache — fall through to live geocoding.
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geocoder = new (window as any).google.maps.Geocoder();
    const coords: NeighborhoodCoords = {};

    await Promise.allSettled(
      cityPack.neighborhoods.map(
        (n) =>
          new Promise<void>((resolve) => {
            geocoder.geocode(
              { address: `${n.name}, ${cityPack.name}` },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (results: any, status: string) => {
                if (status === 'OK' && results?.[0]?.geometry?.location) {
                  const point = results[0].geometry.location;
                  coords[n.name] = { lat: point.lat(), lng: point.lng() };
                }
                resolve();
              },
            );
          }),
      ),
    );

    // Persist to localStorage (best-effort — silently swallow quota errors).
    try {
      localStorage.setItem(cacheKey, JSON.stringify(coords));
    } catch {
      // Storage quota exceeded — continue without caching.
    }

    return coords;
  }, [cityPack, cacheKey]);

  /**
   * Main scan trigger. Safe to call multiple times — concurrent calls are
   * no-ops if a scan is already in progress.
   */
  const scan = useCallback(async () => {
    if (state.status === 'scanning') return;
    setState({ status: 'scanning' });

    // ── 1. GPS fix ──────────────────────────────────────────────────────────

    let gps: { lat: number; lng: number };
    try {
      gps = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('Geolocation API not available'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
        );
      });
    } catch {
      setState({
        status: 'error',
        message: 'GPS unavailable. Enable location access and try again.',
      });
      return;
    }

    // ── 2. Neighborhood geocoding (cached after first scan) ─────────────────

    let neighborhoodCoords: NeighborhoodCoords = {};
    try {
      // Only attempt if Google Maps Geocoder is loaded — skipped in SSR / tests.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.maps?.Geocoder) {
        neighborhoodCoords = await resolveNeighborhoodCoords();
      }
    } catch {
      // Geocoding failed — scanCurrentLocation falls back to safetyScore heuristic.
    }

    // ── 3. Pure scan ────────────────────────────────────────────────────────

    try {
      const result = scanCurrentLocation({
        gps,
        neighborhoods: cityPack.neighborhoods,
        hadeContext,
        neighborhoodCoords,
      });
      setState({ status: 'done', result });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Scan failed unexpectedly.',
      });
    }
  }, [state.status, cityPack, hadeContext, resolveNeighborhoodCoords]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, scan, reset };
}
