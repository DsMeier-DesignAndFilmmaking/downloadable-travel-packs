/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V5
 * Status: Offline shell + entry bundles precache, SWR for scripts, rock-solid nav fallback
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v7'; // Bump for install bundle precache + SWR + catch-all
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

// Assets to keep the "frame" of the app working offline
const SHELL_ASSETS = ['/', '/index.html', '/pwa-192x192.png', '/vite.svg'];

/** Absolute URL for the app shell (index.html) — used for navigation fallback */
function getShellDocumentUrl(): string {
  return new URL('/index.html', ctx.location.origin).href;
}

/** Parse index.html and return same-origin script/link asset URLs (e.g. /assets/*.js, *.css) */
async function getEntryAssetUrls(): Promise<string[]> {
  const base = ctx.location.origin;
  try {
    const res = await fetch(new URL('/index.html', base).href, { cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];
    const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    const linkRelHref = /<link[^>]*rel\s*=\s*["']?[^"']*stylesheet[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;
    const linkHrefRel = /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*stylesheet[^"']*["']/gi;
    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = linkRelHref.exec(html)) !== null) urls.push(m[1]);
    while ((m = linkHrefRel.exec(html)) !== null) urls.push(m[1]);
    return urls
      .map(href => (href.startsWith('http') ? href : new URL(href, base).href))
      .filter(href => href.startsWith(base) && (href.includes('/assets/') || href.endsWith('.js') || href.endsWith('.css')));
  } catch {
    return [];
  }
}

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
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      for (const asset of SHELL_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn(`📡 SW: Could not pre-cache ${asset}`);
        }
      }
      const entryUrls = await getEntryAssetUrls();
      for (const url of entryUrls) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn(`📡 SW: Could not pre-cache entry asset ${url}`);
        }
      }
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

  // 1. Navigation Fallback (Home Screen / deep link) — always return shell for SPA
  if (request.mode === 'navigate') {
    const shellUrl = getShellDocumentUrl();
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const match = await cache.match(shellUrl) || await cache.match(new URL('/', ctx.location.origin).href);
        return match || new Response('Offline: Shell not cached', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // 2. Critical Assets (Vite JS/CSS) — Stale-While-Revalidate
  if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const revalidate = () => {
          fetch(request).then((netRes) => {
            if (netRes.ok) cache.put(request, netRes.clone());
          }).catch(() => {});
        };
        if (cached) {
          revalidate();
          return cached;
        }
        try {
          const netRes = await fetch(request);
          if (netRes.ok) cache.put(request, netRes.clone());
          return netRes;
        } catch {
          return cached || new Response('Asset unavailable offline', { status: 404, headers: { 'Content-Type': 'text/plain' } });
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

  // 4. CITY DATA API (CACHE_CITY messaging — do not remove)
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
          return cachedMatch || new Response('Intel unavailable offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })
    );
    return;
  }

  // 5. Catch-all: avoid undefined response (white screen). Same-origin only.
  event.respondWith(
    caches.match(request).then((m) => m || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
  );
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