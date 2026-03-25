import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildHadeContext, resolveArrivalStage } from '../context';

// ─── resolveTimeOfDay (via buildHadeContext) ──────────────────────────────────

describe('resolveTimeOfDay', () => {
  const cases: Array<[number, 'morning' | 'afternoon' | 'evening' | 'night']> = [
    [5,  'morning'],
    [10, 'morning'],
    [11, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [23, 'night'],
    [0,  'night'],
    [4,  'night'],
  ];

  it.each(cases)('hour %i → %s', (hour, expected) => {
    vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0));
    const context = buildHadeContext({ slug: 'any-city', aqi: 0 });
    expect(context.timeOfDay).toBe(expected);
  });
});

// ─── resolveAqiLevel (via buildHadeContext) ───────────────────────────────────

describe('resolveAqiLevel', () => {
  const cases: Array<[number, 'good' | 'moderate' | 'unhealthy']> = [
    [0,   'good'],
    [50,  'good'],
    [51,  'moderate'],
    [100, 'moderate'],
    [101, 'unhealthy'],
    [200, 'unhealthy'],
    [500, 'unhealthy'],
  ];

  it.each(cases)('AQI %i → %s', (aqi, expected) => {
    const context = buildHadeContext({ slug: 'any-city', aqi });
    expect(context.aqiLevel).toBe(expected);
  });
});

// ─── resolveArrivalStage ─────────────────────────────────────────────────────

describe('resolveArrivalStage', () => {
  const slug = 'bangkok-thailand';
  const key = `landed_${slug}`;

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns exploring when key is absent', () => {
    expect(resolveArrivalStage(slug)).toBe('exploring');
  });

  it('returns landed for entry-immigration', () => {
    localStorage.setItem(key, 'entry-immigration');
    expect(resolveArrivalStage(slug)).toBe('landed');
  });

  it('returns landed for airport-exit', () => {
    localStorage.setItem(key, 'airport-exit');
    expect(resolveArrivalStage(slug)).toBe('landed');
  });

  it('returns in_transit for left-airport', () => {
    localStorage.setItem(key, 'left-airport');
    expect(resolveArrivalStage(slug)).toBe('in_transit');
  });

  it('returns exploring for unknown stored value', () => {
    localStorage.setItem(key, 'some-future-stage');
    expect(resolveArrivalStage(slug)).toBe('exploring');
  });
});

// ─── buildHadeContext — AQI resolution priority ───────────────────────────────

describe('buildHadeContext AQI priority', () => {
  const slug = 'paris-france';
  const cacheKey = `env-impact-cache-v1-${slug}`;

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('uses explicit aqi prop over cache', () => {
    localStorage.setItem(cacheKey, JSON.stringify({ report: { aqiValue: 200 }, savedAt: Date.now() }));
    const context = buildHadeContext({ slug, aqi: 30 });
    expect(context.aqiLevel).toBe('good');
  });

  it('falls back to localStorage cache when aqi prop is null', () => {
    localStorage.setItem(cacheKey, JSON.stringify({ report: { aqiValue: 160 }, savedAt: Date.now() }));
    const context = buildHadeContext({ slug, aqi: null });
    expect(context.aqiLevel).toBe('unhealthy');
  });

  it('falls back to good (0) when aqi prop is null and cache is empty', () => {
    const context = buildHadeContext({ slug, aqi: null });
    expect(context.aqiLevel).toBe('good');
  });

  it('uses explicit arrivalStage prop over localStorage', () => {
    localStorage.setItem(`landed_${slug}`, 'left-airport');
    const context = buildHadeContext({ slug, aqi: 0, arrivalStage: 'landed' });
    expect(context.arrivalStage).toBe('landed');
  });
});
