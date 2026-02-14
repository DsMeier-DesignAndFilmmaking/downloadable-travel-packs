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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)