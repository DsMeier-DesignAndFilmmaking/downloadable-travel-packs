/// <reference lib="webworker" />


const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v2';

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
  ctx.skipWaiting();
});

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('navigationPreload' in ctx.registration) {
        await ctx.registration.navigationPreload.enable();
      }
      await ctx.clients.claim();
      
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

// --- FETCH HANDLER ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== ctx.location.origin) return;

  // 1. THE "WHITE SCREEN" FIX: SPA NAVIGATION FALLBACK
  // This intercepts page loads (e.g., /guide/tokyo) and serves the app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // If network fails (offline), serve the cached index.html
        const cache = await caches.match('/index.html');
        if (cache) return cache;
        
        // Final fallback if even index.html is missing
        return new Response("Offline: App Shell not available", { 
          status: 503, 
          headers: { 'Content-Type': 'text/html' } 
        });
      })
    );
    return;
  }

  // 2. IDENTITY BYPASS (Manifests)
  // Network-First strategy to ensure city icons/names swap correctly
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

  // 4. GUIDE DATA (API Data)
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

function getOfflinePageHtml(slug: string): string {
  return `<!DOCTYPE html><html lang="en">
    <head><meta charset="utf-8"><title>Offline</title></head>
    <body style="font-family:sans-serif; padding: 40px; text-align:center;">
      <h2>Intel Pack Offline</h2>
      <p>The guide for <b>${slug}</b> is available, but you need an internet connection for live updates.</p>
    </body></html>`;
}

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

  if (data.type === 'CACHE_CITY' || data.type === 'CACHE_GUIDE') {
    const slug = data.citySlug || data.slug;
    if (slug) event.waitUntil(cacheCity(slug));
  }
});