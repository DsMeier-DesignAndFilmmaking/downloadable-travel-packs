/// <reference lib="webworker" />

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v3';
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v3';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/pwa-192x192.png',
  '/vite.svg'
];

// --- HELPERS ---

function getGuideSlugFromUrl(url: URL): string | null {
  const guideMatch = url.pathname.match(/^\/guide\/([^/?#]+)\/?$/);
  if (guideMatch) return guideMatch[1];
  return null;
}

function getGuideCacheName(slug: string): string {
  return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
}

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== ctx.location.origin) return;

  // 1. NAVIGATION (The "White Screen" Fix)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const match = (await cache.match('/')) || (await cache.match('/index.html'));
        // FIX: Provide a fallback Response instead of undefined
        return match || new Response("Offline: Shell missing", { status: 503 });
      })
    );
    return;
  }

  // 2. VITE ASSETS (Scripts/Styles)
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
          // FIX: Ensure we return a Response, even on 404
          return cachedMatch || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 3. IMAGES
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

  // 4. CITY DATA
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
          // FIX: Final fallback response
          return cachedMatch || new Response('Data unavailable offline', { status: 503 });
        }
      })
    );
  }
});

// ... (Rest of your messaging and install logic)