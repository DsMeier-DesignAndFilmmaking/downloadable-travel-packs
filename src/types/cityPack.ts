/**
 * 2026 Superior Schema — CityGuide (Travel Pack) types.
 * CityPack is an alias for backward-compatible imports.
 */

/** Emergency: required fields + optional extras. */
export interface CityPackEmergency {
  police: string
  medical: string
  pharmacy24h: string
  tourist_police?: string
  ambulance?: string
  general_eu?: string
  emergency_all?: string
  non_emergency?: string
  health_note?: string
  [key: string]: string | undefined
}

/** Power plug: type and voltage for 2026 accuracy. */
export interface CityGuidePower {
  type: string
  voltage: string
}

/** Superior survival: tipping, water, power object, digital entry, tourist tax, scams. */
export interface CityPackSurvival {
  tipping: string
  tapWater: string
  power: CityGuidePower
  digitalEntry: string
  touristTax: string
  currentScams: string[]
}

/** Arrival: eSIM, airport, eSIM hack, transit hack, essential apps. */
export interface CityPackArrival {
  eSimAdvice: string
  eSimHack: string
  airportHack: string
  transitHack: string
  essentialApps: string[]
}

/** Neighborhood vibe and safety (1–10). */
export interface CityPackNeighborhood {
  name: string
  vibe: string
  safetyScore: number
}

/** Legacy survival kit (backward compat). */
export interface CityPackSurvivalKit {
  tap_water: string
  power_plug: string
  tipping: string
  toilets: string
}

export interface CityPackTransitLogic {
  primary_app: string
  payment_method: string
  etiquette: string
}

/** 2026 Superior Schema — main city guide type. */
export interface CityGuide {
  slug: string
  name: string
  countryCode: string
  countryName: string
  last_updated: string
  theme: string
  emergency: CityPackEmergency
  survival: CityPackSurvival
  arrival: CityPackArrival
  neighborhoods: CityPackNeighborhood[]
  survival_kit: CityPackSurvivalKit
  transit_logic: CityPackTransitLogic
  scam_alerts: string[]
  real_time_hacks: string[]
}

/** Alias for backward compatibility. */
export type CityPack = CityGuide

export interface CitiesJson {
  cities: CityPack[]
}
