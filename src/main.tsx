import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { posthogClient as posthog } from './lib/analytics'
import { PostHogProvider } from '@posthog/react'

import App from './App'
import './index.css'

const SW_READY_TIMEOUT_MS = 2500

const updateSW = registerSW({
  immediate: true, 
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Pack ready for offline use.')
  },
})

// Prevent deadlock: if SW does not reach 'ready' within timeout, proceed.
Promise.race([
  navigator.serviceWorker?.ready ?? Promise.resolve(),
  new Promise<void>((r) => setTimeout(r, SW_READY_TIMEOUT_MS)),
]).catch(() => {})

function getPrecacheAssetUrlsFromDOM(): string[] {
  const origin = window.location.origin
  const urls: string[] = []
  
  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((el) => {
    const src = el.getAttribute('src')
    if (src) {
      const url = new URL(src, origin).href
      if (url.startsWith(origin)) urls.push(url)
    }
  })
  
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((el) => {
    const href = el.getAttribute('href')
    if (href) {
      const url = new URL(href, origin).href
      if (url.startsWith(origin)) urls.push(url)
    }
  })
  return [...new Set(urls)]
}

function runPrecacheHandshake(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((registration) => {
      if (!registration.active) return
      const assets = getPrecacheAssetUrlsFromDOM()
      if (assets.length === 0) return
      registration.active.postMessage({ type: 'PRECACHE_ASSETS', assets })
    })
    .catch(() => {})
}

// 2. Wrap the App with PostHogProvider
const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    </React.StrictMode>
  )
}

runPrecacheHandshake()