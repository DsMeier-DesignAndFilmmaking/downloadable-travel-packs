/// <reference lib="webworker" />

const ctx = self as unknown as ServiceWorkerGlobalScope;
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'travel-guide';
const IMAGES_CACHE_NAME = 'guide-images-v1';

let currentCitySlug: string | null = null;

/**
 * Extract city guide slug from a request URL.
 * Matches /guide/{slug} or /api/manifest/{slug}
 */
function getGuideSlugFromUrl(url: URL): string | null {
  const guideMatch = url.pathname.match(/^\/guide\/([^/]+)\/?$/);
  if (guideMatch) return guideMatch[1];
  const apiMatch = url.pathname.match(/^\/api\/manifest\/([^/]+)$/);
  if (apiMatch) return apiMatch[1];
  return null;
}

/**
 * Cache name for a specific guide only (e.g. "travel-guide-tokyo-japan-v1").
 */
function getGuideCacheName(slug: string): string {
  return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
}

// ---------------------------------------------------------------------------
// Install: no full precache; guide caches are filled on first fetch or via CACHE_GUIDE
// ---------------------------------------------------------------------------

ctx.addEventListener('install', () => {
  ctx.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate: claim clients and clean old guide caches
// ---------------------------------------------------------------------------

ctx.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('navigationPreload' in ctx.registration) {
        await ctx.registration.navigationPreload.enable();
      }
      await ctx.clients.claim();

      // Remove caches that don't match current prefix/version
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => {
          if (!name.startsWith(CACHE_PREFIX)) return false;
          const suffix = name.slice(CACHE_PREFIX.length);
          return !suffix.endsWith(CACHE_VERSION);
        }).map((name) => caches.delete(name))
      );
    })()
  );
});

// ---------------------------------------------------------------------------
// Fetch: guide data (doc + api) per-guide cache-first; images cache-first
// ---------------------------------------------------------------------------

ctx.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== ctx.location.origin) return;

  // Runtime caching: images (cache-first, shared cache)
  if (request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok && response.type !== 'error') cache.put(request, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) ?? new Response('', { status: 504, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  const slug = getGuideSlugFromUrl(url);
  if (slug === null) {
    // Not a guide request: do not cache (no home page, no other guides)
    return;
  }

  const cacheName = getGuideCacheName(slug);

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok && response.type !== 'error') {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.open(cacheName).then((c) => c.match(request));
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return new Response(
            getOfflinePageHtml(slug),
            { headers: new Headers({ 'Content-Type': 'text/html;charset=utf-8' }) }
          );
        }
        throw new Error('Offline and not cached');
      }
    })()
  );
});

function getOfflinePageHtml(slug: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline – Guide</title></head><body><p>You're offline. This guide (${slug}) is cached; reload when back online to use the full app.</p></body></html>`;
}

/**
 * Cache a city guide: guide page + manifest API. Used by CACHE_CITY / CACHE_GUIDE.
 */
async function cacheCity(slug: string): Promise<void> {
  const cacheName = getGuideCacheName(slug);
  const cache = await caches.open(cacheName);

  const urlsToCache = [
    `/guide/${slug}`,
    `/api/manifest/${slug}`,
  ];

  console.log('📥 Caching URLs:', urlsToCache);
  await cache.addAll(urlsToCache);
  console.log('✅ Cached', urlsToCache.length, 'URLs for', slug);
}

// ---------------------------------------------------------------------------
// Message handlers for manual caching commands
// ---------------------------------------------------------------------------

ctx.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; slug?: string; citySlug?: string } | undefined;
  if (!data?.type) return;

  const source = event.source as unknown as { postMessage?(payload: unknown): void } | null;

  switch (data.type) {
    case 'SKIP_WAITING':
      ctx.skipWaiting();
      break;

    case 'CACHE_CITY': {
      const citySlug = data.citySlug;
      if (!citySlug || typeof citySlug !== 'string') {
        source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: false, error: 'Missing citySlug' });
        return;
      }
      currentCitySlug = citySlug;
      console.log('📦 Will cache city:', currentCitySlug);
      event.waitUntil(
        cacheCity(citySlug).then(() => {
          source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: true, slug: citySlug });
        }).catch((err) => {
          source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: false, error: String(err) });
        })
      );
      break;
    }

    case 'CACHE_GUIDE': {
      const slug = data.slug;
      if (!slug || typeof slug !== 'string') {
        source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: false, error: 'Missing slug' });
        return;
      }
      event.waitUntil(
        cacheCity(slug).then(() => {
          source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: true, slug });
        }).catch((err) => {
          source?.postMessage?.({ type: 'CACHE_GUIDE_RESULT', success: false, error: String(err) });
        })
      );
      break;
    }

    case 'GET_CACHED_GUIDES': {
      event.waitUntil(
        (async () => {
          try {
            const names = await caches.keys();
            const guides = names
              .filter((n) => n.startsWith(CACHE_PREFIX) && n.endsWith(CACHE_VERSION))
              .map((n) => n.slice(CACHE_PREFIX.length + 1, n.length - CACHE_VERSION.length - 1));
            source?.postMessage?.({ type: 'CACHED_GUIDES', slugs: guides });
          } catch (err) {
            source?.postMessage?.({ type: 'CACHED_GUIDES', slugs: [], error: String(err) });
          }
        })()
      );
      break;
    }

    case 'CLEAR_GUIDE': {
      const slug = data.slug;
      if (!slug || typeof slug !== 'string') {
        source?.postMessage?.({ type: 'CLEAR_GUIDE_RESULT', success: false, error: 'Missing slug' });
        return;
      }
      event.waitUntil(
        (async () => {
          try {
            const deleted = await caches.delete(getGuideCacheName(slug));
            source?.postMessage?.({ type: 'CLEAR_GUIDE_RESULT', success: true, slug, deleted });
          } catch (err) {
            source?.postMessage?.({ type: 'CLEAR_GUIDE_RESULT', success: false, error: String(err) });
          }
        })()
      );
      break;
    }
  }
});
