/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

/**
 * The triple-slash directive at the very top is the "magic" that 
 * provides addEventListener and skipWaiting types.
 */
declare const self: ServiceWorkerGlobalScope;
declare const __WB_MANIFEST: Array<{ url: string; revision?: string }>

// 1. Precache core engine
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 2. CRITICAL: MANIFEST BYPASS
// Never cache the dynamic manifest API
registerRoute(
  ({ url }) => url.pathname.includes('/api/manifest'),
  new NetworkOnly()
)

// 3. THE SYNC PULSE: City-specific content
registerRoute(
  ({ url }) => url.pathname.startsWith('/guide/'),
  new NetworkFirst({
    cacheName: 'city-pack-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
)

// 4. Cache the images/icons for the packs
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'pack-images',
  })
)

// 5. These will now be recognized by TS
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})