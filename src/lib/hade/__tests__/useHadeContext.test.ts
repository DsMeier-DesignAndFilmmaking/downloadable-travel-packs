import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHadeContext } from '../useHadeContext';

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => store[k] ?? null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = String(v); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((k) => { delete store[k]; });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Initialization ───────────────────────────────────────────────────────────

describe('initialization', () => {
  it('returns a valid HadeContext on first render', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    const { context } = result.current;
    expect(['morning', 'afternoon', 'evening', 'night']).toContain(context.timeOfDay);
    expect(['good', 'moderate', 'unhealthy', 'unknown']).toContain(context.aqiLevel);
    expect(['landed', 'in_transit', 'exploring']).toContain(context.arrivalStage);
  });

  it('initializes arrivalStage as exploring when no localStorage key exists', () => {
    const { result } = renderHook(() => useHadeContext('paris-france'));
    expect(result.current.context.arrivalStage).toBe('exploring');
  });

  it('seeds arrivalStage from existing localStorage on mount', () => {
    store['landed_okinawa-japan'] = 'left-airport';
    const { result } = renderHook(() => useHadeContext('okinawa-japan'));
    expect(result.current.context.arrivalStage).toBe('in_transit');
  });

  it('isDisplaced is false on initialization', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    expect(result.current.isDisplaced).toBe(false);
  });

  it('timeWindowMinutes is undefined on initialization', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    expect(result.current.timeWindowMinutes).toBeUndefined();
  });
});

// ─── setArrivalStage ─────────────────────────────────────────────────────────

describe('setArrivalStage', () => {
  it('maps entry-immigration → landed in context', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('entry-immigration'));
    expect(result.current.context.arrivalStage).toBe('landed');
  });

  it('maps airport-exit → landed in context', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('airport-exit'));
    expect(result.current.context.arrivalStage).toBe('landed');
  });

  it('maps left-airport → in_transit in context', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('left-airport'));
    expect(result.current.context.arrivalStage).toBe('in_transit');
  });

  it('maps pre-arrival → exploring in context', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('left-airport'));
    act(() => result.current.setArrivalStage('pre-arrival'));
    expect(result.current.context.arrivalStage).toBe('exploring');
  });

  it('writes the raw UI stage value to localStorage', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('airport-exit'));
    expect(store['landed_bangkok-thailand']).toBe('airport-exit');
  });

  it('removes the localStorage key when resetting to pre-arrival', () => {
    store['landed_bangkok-thailand'] = 'left-airport';
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setArrivalStage('pre-arrival'));
    expect(store['landed_bangkok-thailand']).toBeUndefined();
  });
});

// ─── setCrowdLevel ────────────────────────────────────────────────────────────

describe('setCrowdLevel', () => {
  it('updates context.crowdLevel to heavy', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setCrowdLevel('heavy'));
    expect(result.current.context.crowdLevel).toBe('heavy');
  });

  it('updates context.crowdLevel to light', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setCrowdLevel('light'));
    expect(result.current.context.crowdLevel).toBe('light');
  });

  it('can clear crowdLevel by setting undefined', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setCrowdLevel('heavy'));
    act(() => result.current.setCrowdLevel(undefined));
    expect(result.current.context.crowdLevel).toBeUndefined();
  });
});

// ─── setAccommodationStatus ───────────────────────────────────────────────────

describe('setAccommodationStatus', () => {
  it('sets accommodationStatus to delayed', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAccommodationStatus('delayed'));
    expect(result.current.context.accommodationStatus).toBe('delayed');
  });

  it('derives isDisplaced = true when accommodationStatus is delayed', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAccommodationStatus('delayed'));
    expect(result.current.isDisplaced).toBe(true);
    expect(result.current.context.userDisplaced).toBe(true);
  });

  it('derives isDisplaced = false when accommodationStatus is checked-in', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAccommodationStatus('delayed'));
    act(() => result.current.setAccommodationStatus('checked-in'));
    expect(result.current.isDisplaced).toBe(false);
    expect(result.current.context.userDisplaced).toBe(false);
  });
});

// ─── setLocalEventFlag ────────────────────────────────────────────────────────

describe('setLocalEventFlag', () => {
  it('sets a local event flag string', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setLocalEventFlag('festival'));
    expect(result.current.context.localEventFlag).toBe('festival');
  });

  it('clears the flag when set to null', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setLocalEventFlag('festival'));
    act(() => result.current.setLocalEventFlag(null));
    expect(result.current.context.localEventFlag).toBeNull();
  });
});

// ─── setAqi ───────────────────────────────────────────────────────────────────

describe('setAqi', () => {
  it('converts AQI 0–50 to good', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAqi(42));
    expect(result.current.context.aqiLevel).toBe('good');
  });

  it('converts AQI 51–100 to moderate', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAqi(88));
    expect(result.current.context.aqiLevel).toBe('moderate');
  });

  it('converts AQI > 100 to unhealthy', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAqi(145));
    expect(result.current.context.aqiLevel).toBe('unhealthy');
  });

  it('converts boundary AQI 50 to good', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAqi(50));
    expect(result.current.context.aqiLevel).toBe('good');
  });

  it('converts boundary AQI 101 to unhealthy', () => {
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    act(() => result.current.setAqi(101));
    expect(result.current.context.aqiLevel).toBe('unhealthy');
  });
});

// ─── Offline / missing data safety ───────────────────────────────────────────

describe('offline safety', () => {
  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useHadeContext('bangkok-thailand'));
    expect(() => {
      act(() => result.current.setArrivalStage('airport-exit'));
    }).not.toThrow();
    // React state should still update even when localStorage fails
    expect(result.current.context.arrivalStage).toBe('landed');
  });
});
