// /Users/danielmeier/Desktop/Downloadable_Travel-Packs/vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'node:fs'

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

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [
    react(),
    tailwindcss(),
    copyCitiesJson(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: null, // Manual registration via CityGuideView
      registerType: 'autoUpdate',
      manifest: false,      // Allows Dynamic Blob Manifest to work
      injectManifest: {
        rollupFormat: 'iife',
        maximumFileSizeToCacheInBytes: 3000000,
        injectionPoint: undefined, // Bypasses the "Unable to find place to inject" error
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })
  ],
})