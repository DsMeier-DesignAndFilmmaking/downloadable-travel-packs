// HADE Decision Engine
// Pure deterministic function — no side effects, no imports beyond the context type.
// Priority order is defined by the HADE_RULES array (lower number fires first).
// Adding a new signal type = adding a new rule object. The engine function body never changes.
// Returns 1–2 recommendations based on the first matching rule.

import type { HadeContext } from './context';

export type HadeRecommendation = {
  title: string;
  description: string;
  action: string;
};

// ─── Rule type ────────────────────────────────────────────────────────────────

export type HadeRule = {
  priority: number;                          // lower fires first
  id: string;                                // stable key for tests and debugging
  test: (ctx: HadeContext) => boolean;
  recs: HadeRecommendation[];
};

// ─── Recommendation tables ────────────────────────────────────────────────────

const DISPLACED_RECS: HadeRecommendation[] = [
  {
    title: 'Displacement Protocol Active',
    description: 'Your check-in window has shifted. Find somewhere secure to wait with your luggage before committing to any plans.',
    action: 'Find secure accommodation',
  },
  {
    title: 'Contact Support Channels',
    description: 'Reach your hotel, travel insurer, or booking platform now — delays are easier to resolve before they compound.',
    action: 'Access emergency contacts',
  },
];

const LANDED_RECS: HadeRecommendation[] = [
  {
    title: 'Move Efficiently',
    description: 'Skip unnecessary stops and get into the city quickly.',
    action: 'Check transport options',
  },
  {
    title: 'Skip the Exchange',
    description: "Currency exchange desks charge high fees. Use an ATM once you're in the city.",
    action: 'Find an ATM',
  },
];

const IN_TRANSIT_RECS: HadeRecommendation[] = [
  {
    title: 'You\'re En Route',
    description: 'Confirm your accommodation address and save it offline before you lose signal.',
    action: 'Save your address',
  },
  {
    title: 'First Stop: SIM or eSIM',
    description: 'Get local data before leaving the transit corridor — airport rates are better than city kiosks.',
    action: 'Check eSIM options',
  },
];

const CROWD_HEAVY_RECS: HadeRecommendation[] = [
  {
    title: 'Peak Pressure Zone',
    description: 'Current crowd density is high here. Side streets and 15 minutes of walking distance will change your experience significantly.',
    action: 'Find quieter routes',
  },
  {
    title: 'Protect Your Valuables',
    description: 'Dense crowds raise pickpocket risk. Keep bags in front, zip everything, and stay aware of your surroundings.',
    action: 'Review security posture',
  },
];

const UNHEALTHY_AQI_RECS: HadeRecommendation[] = [
  {
    title: 'Shift Indoors',
    description: 'Air quality is poor—opt for indoor spaces like cafés or museums.',
    action: 'Find indoor options',
  },
  {
    title: 'Avoid Open Areas',
    description: 'Transit-based movement is better today. Check conditions before heading out.',
    action: 'Plan a transit route',
  },
];

const TIME_OF_DAY_RECS: Record<HadeContext['timeOfDay'], HadeRecommendation[]> = {
  morning: [
    {
      title: 'Start Light',
      description: 'Pick one neighborhood and begin walking. Avoid overplanning.',
      action: 'Find a starting point',
    },
    {
      title: 'One Anchor',
      description: 'Choose a single spot to begin from. Let the walk decide the rest.',
      action: 'Choose your anchor',
    },
  ],
  afternoon: [
    {
      title: 'Slow the Pace',
      description: 'Midday heat and crowds peak now. Shift indoors or find somewhere to sit.',
      action: 'Find somewhere to sit',
    },
    {
      title: 'Eat Local',
      description: 'A nearby food stop is the right reset. Evenings are better for moving around.',
      action: 'Find a food spot',
    },
  ],
  evening: [
    {
      title: 'Go High-Energy',
      description: 'Social spaces and food streets are active now. Good time to explore.',
      action: 'Find active areas',
    },
  ],
  night: [
    {
      title: 'Stay Visible',
      description: 'Stick to well-lit, high-traffic areas. Know your route back.',
      action: 'Check safe areas',
    },
  ],
};

function applySignalWeight(
  recs: HadeRecommendation[],
  signalWeight: number | undefined
): HadeRecommendation[] {
  if (recs.length < 2) return [...recs];
  const weight = typeof signalWeight === 'number' ? signalWeight : 0;

  // Negative feedback biases toward alternate suggestions in the next cycle.
  if (weight < -0.15) {
    return [recs[1], recs[0], ...recs.slice(2)];
  }

  return [...recs];
}

// ─── Rule table ───────────────────────────────────────────────────────────────
// To add a new signal type: add a new HadeRule object here. Do not touch getHadeRecommendations.

export const HADE_RULES: HadeRule[] = [
  {
    priority: 0,
    id: 'user-displaced',
    test: (ctx) => ctx.userDisplaced === true,
    recs: DISPLACED_RECS,
  },
  {
    priority: 1,
    id: 'landed',
    test: (ctx) => ctx.arrivalStage === 'landed',
    recs: LANDED_RECS,
  },
  {
    priority: 2,
    id: 'in-transit',
    test: (ctx) => ctx.arrivalStage === 'in_transit',
    recs: IN_TRANSIT_RECS,
  },
  {
    priority: 3,
    id: 'crowd-heavy',
    test: (ctx) => ctx.crowdLevel === 'heavy',
    recs: CROWD_HEAVY_RECS,
  },
  {
    priority: 4,
    id: 'unhealthy-aqi',
    test: (ctx) => ctx.aqiLevel === 'unhealthy',
    recs: UNHEALTHY_AQI_RECS,
  },
  {
    priority: 5,
    id: 'time-of-day',
    test: () => true,                          // catch-all — always matches
    recs: [],                                  // populated dynamically in engine (time-of-day keyed)
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export function getHadeRecommendations(context: HadeContext): HadeRecommendation[] {
  const sorted = HADE_RULES.slice().sort((a, b) => a.priority - b.priority);
  const matched = sorted.find((rule) => rule.test(context));

  // The catch-all rule (priority 5) always matches but has empty recs —
  // resolve those dynamically from the TIME_OF_DAY_RECS table.
  if (!matched || matched.id === 'time-of-day') {
    return applySignalWeight(TIME_OF_DAY_RECS[context.timeOfDay], context.signalWeight);
  }

  return applySignalWeight(matched.recs, context.signalWeight);
}
