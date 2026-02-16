/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V6 (Ultra-Resilient)
 * Focus: Elimination of 'undefined' responses and First-Launch Airplane Mode support.
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v8';
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

/** Path used as start_url in generateCityGuideManifest (origin + '/'). Must be cached for PWA launch. */
const START_URL_PATH = '/';
const SHELL_ASSETS = [START_URL_PATH, '/index.html', '/pwa-192x192.png', '/vite.svg'];

// --- UTILS & FALLBACKS ---

/** Returns a standard fallback response to prevent white screens if all else fails */
function createErrorResponse(message: string, status = 503): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/** Robust Navigation Fallback: Essential for Standalone Offline Launch */
async function getNavigationFallback(): Promise<Response> {
  const cache = await caches.open(SHELL_CACHE_NAME);
  const match = (await cache.match('/index.html')) || (await cache.match(START_URL_PATH));
  return match || createErrorResponse('Offline: App shell not found. Please open once while online.', 503);
}

/** Safety Bootstrapper: minimal HTML that forces reload when shell is missing (e.g. SW sync issues). */
const SAFETY_BOOTSTRAPPER_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title></head><body><script>window.location.reload();</script><p>Reloading…</p></body></html>';

// --- ASSET DISCOVERY (Vite-hashed JS/CSS) ---

/**
 * Parses index.html for Vite-hashed entry assets and returns absolute URLs.
 * Captures: <script src="...">, <link rel="stylesheet" href="...">, <link rel="modulepreload" href="...">.
 * All discovered URLs are intended for SHELL_CACHE_NAME so the app shell works offline.
 */
async function getEntryAssetUrls(): Promise<string[]> {
  const base = ctx.location.origin;
  try {
    const res = await fetch(new URL('/index.html', base).href, { cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];

    // Vite entry and chunks: <script type="module" src="/assets/Index-xxx.js">
    const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    // Vite CSS: <link rel="stylesheet" href="/assets/Index-xxx.css">
    const styleRe = /<link[^>]*rel\s*=\s*["']?[^"']*stylesheet[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;
    // Vite modulepreload (chunks): <link rel="modulepreload" href="/assets/...">
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

// --- LIFECYCLE: Aggressive Control (Home Screen controlled from first millisecond) ---

ctx.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const entryUrls = await getEntryAssetUrls();

      if (entryUrls.length === 0) {
        throw new Error('SW install: no Vite entry assets discovered from index.html');
      }

      // Fail install if any critical shell asset cannot be cached (Promise.all rejects on first failure)
      await Promise.all([cache.addAll(SHELL_ASSETS), cache.addAll(entryUrls)]);

      console.log('🚀 Shell fully atomic and cached');
      ctx.skipWaiting();
    })()
  );
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await ctx.clients.claim();
      console.log('⚡ SW actively controlling all clients');
    })()
  );
});

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. NAVIGATION PROXY: network-first, then cached shell for any path, then Safety Bootstrapper
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const netRes = await fetch(request);
          return netRes;
        } catch {
          // Offline: serve cached shell regardless of URL path (e.g. /guide/tokyo → index.html)
          const cache = await caches.open(SHELL_CACHE_NAME);
          const shell =
            (await cache.match('/index.html')) || (await cache.match(START_URL_PATH));
          if (shell) return shell;
          // Safety Bootstrapper: shell missing — force reload to recover
          return new Response(SAFETY_BOOTSTRAPPER_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // 2. ASSETS - Ensure we return a valid Response to avoid TS/Runtime errors
  if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const cached = await cache.match(request);
        
        const fetchPromise = fetch(request).then((netRes) => {
          if (netRes.ok) cache.put(request, netRes.clone());
          return netRes;
        });

        // If offline and not in cache, we return an empty valid response 
        // to prevent the app from crashing entirely
        return cached || fetchPromise.catch(() => 
          new Response('/* Asset Unavailable */', { 
            status: 404, 
            headers: { 'Content-Type': 'text/javascript' } 
          })
        );
      })()
    );
    return;
  }

  // 3. IMAGES - Cache-First
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
        const res = await fetch(request);
        return res;
      } catch {
        const cached = await caches.match(request);
        return cached || createErrorResponse('Offline', 503);
      }
    })()
  );
});

// --- MESSAGING (Handshake Logic) ---
ctx.addEventListener('message', (event) => {
  const { type, assets, images, urls, citySlug, slug } = event.data;
  const port = event.ports?.[0];

  // --- NEW: THE GATED RELEASE HANDLER ---
  if (type === 'PRECACHE_GATED_RELEASE') {
    event.waitUntil(
      (async () => {
        try {
          const shellCache = await caches.open(SHELL_CACHE_NAME);
          const imageCache = await caches.open(IMAGES_CACHE_NAME);

          // 1. Critical Assets - Must succeed 100%
          if (Array.isArray(assets)) {
            await shellCache.addAll(assets);
          }

          // 2. Images - Resilient caching
          if (Array.isArray(images)) {
            await Promise.allSettled(
              images.map(url => imageCache.add(url).catch(() => null))
            );
          }

          // 3. City Data (Optional logic if you want SW to handle JSON too)
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
    return; // Prevent falling through to other logic
  }

  // --- EXISTING LOGIC (Keep for backward compatibility) ---
  if (type === 'CACHE_CITY' || type === 'CACHE_GUIDE') {
    const targetSlug = citySlug || slug;
    if (targetSlug) {
      event.waitUntil(cacheCityIntel(targetSlug).then(() => {
        if (port) port.postMessage({ ok: true, type: 'DATA_CACHED' });
      }));
    }
  }

  if (type === 'PRECACHE_ASSETS' && Array.isArray(assets)) {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(SHELL_CACHE_NAME);
          await cache.addAll(assets);
          if (port) port.postMessage({ ok: true });
        } catch (error) {
          if (port) port.postMessage({ ok: false, error: 'Shell cache failed' });
        }
      })()
    );
  }

  if (type === 'PRECACHE_IMAGES' && Array.isArray(urls)) {
    event.waitUntil(precacheImageUrls(urls));
  }
});

async function cacheCityIntel(slug: string) {
  const cacheName = `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
  const cache = await caches.open(cacheName);
  const urlsToCache = [`/guide/${slug}`, `/api/guide/${slug}`];
  
  await Promise.allSettled(urlsToCache.map(async (url) => {
    const res = await fetch(url);
    if (res.ok) await cache.put(url, res);
  }));

  const clients = await ctx.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'CACHE_COMPLETE', slug }));
}

/**
 * Helper: Precaches image URLs into IMAGES_CACHE_NAME. 
 * Uses Promise.allSettled to ensure one bad image doesn't break the whole sync.
 */
async function precacheImageUrls(urls: unknown): Promise<void> {
  if (!Array.isArray(urls)) return;
  
  const origin = ctx.location.origin;
  const validUrls = urls
    .filter((u): u is string => typeof u === 'string')
    .map((u) => {
      try {
        // Ensure we have absolute URLs for the cache
        return new URL(u, origin).href;
      } catch {
        return '';
      }
    })
    .filter((href) => href.startsWith(origin) && href.length > 0);

  if (validUrls.length === 0) return;

  try {
    const cache = await caches.open(IMAGES_CACHE_NAME);
    // We use map + cache.add instead of addAll here so that 
    // if one image fails (404), the others still get cached.
    await Promise.all(
      validUrls.map((url) =>
        cache.add(url).catch((e) => console.warn(`📡 SW: Image cache failed for ${url}`, e))
      )
    );
    console.log(`📡 SW: Precached ${validUrls.length} images successfully.`);
  } catch (e) {
    console.error('📡 SW: PRECACHE_IMAGES critical failure', e);
  }
}