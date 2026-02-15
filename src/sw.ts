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
      // Primary entry points first (prevents white screen on offline launch)
      try {
        await cache.add('/');
        await cache.add('/index.html');
      } catch (e) {
        console.warn('📡 SW: Could not pre-cache primary entry points', e);
      }
      for (const asset of SHELL_ASSETS) {
        if (asset === '/' || asset === '/index.html') continue;
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

  // CRITICAL: Navigation Fallback for Standalone (prevents Safari "No Internet" error)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE_NAME);
        const base = ctx.location.origin;
        const fallbackUrl = new URL('/', base).href;
        const indexUrl = new URL('/index.html', base).href;
        const match = await cache.match(fallbackUrl) || await cache.match(indexUrl);
        if (match) return match;
        return new Response("Offline entry point not found. Please open once while online.", {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
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

/** Precache asset URLs sent from the client (Registration Handshake). Same-origin only; uses cache.addAll. */
async function precacheAssetUrls(assetUrls: unknown): Promise<void> {
  if (!Array.isArray(assetUrls)) return;
  const origin = ctx.location.origin;
  const urls = assetUrls
    .filter((u): u is string => typeof u === 'string')
    .map((u) => {
      try {
        return new URL(u, origin).href;
      } catch {
        return '';
      }
    })
    .filter((href) => href.startsWith(origin) && href.length > 0);
  if (urls.length === 0) return;
  try {
    const cache = await caches.open(SHELL_CACHE_NAME);
    await cache.addAll(urls);
  } catch (e) {
    console.warn('📡 SW: PRECACHE_ASSETS addAll failed', e);
  }
}

// Inside sw.ts
ctx.addEventListener('message', (event) => {
  // Existing City Data Logic
  if (event.data?.type === 'CACHE_CITY' || event.data?.type === 'CACHE_GUIDE') {
    const slug = event.data.citySlug || event.data.slug;
    if (slug) event.waitUntil(cacheCityIntel(slug));
  }

  // Proactive Asset Caching (shell: scripts + stylesheets)
  if (event.data?.type === 'PRECACHE_ASSETS') {
    const { assets } = event.data;
    event.waitUntil(
      precacheAssetUrls(assets)
    );
  }

  // Proactive Image Caching (media from city content)
  if (event.data?.type === 'PRECACHE_IMAGES') {
    const { urls } = event.data;
    event.waitUntil(precacheImageUrls(urls));
  }
});

/** Precache image URLs into IMAGES_CACHE_NAME. Same-origin only. */
async function precacheImageUrls(urls: unknown): Promise<void> {
  if (!Array.isArray(urls)) return;
  const origin = ctx.location.origin;
  const validUrls = urls
    .filter((u): u is string => typeof u === 'string')
    .map((u) => {
      try {
        return new URL(u, origin).href;
      } catch {
        return '';
      }
    })
    .filter((href) => href.startsWith(origin) && href.length > 0);
  if (validUrls.length === 0) return;
  try {
    const cache = await caches.open(IMAGES_CACHE_NAME);
    await Promise.all(
      validUrls.map((url) =>
        cache.add(url).catch((e) => console.warn(`SW: PRECACHE_IMAGES failed for ${url}`, e))
      )
    );
  } catch (e) {
    console.warn('SW: PRECACHE_IMAGES addAll failed', e);
  }
}