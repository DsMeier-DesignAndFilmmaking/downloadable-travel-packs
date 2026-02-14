import localData from '../data/cities.json';
import type { CityPack } from '../types/cityPack';
import { getCityPackUrl } from './apiConfig';
import { getCleanSlug } from '../utils/slug';
import { getCityPackFromIDB, setCityPackInIDB } from '../utils/cityPackIdb';

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

const FETCH_TIMEOUT_MS = 2500;

export async function fetchCityPack(slug: string): Promise<{ pack: CityPack; isOffline: boolean }> {
  const cleanSlug = getCleanSlug(slug);

  const useLocal = (): { pack: CityPack; isOffline: boolean } => {
    const localMatch = localData.cities.find((c) => c.slug === cleanSlug);
    if (!localMatch) throw new Error('City Not Found');
    return { pack: localMatch as CityPack, isOffline: true };
  };

  /** Try IndexedDB first; if found return it, else throw. */
  const tryIDB = async (): Promise<{ pack: CityPack; isOffline: boolean }> => {
    const pack = await getCityPackFromIDB(cleanSlug);
    if (pack) return { pack, isOffline: true };
    return useLocal();
  };

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  if (!isOnline) {
    return tryIDB();
  }

  const fetchWithTimeout = (): Promise<{ pack: CityPack; isOffline: boolean }> => {
    const url = getCityPackUrl(cleanSlug);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) return tryIDB();
        return response.json().then(async (data: unknown) => {
          if (isCityPack(data)) {
            await setCityPackInIDB(cleanSlug, data).catch(() => {});
            return { pack: data, isOffline: false };
          }
          return tryIDB();
        });
      })
      .catch(async (e) => {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') {
          console.warn('City pack fetch timed out, trying IndexedDB then local');
        } else {
          console.warn('Network fetch failed, trying IndexedDB then local', e);
        }
        return tryIDB();
      });
  };

  return Promise.race([
    fetchWithTimeout(),
    new Promise<{ pack: CityPack; isOffline: boolean }>((resolve, reject) => {
      setTimeout(() => {
        tryIDB().then(resolve).catch(reject);
      }, FETCH_TIMEOUT_MS);
    }),
  ]);
}
