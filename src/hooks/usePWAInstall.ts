import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function isMobileIOSOrAndroid(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android/.test(ua);
}

/**
 * REFINED: Per-city PWA logic with Automatic Cleanup.
 * This hook flushes the "deferredPrompt" when the citySlug changes,
 * preventing the "Sticky City" bug where the old city is installed instead of the new one.
 */
export function usePWAInstall(citySlug: string) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  // 1. STANDALONE CHECK
  // Resets when city changes to let the browser re-evaluate display mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);
  }, [citySlug]);

  // 2. AUTOMATIC CLEANUP & EVENT LISTENER
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // --- THE "SOFT RESET" FOR THE HOOK ---
    // Immediately clear internal state when navigating to a new city.
    // This prevents the user from clicking "Download" while the hook is still 
    // holding the previous city's installation event.
    setInstallPrompt(null);
    setShowMobileOverlay(false);
    
    console.log(`🧹 Hook Cleanse: Resetting install states for ${citySlug}`);

    const handler = (e: Event) => {
      // Prevent automatic "mini-infobar" so we can trigger via our custom button
      e.preventDefault();
      console.log(`📥 New Install prompt captured for: ${citySlug}`);
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const appInstalledHandler = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setShowMobileOverlay(false);
      console.log(`🚀 Success: ${citySlug} pack added to home screen.`);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, [citySlug]); // Triggered every time the user switches cities

  // /src/hooks/usePWAInstall.ts

const installPWA = useCallback(async () => {
  // 1. Browser-native Install Prompt (Chrome/Edge/Android)
  if (installPrompt) {
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
    return;
  }

  // 2. iOS/Mobile Fallback (Show the "Add to Home Screen" overlay)
  if (isMobileIOSOrAndroid() && !isInstalled) {
    setShowMobileOverlay(true);
    return;
  }

  // 3. DESKTOP/LAPTOP FALLBACK (Manual Sync)
  // If we can't install as an app, at least make it work offline in the browser.
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log(`📡 Triggering background sync for: ${citySlug}`);
    
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_CITY',
      citySlug: citySlug
    });

    // Provide immediate feedback since there is no system dialog
    alert("Pack downloaded! This guide is now available offline in this browser.");
  } else {
    alert("Offline mode is not supported by this browser.");
  }
}, [installPrompt, isInstalled, citySlug]);

  const dismissMobileOverlay = useCallback(() => {
    setShowMobileOverlay(false);
  }, []);

  return {
    isInstallable: !!installPrompt || (isMobileIOSOrAndroid() && !isInstalled),
    isInstalled,
    installPWA,
    showMobileOverlay,
    dismissMobileOverlay,
    // Debug helper to see if the browser has "recognized" the new city yet
    hasActivePrompt: !!installPrompt 
  };
}