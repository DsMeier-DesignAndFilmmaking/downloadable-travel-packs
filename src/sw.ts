/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V9
 * Goal: Offline-ready per-city packs without breaking Home Screen functionality
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v10';
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';
const PERIODIC_CITY_SYNC_TAG = 'city-data-sync';
const CITY_PACK_DB_NAME = 'travel-packs-db';
const CITY_PACK_DB_VERSION = 3;
const CITY_PACK_STORE_NAME = 'city-packs';
const HADE_INSIGHT_STORE_NAME = 'hade-insights';

/** Path used as start_url in manifest. Must be cached for PWA launch. */
const START_URL_PATH = '/';
const SHELL_ASSETS = [
  START_URL_PATH,
  '/index.html',
  '/pwa-192x192.png',
  '/vite.svg',
  '/data/static_baseline.json',
  '/data/seasonal-baseline.json',
];

/** Ensures shell cache has the latest JS/CSS/HTML. Uses getEntryAssetUrls() for Vite-hashed assets. */
async function ensureShellCached(): Promise<void> {
  const entryUrls = await getEntryAssetUrls();
  const cache = await caches.open(SHELL_CACHE_NAME);
  const allCriticalAssets = [...new Set([...SHELL_ASSETS, ...entryUrls])];
  await cache.addAll(allCriticalAssets);
}

// --- UTILS & FALLBACKS ---
function createErrorResponse(message: string, status = 503): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

const SAFETY_BOOTSTRAPPER_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title></head><body><script>window.location.reload();</script><p>Reloading…</p></body></html>';

async function getEntryAssetUrls(): Promise<string[]> {
  const base = ctx.location.origin;
  try {
    const res = await fetch(new URL('/index.html', base).href, { cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];

    const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    const styleRe = /<link[^>]*rel\s*=\s*["']?[^"']*stylesheet[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;
    const modulePreloadRe = /<link[^>]*rel\s*=\s*["']?[^"']*modulepreload[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;

    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = styleRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = modulePreloadRe.exec(html)) !== null) urls.push(m[1]);

    const absolute = urls
      .map((href) => (href.startsWith('http') ? href : new URL(href, base).href))
      .filter((href) => href.startsWith(base));
    return [...new Set(absolute)];
  } catch {
    return [];
  }
}

type CityManifestPayload = {
  cities?: unknown;
};

function openCityPackDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CITY_PACK_DB_NAME, CITY_PACK_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1 && !db.objectStoreNames.contains(CITY_PACK_STORE_NAME)) {
        db.createObjectStore(CITY_PACK_STORE_NAME, { keyPath: 'slug' });
      }
      if (oldVersion < 3 && !db.objectStoreNames.contains(HADE_INSIGHT_STORE_NAME)) {
        db.createObjectStore(HADE_INSIGHT_STORE_NAME, { keyPath: 'slug' });
      }
    };
  });
}

async function setCityPackInIdb(slug: string, pack: unknown): Promise<void> {
  const db = await openCityPackDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CITY_PACK_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CITY_PACK_STORE_NAME);
    const req = store.put({ slug, pack, savedAt: Date.now() });

    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error ?? new Error('IDB write aborted'));
    tx.oncomplete = () => resolve();
  }).finally(() => {
    db.close();
  });
}

async function syncCityManifestToIdb(): Promise<void> {
  const manifestUrl = new URL('/data/cities.json', ctx.location.origin).href;
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Manifest fetch failed (${response.status})`);

  const payload = (await response.json()) as CityManifestPayload;
  const cityRows = Array.isArray(payload.cities) ? payload.cities : [];
  if (cityRows.length === 0) return;

  await Promise.allSettled(
    cityRows.map((row) => {
      if (!row || typeof row !== 'object') return Promise.resolve();
      const record = row as Record<string, unknown>;
      const slug = record.slug;
      if (typeof slug !== 'string' || slug.trim().length === 0) return Promise.resolve();
      return setCityPackInIdb(slug, row);
    })
  );
}

async function getTopRecentSlugs(n: number): Promise<string[]> {
  const db = await openCityPackDb();
  return new Promise<string[]>((resolve) => {
    const tx = db.transaction(CITY_PACK_STORE_NAME, 'readonly');
    const store = tx.objectStore(CITY_PACK_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as Array<{ slug: string; savedAt: number }>) ?? [];
      const slugs = rows
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, n)
        .map((r) => r.slug);
      resolve(slugs);
      db.close();
    };
    req.onerror = () => { resolve([]); db.close(); };
  });
}

// --- LIFECYCLE ---
ctx.addEventListener('install', () => ctx.skipWaiting());

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await ctx.clients.claim();

      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );

      try {
        await ensureShellCached();
      } catch (err) {
        console.error('❌ SW: Shell cache failed', err);
      }
    })()
  );
});

// --- PUSH NOTIFICATIONS ---
ctx.addEventListener('push', (event: Event) => {
  const pushEvent = event as PushEvent;
  let slug = '';
  let title = 'Travel Pack Update';
  let body  = 'Your arrival intel has been refreshed.';

  try {
    const data = pushEvent.data?.json() as { slug?: string; title?: string; body?: string } | undefined;
    if (data?.slug)  slug  = data.slug;
    if (data?.title) title = data.title;
    if (data?.body)  body  = data.body;
  } catch {
    // Malformed payload — use defaults above
  }

  const deepLink = slug ? `/guide/${slug}?section=arrival` : '/';

  pushEvent.waitUntil(
    ctx.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: deepLink },
    })
  );
});

ctx.addEventListener('notificationclick', (event: Event) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();

  const url: string = (notifEvent.notification.data?.url as string | undefined) ?? '/';

  notifEvent.waitUntil(
    ctx.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        return ctx.clients.openWindow(url);
      })
  );
});

// --- PERIODIC BACKGROUND SYNC ---
ctx.addEventListener('periodicsync', (event: Event) => {
  const periodicEvent = event as ExtendableEvent & { tag?: string };
  if (periodicEvent.tag !== PERIODIC_CITY_SYNC_TAG) return;

  periodicEvent.waitUntil(
    syncCityManifestToIdb()
      .then(async () => {
        const slugs = await getTopRecentSlugs(3);
        await Promise.allSettled(slugs.map((s) => cacheCityIntel(s)));
      })
      .catch((error) => {
        console.warn('⚠️ SW: city-data-sync failed', error);
      })
  );
});

// --- FETCH HANDLERS ---
ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never proxy cross-origin requests (e.g., RapidAPI).
  if (url.origin !== ctx.location.origin) return;

  // Ignore /check-like endpoints to avoid retry loops under rate limits.
  if (url.pathname === '/check' || url.pathname.endsWith('/check')) return;

  // Navigation fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        return (await cache.match('/index.html')) || new Response(SAFETY_BOOTSTRAPPER_HTML, { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Static assets (JS/CSS)
  if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const netRes = await fetch(request);
          if (netRes.ok) cache.put(request, netRes.clone());
          return netRes;
        } catch {
          return new Response('/* Asset Offline */', { status: 404, headers: { 'Content-Type': 'text/javascript' } });
        }
      })()
    );
    return;
  }

  // Images
  if (request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkRes = await fetch(request);
          if (networkRes.ok) cache.put(request, networkRes.clone());
          return networkRes;
        } catch {
          return createErrorResponse('Image offline', 404);
        }
      })()
    );
    return;
  }

  // Fallback for other requests
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const cached = await caches.match(request);
        return cached || createErrorResponse('Offline', 503);
      }
    })()
  );
});

// --- MESSAGING ---
ctx.addEventListener('message', (event) => {
  const { type, assets, images, urls, citySlug, slug, city } = event.data;
  const port = event.ports?.[0];

  // --- Safe city precache ---
  if (type === 'PRECACHE_CITY') {
    if (!city) return;

    event.waitUntil(
      (async () => {
        const cache = await caches.open(`city-pack-${city}`);
        const base = ctx.location.origin;

        // Only cache real assets: SPA shell + hashed JS/CSS
        const urlsToCache = [START_URL_PATH, '/index.html'];
        const entryAssets = await getEntryAssetUrls();
        urlsToCache.push(...entryAssets);

        for (const url of urlsToCache) {
          try {
            const res = await fetch(new URL(url, base).href);
            if (res.ok) await cache.put(url, res.clone());
          } catch (err) {
            console.warn(`Skipping ${url}`, err);
          }
        }

        (event.source as Client)?.postMessage({ type: 'PRECACHE_COMPLETE', city });
      })()
    );
    return;
  }

  // Atomic sync (shell + city)
  if (type === 'ATOMIC_CITY_SYNC') {
    const targetSlug = slug ?? citySlug;
    if (!targetSlug) return;

    event.waitUntil(
      (async () => {
        try {
          const shellTask = (async () => {
            const entryUrls = await getEntryAssetUrls();
            const cache = await caches.open(SHELL_CACHE_NAME);
            await cache.addAll([...SHELL_ASSETS, ...entryUrls]);
          })();

          const cityTask = cacheCityIntel(targetSlug);
          await Promise.all([shellTask, cityTask]);
        } catch (error) {
          console.error('❌ SW: Atomic City Sync Failed', error);
        }
      })()
    );
    return;
  }

  // Gated release
  if (type === 'PRECACHE_GATED_RELEASE') {
    event.waitUntil(
      (async () => {
        try {
          await ensureShellCached();
          const shellCache = await caches.open(SHELL_CACHE_NAME);
          const imageCache = await caches.open(IMAGES_CACHE_NAME);

          if (Array.isArray(assets)) await shellCache.addAll(assets);
          if (Array.isArray(images)) {
            await Promise.allSettled(
              images.map((imgUrl: string) => {
                if (!imgUrl) return Promise.resolve();
                return imageCache.add(imgUrl).catch(() => null);
              })
            );
          }

          if (citySlug) await cacheCityIntel(citySlug);
          if (port) port.postMessage({ ok: true });
        } catch (error) {
          if (port) port.postMessage({ ok: false, error: 'Asset sync failed' });
        }
      })()
    );
    return;
  }

  // Compatibility: cache city / guide
  if ((type === 'CACHE_CITY' || type === 'CACHE_GUIDE') && (citySlug || slug)) {
    event.waitUntil(cacheCityIntel(citySlug || slug).then(() => {
      if (port) port.postMessage({ ok: true, type: 'DATA_CACHED' });
    }));
  }

  // Precache images
  if (type === 'PRECACHE_IMAGES' && Array.isArray(urls)) {
    event.waitUntil(precacheImageUrls(urls));
  }
});

// --- Helper Functions ---
async function cacheCityIntel(slug: string): Promise<void> {
  const base = ctx.location.origin;
  const cacheName = `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
  const cache = await caches.open(cacheName);

  // Only cache shell + hashed assets (do not fetch non-existent routes)
  const urlsToCache = [START_URL_PATH, '/index.html'];
  const entryAssets = await getEntryAssetUrls();
  urlsToCache.push(...entryAssets);

  for (const url of urlsToCache) {
    try {
      const res = await fetch(new URL(url, base).href);
      if (res.ok) await cache.put(url, res.clone());
    } catch (e) {
      console.warn(`Failed to cache asset for ${url}`);
    }
  }

  const clients = await ctx.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: 'CACHE_COMPLETE', slug }));
}

async function precacheImageUrls(urls: unknown): Promise<void> {
  if (!Array.isArray(urls)) return;
  const origin = ctx.location.origin;
  const cache = await caches.open(IMAGES_CACHE_NAME);

  await Promise.allSettled(
    urls.filter(u => typeof u === 'string').map(u => {
      const href = new URL(u, origin).href;
      return cache.add(href).catch(() => null);
    })
  );
}
