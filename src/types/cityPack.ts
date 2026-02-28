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

export interface CityPackFuel {
  staple: string
  intel: string
  price_anchor: string
  price_usd: number
  availability?: string
  source?: string[]
}

/** Arrival: eSIM, airport, eSIM hack, transit hack, essential apps. */
export interface CityPackArrivalTacticalConnectivity {
  wifiSsid: string
  wifiPassword: string
  note: string
}

export interface CityPackArrivalTacticalImmigration {
  strategy: string
}

export interface CityPackArrivalTacticalTransport {
  taxiEstimate: string
  trainEstimate: string
}

export interface CityPackArrivalTacticalPath {
  connectivity: CityPackArrivalTacticalConnectivity
  immigration: CityPackArrivalTacticalImmigration
  transport: CityPackArrivalTacticalTransport
}

/** Premium arrival: border/visa status (optional). */
export interface CityPackArrivalBorderStatus {
  live?: boolean
  source?: string
  last_checked?: string | null
  summary_note?: string
  offline_fallback?: string
}

/** Premium arrival: transport matrix (optional). */
export interface CityPackArrivalTransportMatrix {
  cheapest?: string
  fastest_traffic?: string
  door_to_door?: string
  comfort_luggage?: string
}

/** Premium arrival: system health (optional). */
export interface CityPackArrivalSystemHealth {
  transit?: string
  security?: string
  weather?: string
  air_quality_note?: string
  dynamic_ready?: boolean
  offline_message?: string
}

export interface CityPackSafetyIntelligence {
  crimeStatsUrl: string;     // Official Gov Portal URL
  crimeStatsSource: string;  // e.g., "Portal de Datos Abiertos FGJ"
  safetyLevel: 'high' | 'moderate' | 'caution';
  localAdvice?: string;      // e.g., "Avoid the North exit after 10 PM"
}

export interface CityPackArrival {
  eSimAdvice: string
  eSimHack: string
  airportHack: string
  transitHack: string
  essentialApps: string[]
  tacticalPath?: CityPackArrivalTacticalPath
  borderStatus?: CityPackArrivalBorderStatus
  first60Protocol?: string[]
  arrivalMistakes?: string[]
  transportMatrix?: CityPackArrivalTransportMatrix
  systemHealth?: CityPackArrivalSystemHealth
}

/** 2026 Movement Intelligence: The "How-To" of the city. */
export interface CityPackTransit {
  bestWay: string;      // "The Movement Hack" from your UI
  rideShare?: string;   // Local equivalent (Uber, Grab, Bolt, etc.)
  transitCard?: string; // Physical card or Digital wallet info
  warning?: string;     // Strikes, peak hour notes, or safety warnings
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

/** Infrastructure & Sanitation Intelligence */
export interface FacilityIntel {
  access: string     // e.g., "Coin/App required (€0.50)"
  hygiene: string    // e.g., "High - Dept Stores preferred"
  protocol: string   // e.g., "Flush paper / Trash bin for wipes"
  availability: string // e.g., "Abundant in malls / Scarce in Metro"
}

export interface CityPackTransitLogic {
  primary_app: string
  payment_method: string
  etiquette: string
  /** Optional tactical note (e.g. EcoBici dead zones). */
  micromobility_alert?: string
}

export interface CityCoordinates {
  lat: number
  lng: number
}

/** 2026 Superior Schema — main city guide type. */
export interface CityGuide {
  slug: string
  name: string
  countryCode: string
  currencyCode: string;
  countryName: string
  coordinates: CityCoordinates
  last_updated: string
  theme: string
    // Added Safety Intel directly into the main object for easy access
    safety_intelligence?: CityPackSafetyIntelligence;
  emergency: CityPackEmergency
  survival: CityPackSurvival
  arrival: CityPackArrival
  transit?: CityPackTransit       // Added back for Transit Hacks UI
  neighborhoods: CityPackNeighborhood[]
  survival_kit: CityPackSurvivalKit
  transit_logic: CityPackTransitLogic
  facility_intel: FacilityIntel;
  fuel?: CityPackFuel
  scam_alerts: string[]
  real_time_hacks: string[]

  basic_needs: {
    water_rule: string;
    street_food: string;
    restroom_guide: FacilityIntel; // This connects to your FacilityKit
    altitude_warning: string;
  };
}

/** Alias for backward compatibility. */
export type CityPack = CityGuide

export interface CitiesJson {
  cities: CityPack[]
}
