import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

const SW_READY_TIMEOUT_MS = 2500

const updateSW = registerSW({
  immediate: true, // ADD THIS: ensures the SW takes control immediately on page load
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Pack ready for offline use.')
  },
})

// Prevent deadlock: if SW does not reach 'ready' within 2500ms, app proceeds with network-first.
Promise.race([
  typeof navigator !== 'undefined' && navigator.serviceWorker?.ready != null
    ? navigator.serviceWorker.ready
    : Promise.resolve(),
  new Promise<void>((r) => setTimeout(r, SW_READY_TIMEOUT_MS)),
]).catch(() => {})

/** Extract same-origin script and stylesheet URLs from the DOM for Registration Handshake */
function getPrecacheAssetUrlsFromDOM(): string[] {
  if (typeof document === 'undefined') return []
  const origin = window.location.origin
  const urls: string[] = []
  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((el) => {
    try {
      const href = el.getAttribute('src')
      if (href) {
        const url = new URL(href, origin).href
        if (url.startsWith(origin)) urls.push(url)
      }
    } catch {
      // ignore invalid URLs
    }
  })
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((el) => {
    try {
      const href = el.getAttribute('href')
      if (href) {
        const url = new URL(href, origin).href
        if (url.startsWith(origin)) urls.push(url)
      }
    } catch {
      // ignore invalid URLs
    }
  })
  return [...new Set(urls)]
}

/** Registration Handshake: send current hashed asset URLs to the SW after it is ready (no interaction with pwa_last_pack or App redirects). */
function runPrecacheHandshake(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((registration) => {
      if (!registration.active) return
      const assets = getPrecacheAssetUrlsFromDOM()
      if (assets.length === 0) return
      registration.active!.postMessage({ type: 'PRECACHE_ASSETS', assets })
    })
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

runPrecacheHandshake()