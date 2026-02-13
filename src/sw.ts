/**
 * Custom Service Worker — injectManifest strategy.
 * Precache static assets; NetworkFirst for /guide/ = "Sync Pulse": online → fresh city data, offline → last cached for that city.
 */
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

declare const __WB_MANIFEST: Array<{ url: string; revision?: string }>

precacheAndRoute(self.__WB_MANIFEST)

// THE SYNC PULSE: city guide data — if online, latest Istanbul/Rome data; if offline, last cached version for that city
registerRoute(
  ({ url }) => url.pathname.startsWith('/guide/'),
  new NetworkFirst({
    cacheName: 'city-pack-cache',
  })
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
