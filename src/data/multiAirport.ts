/**
 * Multi-airport cities: options and airport-specific arrival content.
 * Extensible for future cities (e.g. London, Tokyo).
 */

export interface AirportOption {
  code: string;
  name: string;
  /** Optional: distance to city center for display */
  distanceToCenter?: string;
}

export interface AirportArrivalInfo {
  transport: string[];
  travelTimeMinutes: number;
  tips: string[];
  /** Override or supplement base arrival tactical (wifi, taxi, etc.) */
  taxiEstimate?: string;
  trainEstimate?: string;
  officialTransport?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  currencySimLocations?: string;
}

export type AirportArrivalDataByCode = Record<string, AirportArrivalInfo>;

/** City slug -> list of airport options */
export const CITY_AIRPORTS: Record<string, AirportOption[]> = {
  'mexico-city-mexico': [
    { code: 'MEX', name: 'Benito Juárez International Airport', distanceToCenter: '~13 km' },
    { code: 'TLC', name: 'Toluca International Airport', distanceToCenter: '~60 km' },
    { code: 'NLU', name: 'Felipe Ángeles International Airport (AIFA)', distanceToCenter: '~50 km' },
  ],
};

/** City slug -> airport code -> arrival info (cached with pack for offline) */
export const AIRPORT_ARRIVAL_BY_CITY: Record<string, AirportArrivalDataByCode> = {
  'mexico-city-mexico': {
    MEX: {
      transport: ['Metro', 'Uber', 'Aerobus'],
      travelTimeMinutes: 25,
      tips: ['SIM cards at Terminal 1', 'Luggage storage near arrivals'],
      taxiEstimate: 'Authorized taxi/ride app to city center: ~300-450 MXN.',
      trainEstimate: 'Metro Line 5 + bus: ~5-15 MXN. Aerobus to Zócalo: ~70 MXN.',
      officialTransport: 'Metro (Terminal Aérea), Aerobus, authorized taxi stands.',
      wifiSsid: 'MEX-Internet',
      wifiPassword: 'Portal login (no password)',
      currencySimLocations: 'Telcel SIM counters and exchange/ATM points in arrivals corridors.',
    },
    TLC: {
      transport: ['Shuttle', 'Taxi'],
      travelTimeMinutes: 60,
      tips: ['Book shuttle in advance', 'Limited public transport'],
      taxiEstimate: 'Pre-booked shuttle or taxi to city center: ~800-1200 MXN.',
      trainEstimate: 'No direct rail; use shuttle or bus to Toluca then onward.',
      officialTransport: 'Authorized shuttle services and taxi stands.',
      wifiSsid: 'TLC-Free-WiFi',
      wifiPassword: 'Portal login',
      currencySimLocations: 'Limited counters in arrivals; change at city center if needed.',
    },
    NLU: {
      transport: ['Airport Bus', 'Rideshare'],
      travelTimeMinutes: 45,
      tips: ['Check low-cost flight arrivals', 'Luggage storage inside airport'],
      taxiEstimate: 'Official taxi/rideshare to city center: ~400-600 MXN.',
      trainEstimate: 'Airport bus to Norte bus station: ~80-120 MXN.',
      officialTransport: 'Airport bus (Central del Norte), authorized taxi/rideshare.',
      wifiSsid: 'AIFA-WiFi',
      wifiPassword: 'Portal login',
      currencySimLocations: 'SIM and exchange in arrivals; limited options.',
    },
  },
};

const STORAGE_PREFIX = 'airport_selection_';

export function getStoredAirport(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + slug);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredAirport(slug: string, code: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + slug, code);
  } catch {
    // ignore
  }
}

export function getAirportsForCity(slug: string): AirportOption[] {
  return CITY_AIRPORTS[slug] ?? [];
}

export function getAirportArrivalInfo(
  citySlug: string,
  airportCode: string
): AirportArrivalInfo | undefined {
  const byCity = AIRPORT_ARRIVAL_BY_CITY[citySlug];
  if (!byCity) return undefined;
  const code = airportCode.toUpperCase();
  return byCity[code] ?? byCity[code === 'AIFA' ? 'NLU' : code];
}

export function getDefaultAirportForCity(slug: string): string | null {
  const options = CITY_AIRPORTS[slug];
  if (!options || options.length === 0) return null;
  return options[0].code;
}
