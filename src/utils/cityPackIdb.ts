/**
 * IndexedDB persistence for city packs. Used when offline or when network fails.
 */

import type { CityPack } from '@/types/cityPack';

const DB_NAME = 'travel-packs-db';
const STORE_NAME = 'city-packs';
const DB_VERSION = 1;

export interface StoredCityPack {
  slug: string;
  pack: CityPack;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
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
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
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
