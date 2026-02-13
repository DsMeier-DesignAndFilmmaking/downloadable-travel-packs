/**
 * Custom Service Worker — injectManifest strategy.
 * Sync Pulse: NetworkFirst for /guide/ (fresh city data when online, cached when offline);
 * CacheFirst for images; precache + cleanup.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

declare const __WB_MANIFEST: Array<{ url: string; revision?: string }>

// 1. Precache the core engine (JS/CSS/Assets)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 2. THE SYNC PULSE: City-specific content — online → latest data; offline → cached pack
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

// 3. Cache the images/icons for the packs
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'pack-images',
  })
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
