/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V4
 * Status: Fixed Missing Install Listener & Type-Safe Returns
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v4'; // Bumped for a fresh start
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v4';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;

// Assets to keep the "frame" of the app working offline
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/pwa-192x192.png',
  '/vite.svg'
];

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
      console.log('📡 SW: Pre-caching Core Shell Assets');
      
      // We use a "forgiving" install: critical first, others next.
      const critical = ['/', '/index.html'];
      const nonCritical = ['/pwa-192x192.png', '/vite.svg'];

      await cache.addAll(critical);
      
      // If an icon is missing, don't kill the whole Service Worker
      return Promise.allSettled(
        nonCritical.map(asset => cache.add(asset))
      );
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

  // 1. NAVIGATION (Serve the HTML shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const match = (await cache.match('/')) || (await cache.match('/index.html'));
        return match || new Response("Offline: Shell missing. Sync required.", { status: 503 });
      })
    );
    return;
  }

  // 2. VITE ASSETS (Hashed Scripts/Styles)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            return response;
          }
          throw new Error('Offline');
        } catch {
          const cachedMatch = await cache.match(request);
          return cachedMatch || new Response('', { status: 404 });
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

// --- MESSAGING ---

async function cacheCity(slug: string): Promise<void> {
  const cacheName = getGuideCacheName(slug);
  const cache = await caches.open(cacheName);
  const urlsToCache = [`/guide/${slug}`, `/api/guide/${slug}`];
  
  try {
    await cache.addAll(urlsToCache);
    console.log(`📡 SW: City Intel Cached for ${slug}`);
  } catch (err) {
    console.warn(`📡 SW: Error pre-caching ${slug}`, err);
  }
}

ctx.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_CITY' || event.data?.type === 'CACHE_GUIDE') {
    const slug = event.data.citySlug || event.data.slug;
    if (slug) event.waitUntil(cacheCity(slug));
  }
});