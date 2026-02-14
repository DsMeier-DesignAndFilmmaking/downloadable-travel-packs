/**
 * IndexedDB wrapper for storing city guide data offline.
 * Provides save, get, getAll, delete, cache size utilities, and offline availability check.
 */

import type { CityPack } from '@/types/cityPack';

const DB_NAME = 'travel-packs-db';
const STORE_NAME = 'city-packs';
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** City guide type (alias for app's main guide type). */
export type CityGuide = CityPack;

/** Stored record: guide data plus metadata. */
export interface StoredGuide {
  slug: string;
  pack: CityGuide;
  savedAt: number;
}

/** Result of cache size calculation. */
export interface CacheSizeInfo {
  /** Approximate size in bytes (stringified JSON). */
  bytes: number;
  /** Approximate size in MB. */
  mb: number;
  /** Number of guides stored. */
  count: number;
}

/** Storage estimate from the Storage API (when available). */
export interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
}

export class OfflineStorageError extends Error {
  readonly operation: string;
  readonly cause: unknown;
  constructor(message: string, operation: string, cause?: unknown) {
    super(message);
    this.name = 'OfflineStorageError';
    this.operation = operation;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// DB access
// ---------------------------------------------------------------------------

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

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  return openDB().then((db) => {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);

      tx.onerror = () => {
        db.close();
        reject(new OfflineStorageError('Transaction failed', 'transaction', tx.error));
      };
      tx.oncomplete = () => {
        db.close();
      };

      run(store).then(resolve).catch((err) => {
        db.close();
        reject(err);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a city guide to offline storage. Overwrites existing entry for the same slug.
 */
export async function saveGuide(slug: string, guide: CityGuide): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const row: StoredGuide = {
          slug,
          pack: guide,
          savedAt: Date.now(),
        };
        const req = store.put(row);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    });
  } catch (cause) {
    throw new OfflineStorageError(
      `Failed to save guide "${slug}"`,
      'saveGuide',
      cause
    );
  }
}

/**
 * Get a single guide by slug. Returns null if not found.
 */
export async function getGuide(slug: string): Promise<CityGuide | null> {
  try {
    return await runTransaction('readonly', (store) => {
      return new Promise<CityGuide | null>((resolve, reject) => {
        const req = store.get(slug);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const row = req.result as StoredGuide | undefined;
          resolve(row?.pack ?? null);
        };
      });
    });
  } catch (cause) {
    throw new OfflineStorageError(
      `Failed to get guide "${slug}"`,
      'getGuide',
      cause
    );
  }
}

/**
 * Get all guides currently in offline storage.
 */
export async function getAllGuides(): Promise<StoredGuide[]> {
  try {
    return await runTransaction('readonly', (store) => {
      return new Promise<StoredGuide[]>((resolve, reject) => {
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const rows = (req.result as StoredGuide[]) ?? [];
          resolve(rows);
        };
      });
    });
  } catch (cause) {
    throw new OfflineStorageError('Failed to get all guides', 'getAllGuides', cause);
  }
}

/**
 * Delete a guide from offline storage by slug.
 */
export async function deleteGuide(slug: string): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const req = store.delete(slug);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    });
  } catch (cause) {
    throw new OfflineStorageError(
      `Failed to delete guide "${slug}"`,
      'deleteGuide',
      cause
    );
  }
}

/**
 * Approximate size of one stored guide in bytes (stringified JSON, UTF-16 = 2 bytes per char).
 */
export function estimateGuideSizeBytes(guide: StoredGuide): number {
  try {
    return JSON.stringify(guide).length * 2;
  } catch {
    return 0;
  }
}

/**
 * Approximate size of stored guides in bytes (stringified JSON, UTF-16 = 2 bytes per char).
 */
export function estimateStoredSizeBytes(guides: StoredGuide[]): number {
  let total = 0;
  for (const row of guides) {
    total += estimateGuideSizeBytes(row);
  }
  return total;
}

/**
 * Get cache size info: bytes, MB, and count of stored guides.
 */
export async function getCacheSizeInfo(): Promise<CacheSizeInfo> {
  try {
    const guides = await getAllGuides();
    const bytes = estimateStoredSizeBytes(guides);
    return {
      bytes,
      mb: Math.round((bytes / (1024 * 1024)) * 100) / 100,
      count: guides.length,
    };
  } catch (cause) {
    throw new OfflineStorageError(
      'Failed to get cache size info',
      'getCacheSizeInfo',
      cause
    );
  }
}

/**
 * Get storage estimate from the Storage API (quota/usage for origin).
 * Returns null if the API is not available.
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const usagePercent = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return { usage, quota, usagePercent };
  } catch {
    return null;
  }
}

/**
 * Check if a guide is available offline (exists in storage).
 */
export async function isGuideAvailableOffline(slug: string): Promise<boolean> {
  try {
    const guide = await getGuide(slug);
    return guide != null;
  } catch {
    return false;
  }
}
