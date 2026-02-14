import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'node:fs'

/** Copy cities.json into build output for offline/fallback use. */
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

/**
 * PWA / Service worker strategy (vite-plugin-pwa):
 * - Manual registration: injectRegister: null — we register in main.tsx (root) and per-guide in CityGuideView.
 * - No precaching: injectionPoint: undefined — no __WB_MANIFEST; only per-guide runtime caching.
 * - Runtime caching (guide data + images) is in src/sw.ts; plugin compiles it to dist/sw.js.
 *
 * Alternative (no plugin): remove VitePWA; add a Vite plugin that copies src/sw.ts → dist/sw.js (e.g. esbuild
 * or rollup to compile TS), and ensure index.html is not modified. Register SW in main.tsx with
 * navigator.serviceWorker.register('/sw.js', { scope: '/' }). Manifest would be static (e.g. public/manifest.webmanifest).
 */
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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Manual registration: app registers SW in main.tsx and per-guide in CityGuideView; no auto-injected script
      injectRegister: null,
      // Plugin only supports 'autoUpdate' | 'prompt'; we use injectRegister: null for manual/per-guide registration
      registerType: 'prompt',
      scope: '/',
      manifest: {
        name: 'TravelPacks',
        short_name: 'TravelPacks',
        description: 'Downloadable travel packs — survival, emergency & arrival. Works offline.',
        start_url: '/',
        id: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
      },
      injectManifest: {
        rollupFormat: 'iife',
        maximumFileSizeToCacheInBytes: 3000000,
        // Disable precaching: no __WB_MANIFEST; SW in src/sw.ts caches only per-guide at runtime
        injectionPoint: undefined,
        // Built SW is emitted to dist/sw.js by the plugin (no separate copy step)
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})