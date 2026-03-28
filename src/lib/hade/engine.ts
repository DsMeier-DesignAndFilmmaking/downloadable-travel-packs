// HADE Decision Engine
// Pure deterministic function — no side effects, no imports beyond the context type.
// Priority order is defined by the HADE_RULES array (lower number fires first).
// Adding a new signal type = adding a new rule object. The engine function body never changes.
// Returns 1–2 recommendations based on the first matching rule.

import type { HadeContext } from './context';
import type { CityPackNeighborhood, TravelerProfile, SectionType } from '@/types/cityPack';
import { haversineMeters } from '@/lib/geo';

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

// ─── Explored-nodes awareness ─────────────────────────────────────────────────

const EXPLORED_NODES_KEY = 'explored-nodes-v1';

function readExploredSubNodes(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPLORED_NODES_KEY);
    if (!raw) return new Set();
    const entries = JSON.parse(raw) as Array<{ subNode: string }>;
    return new Set(entries.map((e) => e.subNode));
  } catch {
    return new Set();
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function getHadeRecommendations(
  context: HadeContext,
  candidateSubNode?: string,
): HadeRecommendation[] {
  const sorted = HADE_RULES.slice().sort((a, b) => a.priority - b.priority);
  const matched = sorted.find((rule) => rule.test(context));

  // The catch-all rule (priority 5) always matches but has empty recs —
  // resolve those dynamically from the TIME_OF_DAY_RECS table.
  let recs: HadeRecommendation[];
  if (!matched || matched.id === 'time-of-day') {
    recs = applySignalWeight(TIME_OF_DAY_RECS[context.timeOfDay], context.signalWeight);
  } else {
    recs = applySignalWeight(matched.recs, context.signalWeight);
  }

  // De-weight if the candidate neighbourhood has already been explored.
  if (candidateSubNode && recs.length >= 2) {
    const explored = readExploredSubNodes();
    if (explored.has(candidateSubNode)) {
      recs = [recs[1], recs[0], ...recs.slice(2)];
    }
  }

  return recs;
}

// ─── Pivot Scanner ─────────────────────────────────────────────────────────────

export type PivotRiskLevel = 'safe' | 'caution' | 'high-risk' | 'high-crowd';

export interface SafeAlternative {
  type: 'safe-haven' | 'quiet-zone';
  name: string;
  safetyScore: number;
  vibe: string;
}

export interface PivotScanInput {
  gps: { lat: number; lng: number };
  neighborhoods: CityPackNeighborhood[];
  hadeContext: HadeContext;
  /**
   * Pre-geocoded coordinates for each neighborhood name.
   * Supplied by the hook after async geocoding + localStorage caching.
   * If omitted, nearest-neighbor falls back to the highest-safetyScore neighborhood.
   */
  neighborhoodCoords?: Record<string, { lat: number; lng: number }>;
}

export interface PivotScanResult {
  nearestNeighborhood: CityPackNeighborhood;
  /** Composite Safety & Vibe score, clamped to 0–10. */
  compositeScore: number;
  riskLevel: PivotRiskLevel;
  /** Non-null when timeOfDay === 'night' && nearestNeighborhood.safetyScore < 7. */
  warning: string | null;
  /** Auto-surfaced on 'high-risk' or 'high-crowd' — the agentic pivot suggestion. */
  safeAlternative: SafeAlternative | null;
}

// AQI score penalties applied to the composite score.
const AQI_PENALTY: Record<HadeContext['aqiLevel'], number> = {
  good: 0, moderate: 1, unhealthy: 2, unknown: 0,
};

// Vibe keywords that identify a quiet/residential neighborhood.
const QUIET_KEYWORDS = ['quiet', 'calm', 'residential', 'peaceful', 'local'];

/**
 * Pivot Scanner — pure, synchronous, deterministic.
 *
 * 1. Identifies the nearest neighborhood (by haversine if coords are supplied,
 *    otherwise falls back to the highest-safetyScore neighborhood).
 * 2. Computes a composite Safety & Vibe score from safetyScore, AQI, timeOfDay,
 *    and crowdLevel.
 * 3. Derives a risk level and optional 'Proceed with Caution' warning.
 * 4. Agentically surfaces the nearest Safe Haven or Quiet Zone when the result
 *    is 'high-risk' or 'high-crowd'.
 *
 * All async work (GPS, geocoding, caching) is handled by usePivotScanner.
 */
export function scanCurrentLocation(input: PivotScanInput): PivotScanResult {
  const { gps, neighborhoods, hadeContext, neighborhoodCoords } = input;

  if (neighborhoods.length === 0) {
    throw new Error('[HADE Pivot] No neighborhoods available for this city pack.');
  }

  // ── 1. Identify nearest neighborhood ──────────────────────────────────────

  let nearest: CityPackNeighborhood;

  if (neighborhoodCoords && Object.keys(neighborhoodCoords).length > 0) {
    // Use haversine distance against pre-geocoded coords.
    nearest = neighborhoods.reduce((best, n) => {
      const nc = neighborhoodCoords[n.name];
      const bc = neighborhoodCoords[best.name];
      if (!nc) return best;
      if (!bc) return n;
      const dN = haversineMeters(gps.lat, gps.lng, nc.lat, nc.lng);
      const dB = haversineMeters(gps.lat, gps.lng, bc.lat, bc.lng);
      return dN < dB ? n : best;
    });
  } else {
    // Geocoding not yet complete — fall back to the safest neighborhood.
    nearest = neighborhoods.reduce((best, n) =>
      n.safetyScore > best.safetyScore ? n : best,
    );
  }

  // ── 2. Composite Safety & Vibe score ─────────────────────────────────────
  //
  //   compositeScore = safetyScore
  //                  − aqiPenalty   (good=0, moderate=1, unhealthy=2, unknown=0)
  //                  − timePenalty  (night=1, else=0)
  //                  − crowdPenalty (heavy=1, else=0)
  //   Clamped to [0, 10].

  const aqiPenalty   = AQI_PENALTY[hadeContext.aqiLevel];
  const timePenalty  = hadeContext.timeOfDay === 'night' ? 1 : 0;
  const crowdPenalty = hadeContext.crowdLevel === 'heavy' ? 1 : 0;

  const compositeScore = Math.min(
    10,
    Math.max(0, nearest.safetyScore - aqiPenalty - timePenalty - crowdPenalty),
  );

  // ── 3. Risk level ─────────────────────────────────────────────────────────

  let riskLevel: PivotRiskLevel;
  if (compositeScore < 5) {
    riskLevel = 'high-risk';
  } else if (hadeContext.crowdLevel === 'heavy') {
    riskLevel = 'high-crowd';
  } else if (compositeScore <= 6) {
    riskLevel = 'caution';
  } else {
    riskLevel = 'safe';
  }

  // ── 4. Warning ────────────────────────────────────────────────────────────

  const warning =
    hadeContext.timeOfDay === 'night' && nearest.safetyScore < 7
      ? 'Proceed with Caution'
      : null;

  // ── 5. Agentic safe alternative ───────────────────────────────────────────

  const others = neighborhoods.filter((n) => n.name !== nearest.name);
  let safeAlternative: SafeAlternative | null = null;

  if (riskLevel === 'high-risk' && others.length > 0) {
    const haven = others.reduce((best, n) =>
      n.safetyScore > best.safetyScore ? n : best,
    );
    safeAlternative = {
      type: 'safe-haven',
      name: haven.name,
      safetyScore: haven.safetyScore,
      vibe: haven.vibe,
    };
  } else if (riskLevel === 'high-crowd' && others.length > 0) {
    const quietZone =
      others.find((n) =>
        QUIET_KEYWORDS.some((kw) => n.vibe.toLowerCase().includes(kw)),
      ) ?? others.reduce((best, n) => (n.safetyScore > best.safetyScore ? n : best));
    safeAlternative = {
      type: 'quiet-zone',
      name: quietZone.name,
      safetyScore: quietZone.safetyScore,
      vibe: quietZone.vibe,
    };
  }

  return { nearestNeighborhood: nearest, compositeScore, riskLevel, warning, safeAlternative };
}

// ─── Section Priority ──────────────────────────────────────────────────────────

/**
 * getSectionPriority
 *
 * Returns a numeric priority for a given city-guide section, adjusted by the
 * traveler profile in HadeContext. Higher number = shown/weighted first.
 * Base priority for all sections is 0; profile bonuses are additive.
 *
 * SalvagedStay:  accommodations +5, history +5
 * Foodie:        food +5
 * Wellness:      wellness +5
 * Adventure:     adventure +5
 * Regenerative:  neighborhoods +3 (eco-filter handled separately)
 */
export function getSectionPriority(
  section: SectionType,
  context: HadeContext,
): number {
  const profile = context.profile;
  let priority = 0;

  if (!profile) return priority;

  const PROFILE_BOOSTS: Partial<Record<TravelerProfile, Partial<Record<SectionType, number>>>> = {
    SalvagedStay:  { accommodations: 5, history: 5 },
    Foodie:        { food: 5 },
    Wellness:      { wellness: 5 },
    Adventure:     { adventure: 5 },
    Regenerative:  { neighborhoods: 3 },
  };

  priority += PROFILE_BOOSTS[profile]?.[section] ?? 0;
  return priority;
}

// ─── Neighborhood Filter ───────────────────────────────────────────────────────

/**
 * filterNeighborhoods
 *
 * Returns a filtered copy of the neighborhoods array based on the active
 * traveler profile. Never mutates the input array.
 *
 * Regenerative: only neighborhoods with eco_score > 8.
 *   If no neighborhoods have eco_score defined (legacy data), returns all
 *   neighborhoods unfiltered so the UI never shows an empty list.
 *
 * All other profiles: returns the array unchanged.
 */
export function filterNeighborhoods(
  neighborhoods: CityPackNeighborhood[],
  profile: TravelerProfile | undefined,
): CityPackNeighborhood[] {
  if (profile !== 'Regenerative') return neighborhoods;

  const ecoFiltered = neighborhoods.filter(
    (n) => typeof n.eco_score === 'number' && n.eco_score > 8,
  );

  // Graceful fallback: if no neighborhoods carry eco_score data, return all.
  return ecoFiltered.length > 0 ? ecoFiltered : neighborhoods;
}
