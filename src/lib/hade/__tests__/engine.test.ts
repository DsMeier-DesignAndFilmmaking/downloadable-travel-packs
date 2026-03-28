import { describe, it, expect } from 'vitest';
import { getHadeRecommendations } from '../engine';
import type { HadeContext } from '../context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<HadeContext> = {}): HadeContext {
  return {
    timeOfDay: 'morning',
    aqiLevel: 'good',
    arrivalStage: 'exploring',
    ...overrides,
  };
}

// ─── Priority 1: landed ───────────────────────────────────────────────────────

describe('Priority 1 — landed stage', () => {
  it('returns LANDED_RECS when arrivalStage is landed regardless of AQI', () => {
    const recs = getHadeRecommendations(ctx({ arrivalStage: 'landed', aqiLevel: 'unhealthy' }));
    expect(recs[0].title).toBe('Move Efficiently');
    expect(recs[1].title).toBe('Skip the Exchange');
  });

  it('returns LANDED_RECS even when AQI is unhealthy', () => {
    const recs = getHadeRecommendations(ctx({ arrivalStage: 'landed', aqiLevel: 'unhealthy' }));
    expect(recs).toHaveLength(2);
    expect(recs[0].title).toBe('Move Efficiently');
  });

  it('returns LANDED_RECS at every time of day', () => {
    const times: HadeContext['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'night'];
    for (const timeOfDay of times) {
      const recs = getHadeRecommendations(ctx({ arrivalStage: 'landed', timeOfDay }));
      expect(recs[0].title).toBe('Move Efficiently');
    }
  });
});

// ─── Priority 2: unhealthy AQI ────────────────────────────────────────────────

describe('Priority 2 — unhealthy AQI', () => {
  it('returns UNHEALTHY_AQI_RECS when not landed but AQI is unhealthy', () => {
    const recs = getHadeRecommendations(ctx({ aqiLevel: 'unhealthy', arrivalStage: 'exploring' }));
    expect(recs[0].title).toBe('Shift Indoors');
    expect(recs[1].title).toBe('Avoid Open Areas');
  });

  it('in_transit stage beats unhealthy AQI — shows en-route recs not indoor recs', () => {
    const recs = getHadeRecommendations(ctx({ aqiLevel: 'unhealthy', arrivalStage: 'in_transit' }));
    expect(recs[0].title).toBe("You're En Route");
  });
});

// ─── Priority 3: time of day ──────────────────────────────────────────────────

describe('Priority 3 — time of day fallback', () => {
  it('morning with good AQI returns morning recs', () => {
    const recs = getHadeRecommendations(ctx({ timeOfDay: 'morning', aqiLevel: 'good' }));
    expect(recs[0].title).toBe('Start Light');
    expect(recs[1].title).toBe('One Anchor');
  });

  it('afternoon with good AQI returns afternoon recs', () => {
    const recs = getHadeRecommendations(ctx({ timeOfDay: 'afternoon', aqiLevel: 'good' }));
    expect(recs[0].title).toBe('Slow the Pace');
    expect(recs[1].title).toBe('Eat Local');
  });

  it('evening with good AQI returns evening recs', () => {
    const recs = getHadeRecommendations(ctx({ timeOfDay: 'evening', aqiLevel: 'good' }));
    expect(recs[0].title).toBe('Go High-Energy');
  });

  it('night with good AQI returns night recs', () => {
    const recs = getHadeRecommendations(ctx({ timeOfDay: 'night', aqiLevel: 'good' }));
    expect(recs[0].title).toBe('Stay Visible');
  });

  it('moderate AQI falls through to time-of-day recs', () => {
    const recs = getHadeRecommendations(ctx({ timeOfDay: 'morning', aqiLevel: 'moderate' }));
    expect(recs[0].title).toBe('Start Light');
  });
});

// ─── Priority 0: userDisplaced ────────────────────────────────────────────────

describe('Priority 0 — userDisplaced', () => {
  it('returns DISPLACED_RECS when userDisplaced is true, regardless of arrivalStage', () => {
    const recs = getHadeRecommendations(ctx({ userDisplaced: true, arrivalStage: 'landed' }));
    expect(recs[0].title).toBe('Displacement Protocol Active');
    expect(recs[1].title).toBe('Contact Support Channels');
  });

  it('returns DISPLACED_RECS when userDisplaced is true, overriding unhealthy AQI', () => {
    const recs = getHadeRecommendations(ctx({ userDisplaced: true, aqiLevel: 'unhealthy' }));
    expect(recs[0].title).toBe('Displacement Protocol Active');
  });

  it('does NOT fire when userDisplaced is false', () => {
    const recs = getHadeRecommendations(ctx({ userDisplaced: false, arrivalStage: 'exploring', aqiLevel: 'good', timeOfDay: 'morning' }));
    expect(recs[0].title).toBe('Start Light');
  });

  it('does NOT fire when userDisplaced is undefined', () => {
    const recs = getHadeRecommendations(ctx({ arrivalStage: 'exploring', aqiLevel: 'good', timeOfDay: 'morning' }));
    expect(recs[0].title).toBe('Start Light');
  });
});

// ─── Priority 3: crowd-heavy ──────────────────────────────────────────────────

describe('Priority 3 — crowd-heavy', () => {
  it('returns CROWD_HEAVY_RECS when crowdLevel is heavy and stage is exploring', () => {
    const recs = getHadeRecommendations(ctx({ crowdLevel: 'heavy', arrivalStage: 'exploring' }));
    expect(recs[0].title).toBe('Peak Pressure Zone');
    expect(recs[1].title).toBe('Protect Your Valuables');
  });

  it('landed stage (priority 1) beats crowd-heavy (priority 3)', () => {
    const recs = getHadeRecommendations(ctx({ crowdLevel: 'heavy', arrivalStage: 'landed' }));
    expect(recs[0].title).toBe('Move Efficiently');
  });

  it('crowd-heavy beats unhealthy AQI (priority 4)', () => {
    const recs = getHadeRecommendations(ctx({ crowdLevel: 'heavy', aqiLevel: 'unhealthy', arrivalStage: 'exploring' }));
    expect(recs[0].title).toBe('Peak Pressure Zone');
  });

  it('does NOT fire when crowdLevel is moderate', () => {
    const recs = getHadeRecommendations(ctx({ crowdLevel: 'moderate', arrivalStage: 'exploring', aqiLevel: 'good', timeOfDay: 'morning' }));
    expect(recs[0].title).toBe('Start Light');
  });

  it('does NOT fire when crowdLevel is undefined', () => {
    const recs = getHadeRecommendations(ctx({ arrivalStage: 'exploring', aqiLevel: 'good', timeOfDay: 'evening' }));
    expect(recs[0].title).toBe('Go High-Energy');
  });
});

// ─── Shape integrity ──────────────────────────────────────────────────────────

describe('Recommendation shape', () => {
  const allContexts: HadeContext[] = [
    ctx({ arrivalStage: 'landed' }),
    ctx({ aqiLevel: 'unhealthy' }),
    ctx({ timeOfDay: 'morning' }),
    ctx({ timeOfDay: 'afternoon' }),
    ctx({ timeOfDay: 'evening' }),
    ctx({ timeOfDay: 'night' }),
  ];

  it.each(allContexts)('every rec has title, description, and action ($arrivalStage/$aqiLevel/$timeOfDay)', (context) => {
    const recs = getHadeRecommendations(context);
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(typeof rec.title).toBe('string');
      expect(rec.title.length).toBeGreaterThan(0);
      expect(typeof rec.description).toBe('string');
      expect(rec.description.length).toBeGreaterThan(0);
      expect(typeof rec.action).toBe('string');
      expect(rec.action.length).toBeGreaterThan(0);
    }
  });
});
