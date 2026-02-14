// /Users/danielmeier/Desktop/Downloadable_Travel-Packs/vite.config.ts
import { defineConfig } from 'vite'
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    copyCitiesJson(),
    // Inside VitePWA() configuration:
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  injectRegister: null,
  registerType: 'prompt',
  manifest: false, 
  injectManifest: {
    rollupFormat: 'iife',
    maximumFileSizeToCacheInBytes: 3000000,
    // ADD THIS: Explicitly cache the shell and icons
    globPatterns: [
      '**/*.{js,css,html}',  // Merged: covers index.html AND all assets
          'pwa-192x192.png',     // Specific icon for Share Panel
          'pwa-512x512.png',     // Specific icon for Home Screen
          'vite.svg'
    ],
  },
  devOptions: {
    enabled: true,
    type: 'module',
  },
})
  ],
})