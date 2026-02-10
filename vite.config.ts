import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'node:fs'

/** Copy cities.json into build output so Workbox can precache it for 100% offline. */
function copyCitiesJson() {
  return {
    name: 'copy-cities-json',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ?? 'dist'
      const src = path.resolve(__dirname, 'src/data/cities.json')
      const destDir = path.resolve(__dirname, outDir, 'data')
      const dest = path.join(destDir, 'cities.json')
      if (!fs.existsSync(src)) return
      fs.mkdirSync(destDir, { recursive: true })
      fs.copyFileSync(src, dest)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    copyCitiesJson(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: null,
      scope: '/',
      manifest: {
        name: 'Travel Pack',
        short_name: 'Travel Pack',
        description: 'Superior travel packs — survival, emergency & arrival. Works offline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/?utm_source=pwa',
      },
      workbox: {
        cacheId: 'tp-v2-main-reset',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', '**/data/cities.json'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/manifests\//,
          /manifest\.json$/,
          /\.webmanifest$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/guide/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tp-v2-guide-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20 },
            },
          },
          {
            urlPattern: /\/data\/cities\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tp-v2-cities-json',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
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