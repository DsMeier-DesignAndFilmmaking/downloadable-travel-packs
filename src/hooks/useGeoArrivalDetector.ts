/**
 * useGeoArrivalDetector
 *
 * Passive GPS hook that detects when the user is physically at an airport
 * (within a configurable radius) and when they begin moving toward the city
 * center after leaving the terminal.
 *
 * Intentionally decoupled from HadeContextProvider — the hook has no
 * knowledge of the HADE context tree. The calling component maps
 * GeoArrivalStage values to ArrivalStage and calls setHadeArrivalStage().
 *
 * Typical integration inside HadeContextProvider:
 *   const { setArrivalStage } = useHadeCtx();
 *   const { stage } = useGeoArrivalDetector({ cityCoordinates, airportCoordinates });
 *   useEffect(() => {
 *     if (stage === 'landed')            setArrivalStage('entry-immigration');
 *     else if (stage === 'airport-exit') setArrivalStage('airport-exit');
 *     // 'idle' is a no-op — never overwrite a manual UI selection
 *   }, [stage, setArrivalStage]);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { haversineMeters } from '@/lib/geo';

// ─── Public types ──────────────────────────────────────────────────────────────

/** GPS-derived arrival stage. Maps to ArrivalStage in the calling component. */
export type GeoArrivalStage = 'idle' | 'landed' | 'airport-exit';

export interface GeoArrivalDetectorOptions {
  /** City center coordinates (CityGuide.coordinates). */
  cityCoordinates: { lat: number; lng: number };
  /**
   * All airports for the selected city (from AirportArrivalInfo.airportCoordinates).
   * The hook anchors to the nearest one on the first GPS fix.
   */
  airportCoordinates: { lat: number; lng: number }[];
  /**
   * Meters within which the user is considered "at the airport".
   * @default 800
   */
  airportRadiusMeters?: number;
  /**
   * Milliseconds a candidate stage must persist before committing.
   * Prevents GPS jitter from causing rapid stage flickering.
   * @default 10_000
   */
  debounceMs?: number;
  /**
   * Stage to assume when geolocation permission is denied or the API is
   * unavailable. Pass the last known manually-set stage so the hook
   * falls back gracefully without clearing the user's explicit selection.
   * @default 'idle'
   */
  fallbackStage?: GeoArrivalStage;
}

export interface GeoArrivalDetectorResult {
  /** Current GPS-derived arrival stage. */
  stage: GeoArrivalStage;
  /** True until the first GPS fix arrives. False on permission denial or geolocation unavailable. */
  isAcquiring: boolean;
  /** True when the user denied geolocation permission. */
  permissionDenied: boolean;
  /**
   * True while a stage transition is pending inside the debounce window.
   * Use to show a "GPS confirming…" indicator in the UI.
   */
  isPending: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_AIRPORT_RADIUS_M = 800;
const DEFAULT_DEBOUNCE_MS = 10_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the index of the airport nearest to a given GPS point.
 * Used on the first fix to anchor which terminal the user arrived at.
 * Subsequent distance measurements use this anchored airport only.
 */
function nearestAirportIndex(
  lat: number,
  lng: number,
  airports: { lat: number; lng: number }[],
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < airports.length; i++) {
    const d = haversineMeters(lat, lng, airports[i].lat, airports[i].lng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Fires the hade:arrival-update custom event every time a stage is committed. */
function dispatchArrivalUpdate(stage: GeoArrivalStage): void {
  window.dispatchEvent(
    new CustomEvent<{ stage: GeoArrivalStage }>('hade:arrival-update', {
      detail: { stage },
    }),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeoArrivalDetector({
  cityCoordinates,
  airportCoordinates,
  airportRadiusMeters = DEFAULT_AIRPORT_RADIUS_M,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  fallbackStage = 'idle',
}: GeoArrivalDetectorOptions): GeoArrivalDetectorResult {
  const [stage, setStageState] = useState<GeoArrivalStage>('idle');
  const [isAcquiring, setIsAcquiring] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // ─── Option refs ─────────────────────────────────────────────────────────
  //
  // Callers often pass fresh array literals on every render (e.g. `[MEX_AIRPORT]`
  // inside a renderHook callback). Storing inputs in refs lets the watchPosition
  // effect remain mounted across re-renders without restarting — which would
  // cancel any pending debounce timers.
  //
  // Each ref is kept current via a simple layout effect so the position
  // callback always reads the latest values without any stale-closure risk.

  const airportCoordsRef   = useRef(airportCoordinates);
  const cityCoordsRef      = useRef(cityCoordinates);
  const airportRadiusRef   = useRef(airportRadiusMeters);
  const debounceMsRef      = useRef(debounceMs);
  const fallbackStageRef   = useRef(fallbackStage);

  // Sync option refs with latest prop values on every render.
  // These effects have no dependency list so they run after every render,
  // always keeping the refs current without triggering the main effect.
  useEffect(() => { airportCoordsRef.current   = airportCoordinates;  });
  useEffect(() => { cityCoordsRef.current      = cityCoordinates;     });
  useEffect(() => { airportRadiusRef.current   = airportRadiusMeters; });
  useEffect(() => { debounceMsRef.current      = debounceMs;          });
  useEffect(() => { fallbackStageRef.current   = fallbackStage;       });

  // ─── Internal state refs ──────────────────────────────────────────────────
  //
  // The watchPosition callback is created once (on mount). These refs give it
  // access to the latest values without being in the closure's dep list.

  /** Mirror of `stage` — always current inside async callbacks. */
  const stageRef = useRef<GeoArrivalStage>('idle');

  /** Index of the airport the user is anchored to after the first GPS fix. */
  const anchoredAirportIndexRef = useRef<number | null>(null);

  /** Previous distance to city center (m) — used to detect direction of travel. */
  const prevCityDistRef = useRef<number | null>(null);

  /** Pending debounce timer handle. */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep stageRef in sync with React state after every render so callbacks
  // always read the current stage without a stale-closure risk.
  useEffect(() => { stageRef.current = stage; }, [stage]);

  // ─── Commit helper — writes React state AND dispatches the event ────────────

  const commitStage = useCallback((next: GeoArrivalStage) => {
    stageRef.current = next;
    setStageState(next);
    setIsPending(false);
    dispatchArrivalUpdate(next);
  }, []);

  // ─── Core watchPosition effect ─────────────────────────────────────────────
  //
  // Empty dependency array: mounts exactly once. All dynamic inputs are read
  // from refs inside the callback so the watcher is never needlessly restarted.

  useEffect(() => {
    // Guard: Geolocation API not available (SSR, old browsers, stubbed in tests).
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsAcquiring(false);
      setStageState(fallbackStageRef.current);
      stageRef.current = fallbackStageRef.current;
      return;
    }

    // Guard: no airport coordinates — nothing to geofence against.
    if (airportCoordsRef.current.length === 0) {
      setIsAcquiring(false);
      return;
    }

    const handlePosition = (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = position.coords;

      // Read current options from refs (always up to date).
      const airports      = airportCoordsRef.current;
      const cityCoords    = cityCoordsRef.current;
      const radiusM       = airportRadiusRef.current;
      const debounceWindow = debounceMsRef.current;

      // ── First fix: anchor to the nearest terminal ────────────────────────
      if (anchoredAirportIndexRef.current === null) {
        anchoredAirportIndexRef.current = nearestAirportIndex(lat, lng, airports);
        setIsAcquiring(false);
      }

      const anchoredAirport = airports[anchoredAirportIndexRef.current];

      const airportDist = haversineMeters(lat, lng, anchoredAirport.lat, anchoredAirport.lng);
      const cityDist    = haversineMeters(lat, lng, cityCoords.lat, cityCoords.lng);

      // ── Determine candidate stage from this fix ──────────────────────────
      let candidate: GeoArrivalStage;

      if (airportDist <= radiusM) {
        // Within the airport perimeter.
        candidate = 'landed';
      } else if (
        stageRef.current === 'landed' &&
        prevCityDistRef.current !== null &&
        cityDist < prevCityDistRef.current
      ) {
        // Outside the perimeter AND measurably moving toward the city center.
        candidate = 'airport-exit';
      } else {
        // Outside perimeter but no directional signal yet — hold current stage
        // to avoid bouncing back to 'idle' during brief GPS blips.
        candidate = stageRef.current;
      }

      prevCityDistRef.current = cityDist;

      // ── Debounce logic ───────────────────────────────────────────────────
      if (candidate === stageRef.current) {
        // GPS has either stayed in or snapped back to the current zone.
        // Cancel any pending transition — no change needed.
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
          setIsPending(false);
        }
        return;
      }

      // Candidate differs from current stage: (re)schedule the transition.
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsPending(true);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        commitStage(candidate);
      }, debounceWindow);
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        // Hard failure: user denied permission — fall back to manual state.
        setPermissionDenied(true);
        setIsAcquiring(false);
        setIsPending(false);
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        const fb = fallbackStageRef.current;
        stageRef.current = fb;
        setStageState(fb);
        return;
      }
      // POSITION_UNAVAILABLE (2) and TIMEOUT (3): transient failures.
      // watchPosition continues retrying — leave isAcquiring: true.
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true },
    );

    return () => {
      // Optional chaining guards against the geolocation stub being removed
      // (e.g. by vi.unstubAllGlobals in tests) before React's effect cleanup runs.
      navigator.geolocation?.clearWatch(watchId);
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally mount-once. All dynamic inputs are read via refs.

  return { stage, isAcquiring, permissionDenied, isPending };
}
