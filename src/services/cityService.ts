import localData from '../data/cities.json';
import type { CityPack } from '../types/cityPack';
import { getCityPackUrl } from './apiConfig';
import { getCleanSlug } from '../utils/slug';

// Export the list for the Homepage to use
export const cityPacksList = localData.cities.map(city => ({
  slug: city.slug,
  name: city.name,
  countryCode: city.countryCode,
  countryName: city.countryName
}));

function isCityPack(value: unknown): value is CityPack {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const survival = o.survival as Record<string, unknown> | null;
  const arrival = o.arrival as Record<string, unknown> | null;
  return (
    typeof o.slug === 'string' &&
    typeof o.theme === 'string' &&
    typeof o.countryCode === 'string' &&
    typeof o.countryName === 'string' &&
    typeof o.emergency === 'object' &&
    o.emergency !== null &&
    typeof (o.emergency as Record<string, unknown>).police === 'string' &&
    typeof (o.emergency as Record<string, unknown>).medical === 'string' &&
    typeof (o.emergency as Record<string, unknown>).pharmacy24h === 'string' &&
    typeof survival === 'object' &&
    survival !== null &&
    typeof (survival.power as Record<string, unknown>)?.type === 'string' &&
    typeof (survival.power as Record<string, unknown>)?.voltage === 'string' &&
    typeof survival.digitalEntry === 'string' &&
    typeof survival.touristTax === 'string' &&
    typeof arrival === 'object' &&
    arrival !== null &&
    typeof arrival.eSimHack === 'string' &&
    typeof arrival.transitHack === 'string' &&
    Array.isArray(arrival.essentialApps) &&
    Array.isArray(o.neighborhoods) &&
    typeof o.survival_kit === 'object' &&
    o.survival_kit !== null
  );
}

export async function fetchCityPack(slug: string): Promise<{ pack: CityPack; isOffline: boolean }> {
  // Use the clean slug helper inside the fetcher to be 100% safe
  const cleanSlug = getCleanSlug(slug);

  const useLocal = (): { pack: CityPack; isOffline: boolean } => {
    const localMatch = localData.cities.find((c) => c.slug === cleanSlug);
    if (!localMatch) throw new Error('City Not Found');
    return { pack: localMatch as CityPack, isOffline: true };
  };

  try {
    const url = getCityPackUrl(cleanSlug);
    // Force absolute path and cache-busting
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
    
    if (response.ok) {
      const data: unknown = await response.json();
      if (isCityPack(data)) {
        return { pack: data, isOffline: false };
      }
    }
  } catch (e) {
    console.warn('Network fetch failed, falling back to local data', e);
  }

  return useLocal();
}
