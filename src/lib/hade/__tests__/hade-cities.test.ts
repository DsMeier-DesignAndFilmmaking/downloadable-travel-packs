/**
 * HADE Engine — Per-City Integration Tests
 *
 * For each city pack we verify:
 *   1. The environmental impact cache is read correctly by buildHadeContext
 *   2. The AQI value maps to the right aqiLevel band
 *   3. The arrival stage is resolved correctly from localStorage
 *   4. getHadeRecommendations returns valid, non-empty output given realistic
 *      AQI data for that city's typical air quality conditions
 *   5. The HADE card output (title, description, action) is non-empty
 *      and meaningful for the resolved context
 *
 * AQI baselines used are representative annual averages derived from
 * Google Air Quality / IQAir city data (not live — deterministic for tests).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildHadeContext } from '../context';
import { getHadeRecommendations } from '../engine';

// ─── City fixture type ────────────────────────────────────────────────────────

type CityFixture = {
  slug: string;
  name: string;
  typicalAqi: number;           // representative annual AQI baseline
  expectedAqiLevel: 'good' | 'moderate' | 'unhealthy';
  coordinates: { lat: number; lng: number };
};

// ─── City fixtures ────────────────────────────────────────────────────────────
// AQI baselines sourced from IQAir World Air Quality Report 2024 + Google AQI
// Bangkok:      ~100  (pm2.5 heavy, rainy season varies)
// Paris:        ~35   (generally good, occasional peaks)
// London:       ~40   (mild, mostly good)
// Tokyo:        ~45   (clean, monitored tightly)
// New York:     ~48   (EPA good range)
// Rome:         ~55   (moderate, traffic-heavy centre)
// Barcelona:    ~52   (moderate, coastal helps)
// Dubai:        ~95   (dust, construction — edges of moderate)
// Seoul:        ~85   (yellow dust events push moderate)
// Mexico City:  ~110  (altitude + traffic → unhealthy on avg)

const CITY_FIXTURES: CityFixture[] = [
  { slug: 'bangkok-thailand',    name: 'Bangkok',     typicalAqi: 100, expectedAqiLevel: 'moderate',  coordinates: { lat: 13.7563,  lng: 100.5018 } },
  { slug: 'paris-france',        name: 'Paris',       typicalAqi: 35,  expectedAqiLevel: 'good',       coordinates: { lat: 48.8566,  lng: 2.3522   } },
  { slug: 'london-uk',           name: 'London',      typicalAqi: 40,  expectedAqiLevel: 'good',       coordinates: { lat: 51.5072,  lng: -0.1276  } },
  { slug: 'tokyo-japan',         name: 'Tokyo',       typicalAqi: 45,  expectedAqiLevel: 'good',       coordinates: { lat: 35.6762,  lng: 139.6503 } },
  { slug: 'new-york-us',         name: 'New York',    typicalAqi: 48,  expectedAqiLevel: 'good',       coordinates: { lat: 40.7128,  lng: -74.006  } },
  { slug: 'rome-italy',          name: 'Rome',        typicalAqi: 55,  expectedAqiLevel: 'moderate',   coordinates: { lat: 41.9028,  lng: 12.4964  } },
  { slug: 'barcelona-spain',     name: 'Barcelona',   typicalAqi: 52,  expectedAqiLevel: 'moderate',   coordinates: { lat: 41.3874,  lng: 2.1686   } },
  { slug: 'dubai-uae',           name: 'Dubai',       typicalAqi: 95,  expectedAqiLevel: 'moderate',   coordinates: { lat: 25.2048,  lng: 55.2708  } },
  { slug: 'seoul-south-korea',   name: 'Seoul',       typicalAqi: 85,  expectedAqiLevel: 'moderate',   coordinates: { lat: 37.5665,  lng: 126.978  } },
  { slug: 'mexico-city-mexico',  name: 'Mexico City', typicalAqi: 110, expectedAqiLevel: 'unhealthy',  coordinates: { lat: 19.4326,  lng: -99.1332 } },
];

// ─── Cache helpers ────────────────────────────────────────────────────────────

function seedAqiCache(slug: string, aqiValue: number) {
  const key = `env-impact-cache-v1-${slug}`;
  localStorage.setItem(key, JSON.stringify({
    report: {
      cityId: slug,
      cityLabel: slug,
      aqiValue,
      aqiCategory: aqiValue <= 50 ? 'Good' : aqiValue <= 100 ? 'Moderate' : 'Unhealthy',
      aqiTrend: 'stable',
      dominantPollutant: 'pm25',
      pollutants: [],
      googleHealthAdvice: '',
      pollenTreeBand: 'Low',
      pollenGrassBand: 'Low',
      pollenWeedBand: 'None',
      highestPollenThreat: 'Tree pollen (Low)',
      overtourismIndex: 5,
      overtourismLabel: 'Moderate',
      primaryStress: 'air',
      neighbourhoodRetentionPct: 60,
      currentConditionsSummary: 'Test conditions',
      whatYouCanDo: ['Use public transport'],
      howItHelps: 'Test help text',
      isLive: false,
      sourceRefs: ['Test fixture'],
      fetchedAt: new Date().toISOString(),
    },
    savedAt: Date.now(),
  }));
}

function seedArrivalStage(slug: string, value: string | null) {
  if (value === null) {
    localStorage.removeItem(`landed_${slug}`);
  } else {
    localStorage.setItem(`landed_${slug}`, value);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HADE engine — per-city integration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  // ── 1. AQI cache read + level mapping ──────────────────────────────────────

  describe('AQI level mapping from env-impact cache', () => {
    it.each(CITY_FIXTURES)(
      '$name ($slug) — AQI $typicalAqi maps to $expectedAqiLevel',
      ({ slug, typicalAqi, expectedAqiLevel }) => {
        seedAqiCache(slug, typicalAqi);
        const context = buildHadeContext({ slug, aqi: null });
        expect(context.aqiLevel).toBe(expectedAqiLevel);
      },
    );
  });

  // ── 2. Arrival stage resolution per city ──────────────────────────────────

  describe('Arrival stage resolution per city slug', () => {
    const arrivalCases: Array<{ stored: string | null; expected: 'landed' | 'in_transit' | 'exploring' }> = [
      { stored: null,               expected: 'exploring'  },
      { stored: 'entry-immigration', expected: 'landed'    },
      { stored: 'airport-exit',      expected: 'landed'    },
      { stored: 'left-airport',      expected: 'in_transit'},
    ];

    for (const { stored, expected } of arrivalCases) {
      it.each(CITY_FIXTURES)(
        `$name: stored="${stored ?? 'null'}" → arrivalStage="${expected}"`,
        ({ slug }) => {
          seedArrivalStage(slug, stored);
          const context = buildHadeContext({ slug, aqi: null });
          expect(context.arrivalStage).toBe(expected);
        },
      );
    }
  });

  // ── 3. Recommendations are non-empty for every city + stage combo ─────────

  describe('Recommendations — non-empty for all cities across all stages', () => {
    const stages = ['exploring', 'landed', 'in_transit'] as const;

    it.each(CITY_FIXTURES)(
      '$name — produces recommendations for each arrival stage',
      ({ slug, typicalAqi }) => {
        seedAqiCache(slug, typicalAqi);
        for (const stage of stages) {
          const context = buildHadeContext({ slug, aqi: null, arrivalStage: stage });
          const recs = getHadeRecommendations(context);
          expect(recs.length, `${slug} stage=${stage}`).toBeGreaterThan(0);
          expect(recs.length).toBeLessThanOrEqual(2);
        }
      },
    );
  });

  // ── 3b. in_transit produces dedicated en-route content ────────────────────

  describe('in_transit — dedicated en-route content (not time-of-day fallback)', () => {
    it.each(CITY_FIXTURES)(
      '$name: in_transit → "You\'re En Route"',
      ({ slug }) => {
        const context = buildHadeContext({ slug, aqi: null, arrivalStage: 'in_transit' });
        const recs = getHadeRecommendations(context);
        expect(recs[0].title).toBe("You're En Route");
      },
    );
  });

  // ── 4. Landed stage always surfaces airport-exit recs ─────────────────────

  describe('Landed stage — airport-exit guidance for all cities', () => {
    it.each(CITY_FIXTURES)('$name: landed → "Move Efficiently" and "Skip the Exchange"', ({ slug }) => {
      seedArrivalStage(slug, 'airport-exit');
      const context = buildHadeContext({ slug, aqi: null });
      const recs = getHadeRecommendations(context);
      expect(recs[0].title).toBe('Move Efficiently');
      expect(recs[1].title).toBe('Skip the Exchange');
    });
  });

  // ── 5. Bad air cities produce indoor shift recommendations ────────────────

  describe('High-AQI cities — indoor guidance when air is unhealthy', () => {
    const highAqiCities = CITY_FIXTURES.filter(c => c.expectedAqiLevel === 'unhealthy');

    it.each(highAqiCities)(
      '$name (AQI $typicalAqi) — exploring stage → indoor shift recs',
      ({ slug, typicalAqi }) => {
        seedAqiCache(slug, typicalAqi);
        const context = buildHadeContext({ slug, aqi: null, arrivalStage: 'exploring' });
        expect(context.aqiLevel).toBe('unhealthy');
        const recs = getHadeRecommendations(context);
        expect(recs[0].title).toBe('Shift Indoors');
        expect(recs[1].title).toBe('Avoid Open Areas');
      },
    );
  });

  // ── 6. Recommendation field completeness for all cities ───────────────────

  describe('Recommendation field completeness', () => {
    it.each(CITY_FIXTURES)(
      '$name — all recommendations have populated title, description, and action',
      ({ slug, typicalAqi }) => {
        seedAqiCache(slug, typicalAqi);
        const context = buildHadeContext({ slug, aqi: null });
        const recs = getHadeRecommendations(context);
        for (const rec of recs) {
          expect(rec.title,       `${slug} rec.title`).toBeTruthy();
          expect(rec.description, `${slug} rec.description`).toBeTruthy();
          expect(rec.action,      `${slug} rec.action`).toBeTruthy();
        }
      },
    );
  });

  // ── 7. Cache TTL — expired cache falls back to unknown (no data) ─────────

  describe('Expired AQI cache falls back to unknown', () => {
    it.each(CITY_FIXTURES)(
      '$name — expired cache behaves like no cache (aqiLevel = unknown)',
      ({ slug }) => {
        const key = `env-impact-cache-v1-${slug}`;
        // savedAt set 31 minutes ago (TTL is 30 min)
        localStorage.setItem(key, JSON.stringify({
          report: { aqiValue: 200 },
          savedAt: Date.now() - 31 * 60 * 1000,
        }));
        const context = buildHadeContext({ slug, aqi: null });
        expect(context.aqiLevel).toBe('unknown');
      },
    );
  });
});
