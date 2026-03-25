// HADE Decision Engine
// Pure deterministic function — no side effects, no imports beyond the context type.
// Priority order: arrival stage → AQI → time of day.
// Returns 1–2 recommendations based on context priority.

import type { HadeContext } from './context';

export type HadeRecommendation = {
  title: string;
  description: string;
  action: string;
};

// ─── Recommendation tables ────────────────────────────────────────────────────

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

// ─── Engine ───────────────────────────────────────────────────────────────────

export function getHadeRecommendations(context: HadeContext): HadeRecommendation[] {
  let recs: HadeRecommendation[];

  // Priority 1: user has just landed — airport-exit guidance takes precedence
  if (context.arrivalStage === 'landed') {
    recs = [...LANDED_RECS];
  // Priority 2: user is en route from airport to accommodation
  } else if (context.arrivalStage === 'in_transit') {
    recs = [...IN_TRANSIT_RECS];
  // Priority 3: poor air quality — override time-based logic with indoor guidance
  } else if (context.aqiLevel === 'unhealthy') {
    recs = [...UNHEALTHY_AQI_RECS];
  // Priority 4: time-of-day fallback — always has a match (exhaustive record)
  } else {
    recs = [...TIME_OF_DAY_RECS[context.timeOfDay]];
  }

  return recs;
}
