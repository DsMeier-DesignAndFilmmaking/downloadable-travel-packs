/**
 * useGeoArrivalDetector — unit tests
 *
 * Strategy:
 *   - Stub navigator.geolocation via vi.stubGlobal so the hook's watchPosition
 *     call is captured. Tests then inject GPS positions imperatively by calling
 *     the captured success/error callbacks.
 *   - Use vi.useFakeTimers() to control the debounce without real waiting.
 *   - Fixture coordinates come from real multiAirport.ts data (MEX / CDMX Zócalo).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useGeoArrivalDetector,
  type GeoArrivalStage,
} from '../useGeoArrivalDetector';

// ─── Geolocation mock infrastructure ─────────────────────────────────────────

type PositionCallback = (pos: GeolocationPosition) => void;
type ErrorCallback    = (err: GeolocationPositionError) => void;

let mockPositionCallback: PositionCallback | null = null;
let mockErrorCallback:    ErrorCallback    | null = null;
const mockClearWatch = vi.fn();

/** Build a minimal GeolocationPosition from lat/lng. */
function makePosition(lat: number, lng: number): GeolocationPosition {
  return {
    coords: {
      latitude:         lat,
      longitude:        lng,
      accuracy:         10,
      altitude:         null,
      altitudeAccuracy: null,
      heading:          null,
      speed:            null,
      toJSON:           () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

/** Build a minimal GeolocationPositionError. */
function makeError(code: number): GeolocationPositionError {
  return {
    code,
    message: 'test error',
    PERMISSION_DENIED:   1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT:             3,
  } as GeolocationPositionError;
}

// ─── Fixture coordinates (real multiAirport.ts data) ─────────────────────────

/** Benito Juárez International (MEX) terminal coordinates. */
const MEX_AIRPORT  = { lat: 19.4363, lng: -99.0721 };
/** Toluca International (TLC). */
const TLC_AIRPORT  = { lat: 19.3371, lng: -99.5664 };
/** Felipe Ángeles (NLU). */
const NLU_AIRPORT  = { lat: 19.7581, lng: -99.0151 };
/** CDMX Zócalo (city center). */
const CDMX_CENTER  = { lat: 19.4326, lng: -99.1332 };

/** ~50 m from MEX terminal — well within the 800 m radius. */
const INSIDE_AIRPORT = { lat: 19.437, lng: -99.072 };
/** ~2.3 km from MEX, ~4 km from Zócalo — outside perimeter, between airport & city. */
const BETWEEN = { lat: 19.435, lng: -99.095 };
/** ~3.9 km from Zócalo — closer to city than BETWEEN (decreasing city distance). */
const CLOSER_TO_CITY = { lat: 19.434, lng: -99.11 };
/** ~1.6 km from MEX — outside the 800 m airport radius. */
const OUTSIDE_AIRPORT = { lat: 19.428, lng: -99.068 };

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockPositionCallback = null;
  mockErrorCallback    = null;
  mockClearWatch.mockClear();

  vi.stubGlobal('navigator', {
    geolocation: {
      watchPosition: vi.fn((success: PositionCallback, error: ErrorCallback) => {
        mockPositionCallback = success;
        mockErrorCallback    = error;
        return 1; // stable watch id
      }),
      clearWatch: mockClearWatch,
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── 1. Initialization ────────────────────────────────────────────────────────

describe('initialization', () => {
  it('starts idle, acquiring, not denied, not pending before any GPS fix', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
      }),
    );

    expect(result.current.stage).toBe('idle');
    expect(result.current.isAcquiring).toBe(true);
    expect(result.current.permissionDenied).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('registers watchPosition with enableHighAccuracy: true', () => {
    renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
      }),
    );

    expect(navigator.geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true }),
    );
  });
});

// ─── 2. Landed stage (within airport radius) ──────────────────────────────────

describe('landed stage — airport geofence', () => {
  it('sets isPending immediately and commits "landed" after debounce', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         10_000,
      }),
    );

    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });

    // Immediately after the first fix: pending, not yet committed.
    expect(result.current.isPending).toBe(true);
    expect(result.current.stage).toBe('idle');
    expect(result.current.isAcquiring).toBe(false); // first fix received

    // After debounce window: transition commits.
    act(() => { vi.advanceTimersByTime(10_000); });

    expect(result.current.stage).toBe('landed');
    expect(result.current.isPending).toBe(false);
  });

  it('cancels pending transition when GPS snaps back outside the airport radius', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         10_000,
      }),
    );

    // First fix: inside airport → debounce starts for 'landed'.
    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    expect(result.current.isPending).toBe(true);

    // GPS jitter: fix snaps outside radius before debounce fires.
    // OUTSIDE_AIRPORT is beyond 800 m → candidate resolves back to 'idle'
    // (= stageRef.current) → pending debounce is cancelled.
    act(() => {
      vi.advanceTimersByTime(5_000);
      mockPositionCallback!(makePosition(OUTSIDE_AIRPORT.lat, OUTSIDE_AIRPORT.lng));
    });

    expect(result.current.isPending).toBe(false);

    act(() => { vi.advanceTimersByTime(10_000); });

    // Stage must remain 'idle' — the transition was cancelled.
    expect(result.current.stage).toBe('idle');
  });
});

// ─── 3. Airport-exit stage (moving toward city) ───────────────────────────────

describe('airport-exit stage — moving toward city center', () => {
  it('transitions from landed to airport-exit when city distance decreases', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         10_000,
      }),
    );

    // Fix 1: inside airport → land.
    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.stage).toBe('landed');

    // Fix 2: outside airport perimeter, farther from city — establishes prevCityDist.
    act(() => {
      mockPositionCallback!(makePosition(BETWEEN.lat, BETWEEN.lng));
    });

    // Fix 3: still outside perimeter, now CLOSER to city than fix 2.
    // prevCityDist < cityDist on fix 3 triggers 'airport-exit' candidate.
    act(() => {
      mockPositionCallback!(makePosition(CLOSER_TO_CITY.lat, CLOSER_TO_CITY.lng));
    });

    expect(result.current.isPending).toBe(true);

    act(() => { vi.advanceTimersByTime(10_000); });

    expect(result.current.stage).toBe('airport-exit');
    expect(result.current.isPending).toBe(false);
  });
});

// ─── 4. Custom event dispatch ─────────────────────────────────────────────────

describe('hade:arrival-update event', () => {
  it('dispatches hade:arrival-update with correct stage detail on commit', () => {
    const listener = vi.fn();
    window.addEventListener('hade:arrival-update', listener);

    renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         0, // commit immediately
      }),
    );

    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    // runAllTimers is more reliable than advanceTimersByTime(0) for delay=0 timeouts.
    act(() => { vi.runAllTimers(); });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent<{ stage: GeoArrivalStage }>;
    expect(event.detail.stage).toBe('landed');

    window.removeEventListener('hade:arrival-update', listener);
  });

  it('does not dispatch had:arrival-update when stage does not change', () => {
    const listener = vi.fn();
    window.addEventListener('hade:arrival-update', listener);

    renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         10_000,
      }),
    );

    // Two fixes both inside the airport — only one debounce should be pending.
    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    act(() => { vi.runAllTimers(); });

    // Only one event: the commit after the debounce.
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener('hade:arrival-update', listener);
  });
});

// ─── 5. Permission denial fallback ───────────────────────────────────────────

describe('permission denial fallback', () => {
  it('sets permissionDenied, uses fallbackStage, and clears isAcquiring on PERMISSION_DENIED', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        fallbackStage:      'landed',
      }),
    );

    act(() => {
      mockErrorCallback!(makeError(1)); // PERMISSION_DENIED
    });

    expect(result.current.permissionDenied).toBe(true);
    expect(result.current.stage).toBe('landed');
    expect(result.current.isAcquiring).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('does not set permissionDenied for POSITION_UNAVAILABLE — keeps retrying', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
      }),
    );

    act(() => {
      mockErrorCallback!(makeError(2)); // POSITION_UNAVAILABLE
    });

    expect(result.current.permissionDenied).toBe(false);
    // Still acquiring — watchPosition continues.
    expect(result.current.isAcquiring).toBe(true);
  });
});

// ─── 6. Cleanup ───────────────────────────────────────────────────────────────

describe('cleanup', () => {
  it('calls clearWatch exactly once on unmount', () => {
    const { unmount } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
      }),
    );

    unmount();
    expect(mockClearWatch).toHaveBeenCalledOnce();
  });

  it('cancels pending debounce on unmount — no state update after unmount', () => {
    const { result, unmount } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        debounceMs:         10_000,
      }),
    );

    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    expect(result.current.isPending).toBe(true);

    unmount();

    // Advancing timers after unmount must not throw (no setState on an unmounted hook).
    expect(() => { act(() => { vi.advanceTimersByTime(15_000); }); }).not.toThrow();
  });
});

// ─── 7. Multi-airport support ─────────────────────────────────────────────────

describe('multi-airport support', () => {
  it('anchors to the nearest airport on the first fix when multiple are present', () => {
    // Position is ~50 m from MEX — nearest among three airports.
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT, TLC_AIRPORT, NLU_AIRPORT],
        debounceMs:         0,
      }),
    );

    act(() => {
      mockPositionCallback!(makePosition(INSIDE_AIRPORT.lat, INSIDE_AIRPORT.lng));
    });
    act(() => { vi.advanceTimersByTime(0); });

    // Anchored to MEX → within 800 m → 'landed' committed.
    expect(result.current.stage).toBe('landed');
  });
});

// ─── 8. Geolocation unavailable ───────────────────────────────────────────────

describe('geolocation unavailable', () => {
  it('falls back gracefully when navigator.geolocation is undefined', () => {
    vi.stubGlobal('navigator', { geolocation: undefined });

    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [MEX_AIRPORT],
        fallbackStage:      'idle',
      }),
    );

    expect(result.current.isAcquiring).toBe(false);
    expect(result.current.stage).toBe('idle');
    expect(result.current.permissionDenied).toBe(false);
  });

  it('stays idle when airportCoordinates array is empty', () => {
    const { result } = renderHook(() =>
      useGeoArrivalDetector({
        cityCoordinates:    CDMX_CENTER,
        airportCoordinates: [],
      }),
    );

    expect(result.current.isAcquiring).toBe(false);
    expect(result.current.stage).toBe('idle');
  });
});
