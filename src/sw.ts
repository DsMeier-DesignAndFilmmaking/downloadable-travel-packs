/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V9
 * Goal: Offline-ready per-city packs without breaking Home Screen functionality
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v9';
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

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
    const city = event.data?.city;
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
