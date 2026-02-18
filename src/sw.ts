/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V8 (High-Resilience)
 * Goal: Solid offline boot for Home Screen instances and robust asset caching.
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v8';
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

/** Path used as start_url in manifest. Must be cached for PWA launch. */
const START_URL_PATH = '/';
const SHELL_ASSETS = [START_URL_PATH, '/index.html', '/pwa-192x192.png', '/vite.svg'];

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

/** Safety Bootstrapper: forces reload when shell is missing. */
const SAFETY_BOOTSTRAPPER_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title></head><body><script>window.location.reload();</script><p>Reloading…</p></body></html>';

// --- ASSET DISCOVERY (Vite-hashed JS/CSS) ---

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

ctx.addEventListener('install', (event) => {
  ctx.skipWaiting(); 
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const entryUrls = await getEntryAssetUrls();
      const allCriticalAssets = [...new Set([...SHELL_ASSETS, ...entryUrls])];
      
      console.log('📦 SW: Caching App Shell assets:', allCriticalAssets.length);
      try {
        await cache.addAll(allCriticalAssets);
        console.log('✅ SW: Shell Assets fully cached.');
      } catch (err) {
        console.error('❌ SW: Critical Shell Cache Failed!', err);
      }
    })()
  );
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(name => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION))
          .map(name => caches.delete(name))
      );
      await ctx.clients.claim();
      console.log('⚡ SW: Claimed all clients.');
    })()
  );
});

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url); 

  // 1. NAVIGATION FALLBACK (Critical for Offline Home Screen)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const exactMatch = await caches.match(request);
        if (exactMatch) return exactMatch;
        const cache = await caches.open(SHELL_CACHE_NAME);
        return (await cache.match('/index.html')) || (await cache.match('/')) || new Response(SAFETY_BOOTSTRAPPER_HTML, { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // 2. STATIC ASSETS
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

  // 3. IMAGES
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

  // 4. DATA API / CATCH-ALL
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
  const { type, assets, images, urls, citySlug, slug } = event.data;
  const port = event.ports?.[0];

  if (type === 'START_CITY_SYNC' || type === 'ATOMIC_CITY_SYNC') {
    const targetSlug = slug ?? citySlug;
    if (!targetSlug) return;

    event.waitUntil(
      (async () => {
        try {
          const shellTask = (async () => {
            const entryUrls = await getEntryAssetUrls();
            const cache = await caches.open(SHELL_CACHE_NAME);
            const allCriticalAssets = [...new Set([...SHELL_ASSETS, ...entryUrls])];
            await cache.addAll(allCriticalAssets);
          })();
          const cityTask = cacheCityIntel(targetSlug);

          await Promise.all([shellTask, cityTask]);
          console.log(`✅ SW: Atomic sync complete for ${targetSlug}`);
        } catch (error) {
          console.error('❌ SW: Atomic City Sync Failed', error);
        }
      })()
    );
    return;
  }

  if (type === 'PRECACHE_GATED_RELEASE') {
    event.waitUntil(
      (async () => {
        try {
          await ensureShellCached();

          const shellCache = await caches.open(SHELL_CACHE_NAME);
          const imageCache = await caches.open(IMAGES_CACHE_NAME);

          if (Array.isArray(assets)) {
            await shellCache.addAll(assets);
          }

          if (Array.isArray(images)) {
            await Promise.allSettled(
              images.map((imgUrl: string) => {
                if (!imgUrl) return Promise.resolve();
                return imageCache.add(imgUrl).catch(() => null);
              })
            );
          }

          if (citySlug) {
            await cacheCityIntel(citySlug);
          }

          console.log('✅ SW: Gated Release Complete');
          if (port) port.postMessage({ ok: true });
        } catch (error) {
          console.error('❌ SW: Gated Release Failed', error);
          if (port) port.postMessage({ ok: false, error: 'Asset sync failed' });
        }
      })()
    );
    return;
  }

  // Compatibility logic
  if (type === 'CACHE_CITY' || type === 'CACHE_GUIDE') {
    const targetSlug = citySlug || slug;
    if (targetSlug) {
      event.waitUntil(cacheCityIntel(targetSlug).then(() => {
        if (port) port.postMessage({ ok: true, type: 'DATA_CACHED' });
      }));
    }
  }

  if (type === 'PRECACHE_IMAGES' && Array.isArray(urls)) {
    event.waitUntil(precacheImageUrls(urls));
  }
});

async function cacheCityIntel(slug: string) {
  const cacheName = `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
  const cache = await caches.open(cacheName);

  // We fetch the guide route as a basic request to avoid the 'navigate' TypeError
  // This "pre-heats" the cache for the standalone offline launch
  const urlsToCache = [`/guide/${slug}`, `/api/guide/${slug}`, '/'];

  await Promise.allSettled(urlsToCache.map(async (url) => {
    try {
      const res = await fetch(url); // Standard fetch, no {mode: 'navigate'}
      if (res.ok) await cache.put(url, res);
    } catch (e) {
      console.warn(`Failed to atomically cache ${url}`);
    }
  }));

  // Notify the specific tab that THIS city is now physically on disk
  const clients = await (self as any).clients.matchAll();
  clients.forEach((c: any) => c.postMessage({ type: 'CACHE_COMPLETE', slug }));
}

async function precacheImageUrls(urls: unknown): Promise<void> {
  if (!Array.isArray(urls)) return;
  const origin = ctx.location.origin;
  const cache = await caches.open(IMAGES_CACHE_NAME);

  await Promise.allSettled(
    urls.filter(u => typeof u === 'string').map(u => {
      const href = new URL(u, origin).href;
      return cache.add(href);
    })
  );
}