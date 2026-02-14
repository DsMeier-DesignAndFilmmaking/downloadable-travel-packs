/// <reference lib="webworker" />

/**
 * MANDATORY: This tells Workbox where to inject the precache manifest.
 * During build, Vite replaces 'self.__WB_MANIFEST' with the array of 
 * files found by your globPatterns in vite.config.ts.
 */
// @ts-ignore
const _precacheManifest = self.__WB_MANIFEST;

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v2';

/**
 * Extract city slug from various URL patterns
 */
function getGuideSlugFromUrl(url: URL): string | null {
  const guideMatch = url.pathname.match(/^\/guide\/([^/?#]+)\/?$/);
  if (guideMatch) return guideMatch[1];

  const slugParam = url.searchParams.get('slug');
  if (url.pathname.startsWith('/api/manifest') && slugParam) return slugParam;

  return null;
}

function getGuideCacheName(slug: string): string {
  return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
}

// --- INSTALL & ACTIVATE ---

ctx.addEventListener('install', () => {
  // Activate the new service worker immediately without waiting for tabs to close
  ctx.skipWaiting();
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if supported for faster page loads
      if ('navigationPreload' in ctx.registration) {
        await ctx.registration.navigationPreload.enable();
      }
      // Take control of all open tabs immediately
      await ctx.clients.claim();
      
      // Clean up old city caches that don't match current version
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(name => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION))
          .map(name => caches.delete(name))
      );
    })()
  );
});

// --- FETCH HANDLER ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== ctx.location.origin) return;

  // 1. THE "WHITE SCREEN" FIX: SPA NAVIGATION FALLBACK
  // Intercepts page navigations (e.g. /guide/tokyo) and serves the cached index.html shell.
  // This allows React Router to boot up and handle the route offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Serve the App Shell from the precache
        const cache = await caches.match('/index.html');
        if (cache) return cache;
        
        // Final fallback if shell is missing
        return new Response("Offline: App Shell not available", { 
          status: 503, 
          headers: { 'Content-Type': 'text/html' } 
        });
      })
    );
    return;
  }

  // 2. IDENTITY BYPASS (Manifests)
  // Network-First strategy to ensure city identity (names/icons) stays fresh
  if (url.pathname.includes('/api/manifest')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            const copy = response.clone();
            caches.open('manifest-cache').then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(JSON.stringify({ name: "Offline" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. IMAGE CACHING
  if (request.destination === 'image') {
    event.respondWith(
      (async (): Promise<Response> => {
        const cache = await caches.open(IMAGES_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  // 4. GUIDE DATA (API Data & Static Guide Pages)
  const slug = getGuideSlugFromUrl(url);
  if (!slug) return;

  const cacheName = getGuideCacheName(slug);

  event.respondWith(
    (async (): Promise<Response> => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      
      if (navigator.onLine) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            return response;
          }
        } catch (err) {
          console.warn('SW: Network fetch failed, falling back to cache.', err);
        }
      }
      
      return cached || new Response('Resource unavailable offline', { status: 503 });
    })()
  );
});

// --- UTILS & MESSAGING ---

async function cacheCity(slug: string): Promise<void> {
  const cacheName = getGuideCacheName(slug);
  const cache = await caches.open(cacheName);
  const urlsToCache = [
    `/guide/${slug}`, 
    `/api/manifest?slug=${slug}`
  ];
  console.log(`📡 SW Signaling: Caching intel for ${slug}`);
  await cache.addAll(urlsToCache);
}

ctx.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  // Handles caching requests from the UI (CityGuideView)
  if (data.type === 'CACHE_CITY' || data.type === 'CACHE_GUIDE') {
    const slug = data.citySlug || data.slug;
    if (slug) event.waitUntil(cacheCity(slug));
  }
});