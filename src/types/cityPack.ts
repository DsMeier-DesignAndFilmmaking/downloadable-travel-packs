/**
 * CityPack — TypeScript interface matching src/data/cities.json structure.
 * Used by the offline-first city service and API.
 */

/** Emergency numbers and notes; keys vary by city (e.g. police, medical, emergency_all, health_note). */
export interface CityPackEmergency {
  police?: string
  tourist_police?: string
  ambulance?: string
  medical?: string
  general_eu?: string
  emergency_all?: string
  non_emergency?: string
  health_note?: string
  [key: string]: string | undefined
}

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

export interface CityPack {
  slug: string
  name: string
  country: string
  last_updated: string
  emergency: CityPackEmergency
  survival_kit: CityPackSurvivalKit
  transit_logic: CityPackTransitLogic
  scam_alerts: string[]
  real_time_hacks: string[]
}

export interface CitiesJson {
  cities: CityPack[]
}
