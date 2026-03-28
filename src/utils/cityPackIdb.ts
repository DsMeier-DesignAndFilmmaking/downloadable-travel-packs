/**
 * IndexedDB persistence for city packs and HADE insights. 
 * Used for offline-first PWA functionality in Field Notes.
 */

import type { CityPack } from '@/types/cityPack';

const DB_NAME = 'travel-packs-db';
const CITY_PACK_STORE = 'city-packs';
const HADE_INSIGHT_STORE = 'hade-insights';

/** * VERSION MIGRATION LOG:
 * v1: Initial setup
 * v2: Standard City Pack storage
 * v3: Added HADE insights store
 */
const DB_VERSION = 3; 

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

/**
 * Internal helper to open the database with version management.
 * Handles non-destructive upgrades for existing production data.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      console.log(`IDB Upgrade starting: v${oldVersion} -> v${DB_VERSION}`);

      // Handle v2 migration: Ensure city-packs exists
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(CITY_PACK_STORE)) {
          db.createObjectStore(CITY_PACK_STORE, { keyPath: 'slug' });
          console.log(`✅ Created store: ${CITY_PACK_STORE}`);
        }
      }

      // Handle v3 migration: Add HADE insights without wiping existing packs
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(HADE_INSIGHT_STORE)) {
          db.createObjectStore(HADE_INSIGHT_STORE, { keyPath: 'slug' });
          console.log(`✅ Created store: ${HADE_INSIGHT_STORE}`);
        }
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
 * Check if a guide is available offline (exists in IDB).
 */
export async function isGuideOfflineAvailable(slug: string): Promise<boolean> {
  const pack = await getCityPackFromIDB(slug);
  return pack != null;
}

/**
 * Save HADE recommendation output in IndexedDB.
 * Keyed by city slug for offline persistence.
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
 * Get the most recent HADE recommendation for a city from local storage.
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