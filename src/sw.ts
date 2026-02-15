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

const SHELL_ASSETS = ['/', '/index.html', '/pwa-192x192.png', '/vite.svg'];

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
  const match = (await cache.match('/index.html')) || (await cache.match('/'));
  return match || createErrorResponse('Offline: App shell not found. Please open once while online.', 503);
}

// --- ASSET DISCOVERY ---

async function getEntryAssetUrls(): Promise<string[]> {
  const base = ctx.location.origin;
  try {
    const res = await fetch(new URL('/index.html', base).href, { cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];
    
    const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    const linkRelHref = /<link[^>]*rel\s*=\s*["']?[^"']*stylesheet[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;
    
    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = linkRelHref.exec(html)) !== null) urls.push(m[1]);
    
    return urls
      .map(href => (href.startsWith('http') ? href : new URL(href, base).href))
      .filter(href => href.startsWith(base));
  } catch {
    return [];
  }
}

// --- LIFECYCLE ---

ctx.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      // Cache core assets
      await Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url)));
      // Discover and cache Vite bundles
      const entryUrls = await getEntryAssetUrls();
      await Promise.allSettled(entryUrls.map(url => cache.add(url)));
    })()
  );
  ctx.skipWaiting();
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
    })()
  );
});

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. HARDENED NAVIGATION FALLBACK
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        // FORCE the root shell regardless of the URL
        const fallback = (await cache.match('/index.html')) || (await cache.match('/'));
        
        if (fallback) return fallback;

        // EMERGENCY OVERRIDE: If shell is missing, return a minimal bootstrapper 
        // that tries to force a reload (sometimes fixes SW sync issues)
        return new Response(
          '<script>window.location.reload();</script>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
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
  const { type, assets, urls, citySlug, slug } = event.data;
  // This port is critical for the 'await confirmation' in handleOfflineSync
  const port = event.ports?.[0];

  // 1. Logic for individual city packs (JSON Data)
  if (type === 'CACHE_CITY' || type === 'CACHE_GUIDE') {
    const targetSlug = citySlug || slug;
    if (targetSlug) {
      event.waitUntil(
        cacheCityIntel(targetSlug).then(() => {
          // Optional: reply back that data is cached
          if (port) port.postMessage({ ok: true, type: 'DATA_CACHED' });
        })
      );
    }
  }

  // 2. Logic for the App Shell (JS/CSS Bundles)
  if (type === 'PRECACHE_ASSETS' && Array.isArray(assets)) {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(SHELL_CACHE_NAME);
          // addAll ensures that if ANY asset fails, the whole operation fails
          // This is what we want for a "Success Gate"
          await cache.addAll(assets);
          
          console.log('📡 SW: Shell Assets cached successfully');
          if (port) port.postMessage({ ok: true });
        } catch (error) {
          console.error('📡 SW: Shell Precache failed', error);
          if (port) port.postMessage({ ok: false, error: 'Cache operation failed' });
        }
      })()
    );
  }

  // 3. Logic for Images
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