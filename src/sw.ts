/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope;
declare const __WB_MANIFEST: Array<{ url: string; revision?: string }>

/**
 * 1. LIFECYCLE MANAGEMENT
 * Fixes the "Accessing Field Intel" hang by forcing the SW to become active 
 * and take control of the page immediately upon installation.
 */
self.addEventListener('install', () => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if supported (Optimizes first-load speed)
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Tell the active service worker to take control of all open clients.
      await self.clients.claim();
    })()
  );
});

/**
 * 2. PRECACHING & ASSETS
 */
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

/**
 * 3. CRITICAL: MANIFEST BYPASS
 * Ensures the unique identity of Tokyo vs NYC is always fetched fresh.
 */
registerRoute(
  ({ url }) => url.pathname.includes('/api/manifest'),
  new NetworkOnly()
)

/**
 * 4. THE SYNC PULSE: City-specific content
 * Using NetworkFirst ensures we show fresh data if online,
 * but fall back to the "Field Intel" we stored earlier if offline.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/guide/'),
  new NetworkFirst({
    cacheName: 'city-pack-data',
    networkTimeoutSeconds: 5, // Fallback to cache quickly if network is spotty
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
)

/**
 * 5. IMAGE CACHING
 */
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'pack-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
)

/**
 * 6. EXTERNAL CONTROLS
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})