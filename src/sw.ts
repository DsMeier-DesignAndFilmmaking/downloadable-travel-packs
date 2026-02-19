/// <reference lib="webworker" />

/**
 * SERVICE WORKER: TRAVEL PACK CORE - V10 (Single-City Lock Edition)
 * Goal: Solid offline boot for Home Screen instances with specific city isolation.
 */

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v10';
const CACHE_PREFIX = 'travel-guide';

const SHELL_CACHE_NAME = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = 'guide-images-v6';

const START_URL_PATH = '/';
const SHELL_ASSETS = [START_URL_PATH, '/index.html', '/pwa-192x192.png', '/vite.svg'];

/**
 * Last-resort HTML if the user opens a non-synced city while offline.
 */
const SAFETY_BOOTSTRAPPER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offline | Travel Pack</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }
    .container { padding: 24px; max-width: 400px; }
    h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #94a3b8; line-height: 1.5; margin-bottom: 2rem; }
    button { background: #3b82f6; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    button:active { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Intel Unavailable Offline</h2>
    <p>This city pack hasn't been synced to this device yet. Please connect to the internet to download this guide.</p>
    <button onclick="window.location.href='/'">Return to Search</button>
  </div>
</body>
</html>
`.trim();

// --- UTILS ---

/**
 * Type-safe error response helper
 */
function createErrorResponse(message: string, status = 503): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/** * Scans index.html for Vite-hashed assets to prevent white-screens on version updates.
 */
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

    return [...new Set(urls)]
      .map((href) => (href.startsWith('http') ? href : new URL(href, base).href))
      .filter((href) => href.startsWith(base));
  } catch { return []; }
}

// --- LIFECYCLE ---

ctx.addEventListener('install', (event) => {
  ctx.skipWaiting(); 
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const entryUrls = await getEntryAssetUrls();
      await cache.addAll([...new Set([...SHELL_ASSETS, ...entryUrls])]);
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
          .filter(name => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION) && !name.includes('sync'))
          .map(name => caches.delete(name))
      );
      await ctx.clients.claim();
      console.log('⚡ SW: Claimed all clients and purged old caches.');
    })()
  );
});

// --- FETCH HANDLERS (THE LOCK) ---

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. NAVIGATION LOCK: Ensure direct-to-city booting
  if (request.mode === 'navigate') {
    event.respondWith(
      (async (): Promise<Response> => {
        try {
          // Always try network first to ensure fresh intelligence if online
          return await fetch(request);
        } catch (error) {
          // OFFLINE: Search ALL available caches for the specific city route
          // This matches /guide/seoul or /guide/seoul?source=pwa
          const match = await caches.match(request);
          if (match) return match;

          // Fallback: Try to serve the root Shell index.html
          const shellCache = await caches.open(SHELL_CACHE_NAME);
          const shellMatch = await shellCache.match('/index.html');
          
          if (shellMatch) return shellMatch;

          // Ultimate Fallback: Custom HTML error page
          return new Response(SAFETY_BOOTSTRAPPER_HTML, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
      })()
    );
    return;
  }

  // 2. ASSETS & DATA: Cache-First Strategy
  event.respondWith(
    (async (): Promise<Response> => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkRes = await fetch(request);
        
        if (networkRes.ok) {
          const isImg = request.destination === 'image';
          const isAsset = url.pathname.includes('/assets/');
          if (isImg || isAsset) {
            const cache = await caches.open(isImg ? IMAGES_CACHE_NAME : SHELL_CACHE_NAME);
            cache.put(request, networkRes.clone());
          }
        }
        return networkRes;
      } catch (err) {
        return createErrorResponse('Offline Content Unavailable', 503);
      }
    })()
  );
});

// --- ATOMIC SYNC ENGINE (PRE-INSTALLER) ---

async function cacheCityIntel(slug: string) {
  const cityCacheName = `${CACHE_PREFIX}-sync-${slug}-${CACHE_VERSION}`;
  const cache = await caches.open(cityCacheName);

  // 1. CRITICAL: These MUST succeed for the "Add to Home Screen" to work
  const criticalUrls = [
    `/guide/${slug}`,
    `/guide/${slug}?source=pwa`,
    '/index.html'
  ];

  // 2. OPTIONAL: This is the one hitting the 429 Rate Limit
  const dataUrls = [`/api/guide/${slug}`];

  console.log(`📡 SW: Starting Resilient Sync for ${slug}...`);

  try {
    // SYNC CRITICAL ASSETS (Use Promise.all - fails if any critical fail)
    await Promise.all(
      criticalUrls.map(async (url) => {
        const res = await fetch(url, { cache: 'reload' });
        if (!res.ok) throw new Error(`Critical Asset Missing: ${url}`);
        return cache.put(url, res);
      })
    );

    // SYNC DATA ASSETS (Use Promise.allSettled - survives 429 errors)
    const dataResults = await Promise.allSettled(
      dataUrls.map(async (url) => {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) return cache.put(url, res);
        console.warn(`⚠️ SW: Data asset skipped (likely rate limit): ${url}`);
      })
    );

    console.log(`🔒 SW: ${slug} infrastructure secured.`);

    // SUCCESS: Notify UI that the pack is ready to be "Added to Home Screen"
    const clients = await ctx.clients.matchAll();
    clients.forEach((c) => {
      c.postMessage({ 
        type: 'SYNC_COMPLETE', 
        slug 
      });
    });

  } catch (error) {
    console.error(`❌ SW: Atomic sync failed for ${slug}:`, error);
    
    // ERROR: Only notify error if the Page Shell itself failed to download
    const clients = await ctx.clients.matchAll();
    clients.forEach((c) => {
      c.postMessage({ 
        type: 'SYNC_ERROR', 
        slug 
      });
    });
  }
}

ctx.addEventListener('message', (event) => {
  const { type, slug, citySlug } = event.data;
  const targetSlug = slug || citySlug;

  if (type === 'START_CITY_SYNC' || type === 'ATOMIC_CITY_SYNC') {
    if (targetSlug) event.waitUntil(cacheCityIntel(targetSlug));
  }
});