/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE
 * Handles: App Shell Caching, City Intel Persistence, and Image Optimization.
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v2';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;

// 1. ASSETS FOR OFFLINE BOOT
// These are cached during the 'install' phase to ensure the app "shell" works without a network.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/pwa-192x192.png',
  '/vite.svg'
];

// --- HELPER UTILS ---

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

// --- SERVICE WORKER LIFECYCLE ---

ctx.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => {
      console.log('📡 SW: Caching App Shell Assets');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  ctx.skipWaiting();
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old cache versions
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(name => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION))
          .map(name => caches.delete(name))
      );
      // Take control of all pages immediately
      await ctx.clients.claim();
    })()
  );
});

// --- FETCH STRATEGIES ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore cross-origin requests
  if (url.origin !== ctx.location.origin) return;

  // 1. SPA NAVIGATION (App Shell Fallback)
  // If user is offline and hits a route like /guide/tokyo, we serve index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const match = (await cache.match('/')) || (await cache.match('/index.html'));
        return match || new Response("Offline: App Shell not available", { 
          status: 503, 
          headers: { 'Content-Type': 'text/html' } 
        });
      })
    );
    return;
  }

  // 2. RUNTIME SHELL CACHING (JS/CSS)
  // Since Vite hashes filenames, we cache them as they are requested.
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 3. IMAGE CACHING (Cache-First)
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

  // 4. CITY INTEL DATA (Network-First, Cache Fallback)
  const slug = getGuideSlugFromUrl(url);
  if (slug) {
    const cacheName = getGuideCacheName(slug);
    event.respondWith(
      caches.open(cacheName).then(async (cache) => {
        try {
          // If online, try network and update cache
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            return response;
          }
          throw new Error('Network response not ok');
        } catch (err) {
          // If offline or network fails, check cache
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response('Intel unavailable offline', { status: 503 });
        }
      })
    );
  }
});

// --- BACKGROUND SYNC & MESSAGING ---

async function cacheCity(slug: string): Promise<void> {
  const cacheName = getGuideCacheName(slug);
  const cache = await caches.open(cacheName);
  
  // Define key city assets to grab immediately
  const urlsToCache = [
    `/guide/${slug}`, 
    `/api/guide/${slug}` // Adjusted to match standard API patterns
  ];
  
  console.log(`📡 SW: Pre-caching Intel Pack for ${slug}`);
  try {
    await cache.addAll(urlsToCache);
  } catch (err) {
    console.warn(`📡 SW: Selective caching for ${slug} (some items may be missing)`, err);
  }
}

ctx.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  // Signal from CityGuideView.tsx
  if (data.type === 'CACHE_CITY' || data.type === 'CACHE_GUIDE') {
    const slug = data.citySlug || data.slug;
    if (slug) {
      event.waitUntil(cacheCity(slug));
    }
  }
});