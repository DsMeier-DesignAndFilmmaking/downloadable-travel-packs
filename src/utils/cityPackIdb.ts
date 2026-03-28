/**
 * IndexedDB persistence for city packs. Used when offline or when network fails.
 */

import type { CityPack } from '@/types/cityPack';

const DB_NAME = 'travel-packs-db';
const CITY_PACK_STORE = 'city-packs';
const HADE_INSIGHT_STORE = 'hade-insights';
const DB_VERSION = 2;

export interface HadeDecisionResponse {
  primary: {
    keyword: string;
    description: string;
    subNode: string;
  };
  tags: string[];
}

export interface StoredCityPack {
  slug: string;
  pack: CityPack;
  savedAt: number;
}

interface StoredHadeInsight {
  slug: string;
  data: HadeDecisionResponse;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CITY_PACK_STORE)) {
        db.createObjectStore(CITY_PACK_STORE, { keyPath: 'slug' });
      }
      if (!db.objectStoreNames.contains(HADE_INSIGHT_STORE)) {
        db.createObjectStore(HADE_INSIGHT_STORE, { keyPath: 'slug' });
      }
    };
  });
}

/**
 * Get a city pack from IndexedDB by slug. Returns null if not found.
 */
export async function getCityPackFromIDB(slug: string): Promise<CityPack | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITY_PACK_STORE, 'readonly');
    const store = tx.objectStore(CITY_PACK_STORE);
    const req = store.get(slug);
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      db.close();
      const row = req.result as StoredCityPack | undefined;
      resolve(row?.pack ?? null);
    };
  });
}

/**
 * Save a city pack to IndexedDB. Overwrites existing entry for the same slug.
 */
export async function setCityPackInIDB(slug: string, pack: CityPack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CITY_PACK_STORE, 'readwrite');
    const store = tx.objectStore(CITY_PACK_STORE);
    const row: StoredCityPack = { slug, pack, savedAt: Date.now() };
    const req = store.put(row);
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Check if a guide is available offline (exists in IDB). Does not validate shape.
 */
export async function isGuideOfflineAvailable(slug: string): Promise<boolean> {
  const pack = await getCityPackFromIDB(slug);
  return pack != null;
}

/**
 * Save HADE recommendation output in IndexedDB.
 * Entry is keyed by city slug and includes timestamp for stale invalidation logic.
 */
export async function saveHadeInsight(slug: string, data: HadeDecisionResponse): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HADE_INSIGHT_STORE, 'readwrite');
    const store = tx.objectStore(HADE_INSIGHT_STORE);
    const row: StoredHadeInsight = {
      slug,
      data,
      timestamp: Date.now(),
    };

    const req = store.put(row);

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save HADE insight'));
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Get the most recent HADE recommendation for a city.
 * Since slug is the key, this always returns the latest write for that city.
 */
export async function getHadeInsight(slug: string): Promise<HadeDecisionResponse | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HADE_INSIGHT_STORE, 'readonly');
    const store = tx.objectStore(HADE_INSIGHT_STORE);
    const req = store.get(slug);

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      db.close();
      const row = req.result as StoredHadeInsight | undefined;
      resolve(row?.data ?? null);
    };
  });
}
