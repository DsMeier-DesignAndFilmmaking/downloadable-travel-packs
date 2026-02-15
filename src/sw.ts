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

  // 1. NAVIGATION FALLBACK (Prevents Safari Browser Error)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => getNavigationFallback())
    );
    return;
  }

  // 2. CRITICAL ASSETS (Vite bundles) - Stale-While-Revalidate
  if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const cached = await cache.match(request);
        
        const fetchPromise = fetch(request).then((networkRes) => {
          if (networkRes.ok) cache.put(request, networkRes.clone());
          return networkRes;
        });

        return cached || fetchPromise.catch(() => createErrorResponse('Asset offline', 404));
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
  const port = event.ports?.[0];

  // Logic for individual city packs
  if (type === 'CACHE_CITY' || type === 'CACHE_GUIDE') {
    const targetSlug = citySlug || slug;
    if (targetSlug) event.waitUntil(cacheCityIntel(targetSlug));
  }

  // Logic for the App Shell (Vite Bundles)
  if (type === 'PRECACHE_ASSETS' && Array.isArray(assets)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        await cache.addAll(assets);
        if (port) port.postMessage({ ok: true });
      })().catch(() => port?.postMessage({ ok: false }))
    );
  }

  // Logic for City Images
  if (type === 'PRECACHE_IMAGES' && Array.isArray(urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE_NAME);
        await Promise.allSettled(urls.map(u => cache.add(u)));
      })()
    );
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