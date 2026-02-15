/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V4
 * Status: Fixed Missing Install Listener & Type-Safe Returns
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v6'; // Version bump for new messaging logic
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

// Assets to keep the "frame" of the app working offline
const SHELL_ASSETS = ['/', '/index.html', '/pwa-192x192.png', '/vite.svg'];

// --- HELPERS ---

function getGuideSlugFromUrl(url: URL): string | null {
  const guideMatch = url.pathname.match(/^\/guide\/([^/?#]+)\/?$/);
  return guideMatch ? guideMatch[1] : null;
}

function getGuideCacheName(slug: string): string {
  return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
}

// --- LIFECYCLE: INSTALL & ACTIVATE ---

ctx.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      // Loop through assets so one failure doesn't stop the others
      for (const asset of SHELL_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn(`📡 SW: Could not pre-cache ${asset}`);
        }
      }
    })
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
      console.log('📡 SW: Activation Complete. Ready for Offline.');
    })()
  );
});

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== ctx.location.origin) return;
  if (url.protocol === 'blob:') return;

  // 1. Navigation Fallback (The Home Screen entry point)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const match = await cache.match('/index.html') || await cache.match('/');
        // Ensure we NEVER return undefined. Fallback to a hardcoded Response if needed.
        return match || new Response("Offline: Shell not cached", { status: 503 });
      })
    );
    return;
  }

// 2. Critical Assets (Vite JS/CSS bundles)
if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('/assets/')) {
  event.respondWith(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      
      // We try to fetch fresh, but return cached if network fails
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
        return cachedResponse || networkResponse;
      } catch (err) {
        // This is the critical fallback for offline white screens
        return cachedResponse || new Response("Asset unavailable offline", { status: 404 });
      }
    })
  );
  return;
}

  // 3. IMAGES (Cache-First)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGES_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 4. CITY DATA API
  const slug = getGuideSlugFromUrl(url);
  if (slug) {
    const cacheName = getGuideCacheName(slug);
    event.respondWith(
      caches.open(cacheName).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            return response;
          }
          throw new Error('Offline');
        } catch {
          const cachedMatch = await cache.match(request);
          return cachedMatch || new Response('Intel unavailable offline', { status: 503 });
        }
      })
    );
  }
});

// --- DYNAMIC CACHING LOGIC ---

async function cacheCityIntel(slug: string) {
  const cacheName = getGuideCacheName(slug);
  const cache = await caches.open(cacheName);
  const urls = [`/guide/${slug}`, `/api/guide/${slug}`];
  
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) await cache.put(url, resp);
    } catch (e) {
      console.error(`📡 SW: Failed to cache ${url}`, e);
    }
  }

  // NEW: Tell the React app we are finished!
  const clients = await ctx.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ 
      type: 'CACHE_COMPLETE', 
      slug: slug 
    });
  });
}

ctx.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_CITY' || event.data?.type === 'CACHE_GUIDE') {
    const slug = event.data.citySlug || event.data.slug;
    if (slug) event.waitUntil(cacheCityIntel(slug));
  }
});