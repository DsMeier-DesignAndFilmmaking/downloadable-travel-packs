import { useState, useEffect, useCallback } from 'react'
import { MANIFEST_URL } from '@/services/apiConfig'

const MANIFEST_LINK_ID = 'tp-v2-dynamic-manifest'

/**
 * usePWAInstall(citySlug) — City-aware PWA install hook.
 * - Keeps <link rel="manifest"> in sync with the current city so the browser
 *   sees a different PWA "ID" per pack (e.g. Rome vs Istanbul).
 * - Exposes isInstalled (standalone), install prompt, and showMobileOverlay
 *   for "Share >> Add to Home Screen" instructions on iOS/Android.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

function isMobileIOSOrAndroid(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|android/.test(ua)
}

export function usePWAInstall(citySlug: string) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)

  // 1. Dynamic manifest: point <link rel="manifest"> at the current city’s manifest.
  useEffect(() => {
    if (!citySlug) return

    let link = document.querySelector<HTMLLinkElement>(`link[rel="manifest"]`)
    if (!link) {
      link = document.createElement('link')
      link.id = MANIFEST_LINK_ID
      link.rel = 'manifest'
      document.head.appendChild(link)
    } else {
      link.id = MANIFEST_LINK_ID
    }
    link.href = MANIFEST_URL(citySlug)

    return () => {
      const el = document.getElementById(MANIFEST_LINK_ID)
      if (el?.parentNode) el.parentNode.removeChild(el)
    }
  }, [citySlug])

  // 2. Standalone detection + beforeinstallprompt / appinstalled
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const appInstalledHandler = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', appInstalledHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [])

  const installPWA = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      return
    }
    // No native prompt (e.g. iOS): show "Share >> Add to Home Screen" instructions.
    if (isMobileIOSOrAndroid()) {
      setShowMobileOverlay(true)
    }
  }, [installPrompt])

  const dismissMobileOverlay = useCallback(() => {
    setShowMobileOverlay(false)
  }, [])

  return {
    isInstallable: !!installPrompt,
    isInstalled,
    installPWA,
    showMobileOverlay,
    dismissMobileOverlay,
  }
}
