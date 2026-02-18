/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V9 (Atomic Sync Edition)
 * Goal: Solid offline boot for Home Screen instances via navigation pre-heating.
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v9';
const CACHE_PREFIX = 'travel-guide';
const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

/** Path used as start_url in manifest. Must be cached for PWA launch. */
const START_URL_PATH = '/';
const SHELL_ASSETS = [START_URL_PATH, '/index.html', '/pwa-192x192.png', '/vite.svg'];

// --- UTILS ---

function createErrorResponse(message: string, status = 503): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

const SAFETY_BOOTSTRAPPER_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title></head><body><script>window.location.reload();</script><p>Reloading…</p></body></html>';

async function getEntryAssetUrls(): Promise<string[]> {
  const base = ctx.location.origin;
  try {
    const res = await fetch(new URL('/index.html', base).href, { cache: 'no-store' });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];

    const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    const styleRe = /<link[^>]*rel\s*=\s*["']?[^"']*stylesheet[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;
    const modulePreloadRe = /<link[^>]*rel\s*=\s*["']?[^"']*modulepreload[^"']*["']?[^>]*href\s*=\s*["']([^"']+)["']/gi;

    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = styleRe.exec(html)) !== null) urls.push(m[1]);
    while ((m = modulePreloadRe.exec(html)) !== null) urls.push(m[1]);

    const absolute = urls
      .map((href) => (href.startsWith('http') ? href : new URL(href, base).href))
      .filter((href) => href.startsWith(base));
    return [...new Set(absolute)];
  } catch {
    return [];
  }
}

// --- LIFECYCLE ---

ctx.addEventListener('install', (event) => {
  ctx.skipWaiting(); 
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const entryUrls = await getEntryAssetUrls();
      const allCriticalAssets = [...new Set([...SHELL_ASSETS, ...entryUrls])];
      await cache.addAll(allCriticalAssets);
      console.log('✅ SW: Shell Assets fully cached.');
    })()
  );
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
      console.log('⚡ SW: Claimed all clients.');
    })()
  );
});

// --- FETCH HANDLERS ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url); 

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Try exact match first (pre-heated city route)
        const exactMatch = await caches.match(request);
        if (exactMatch) return exactMatch;

        // Fallback to Shell
        const cache = await caches.open(SHELL_CACHE_NAME);
        const shellFallback = (await cache.match('/index.html')) || (await cache.match('/'));
        if (shellFallback) return shellFallback;

        return new Response(SAFETY_BOOTSTRAPPER_HTML, { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Assets & Images
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkRes = await fetch(request);
        if (networkRes.ok && (request.destination === 'image' || url.pathname.includes('/assets/'))) {
          const cache = await caches.open(request.destination === 'image' ? IMAGES_CACHE_NAME : SHELL_CACHE_NAME);
          cache.put(request, networkRes.clone());
        }
        return networkRes;
      } catch {
        return createErrorResponse('Offline', 503);
      }
    })()
  );
});

// --- ATOMIC SYNC ENGINE ---

async function cacheCityIntel(slug: string) {
  const cacheName = `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
  const cache = await caches.open(cacheName);

  // CRITICAL: Fetching as same-origin to avoid the 'navigate' TypeError.
  // Including '/' because manifest start_url points to root.
  // Including '/guide/${slug}' so the bookmark icon works instantly offline.
  const urlsToCache = [
    '/',
    '/index.html',
    `/guide/${slug}`,
    `/api/guide/${slug}`
  ];

  console.log(`📡 SW: Starting atomic sync for ${slug}...`);

  await Promise.allSettled(urlsToCache.map(async (url) => {
    try {
      // Standard fetch - NO RequestInit mode: 'navigate' here.
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res);
    } catch (e) {
      console.error(`❌ SW: Failed to cache ${url}`, e);
    }
  }));

  // Notify UI of success
  const clients = await ctx.clients.matchAll();
  clients.forEach((c) => {
    c.postMessage({ type: 'SYNC_COMPLETE', slug });
  });
}

ctx.addEventListener('message', (event) => {
  const { type, slug, citySlug } = event.data;
  const targetSlug = slug || citySlug;

  if (type === 'START_CITY_SYNC' || type === 'ATOMIC_CITY_SYNC') {
    if (!targetSlug) return;
    event.waitUntil(cacheCityIntel(targetSlug));
  }
});