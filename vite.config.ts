import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path' // 1. Added for alias resolution

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 2. Critical: This links @ to your src folder
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: null, 
      scope: '/',
      // Note: We keep a minimal base manifest for the shell, 
      // but CityView will override this with dynamic links.
      manifest: {
        name: 'TravelPacks V2',
        short_name: 'TravelPacks',
        description: 'Survival info, transit & scams by city',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        cacheId: 'tp-v2-main-reset', // Bumped ID to clear any old stale caches
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//, 
          /^\/manifests\//, 
          /manifest\.json$/, // Prevent SW from intercepting manifest requests
          /\.webmanifest$/
        ],
        runtimeCaching: [
          {
            // City Guide Data: Try network first for "Live Sync"
            urlPattern: ({ url }) => url.pathname.startsWith('/guide/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tp-v2-guide-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20 }
            },
          },
          {
            // Static Assets: Use cache first to ensure offline availability
            urlPattern: /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tp-v2-static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})