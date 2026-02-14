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
 * UPDATED: Per-city PWA logic. 
 * This hook now resets the installation prompt whenever the citySlug changes,
 * forcing the browser to associate the install event with the NEW manifest.
 */
export function usePWAInstall(citySlug: string) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  // 1. Standalone Check (Runs on mount and slug change)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
  }, [citySlug]);

  // 2. NATIVE PROMPT LISTENER
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // CRITICAL: Clear the old prompt when the slug changes.
    // This forces the app to "wait" for a new prompt associated with the new manifest.
    setInstallPrompt(null);

    const handler = (e: Event) => {
      e.preventDefault();
      console.log(`📥 Install prompt captured for: ${citySlug}`);
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const appInstalledHandler = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setShowMobileOverlay(false);
      console.log(`✅ App successfully installed: ${citySlug}`);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, [citySlug]); // Dependency on citySlug is vital here

  const installPWA = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
      return;
    }

    if (isMobileIOSOrAndroid() && !isInstalled) {
      setShowMobileOverlay(true);
    }
  }, [installPrompt, isInstalled]);

  const dismissMobileOverlay = useCallback(() => {
    setShowMobileOverlay(false);
  }, []);

  return {
    // Only show installable if we have a prompt or it's iOS/Android
    isInstallable: !!installPrompt || (isMobileIOSOrAndroid() && !isInstalled),
    isInstalled,
    installPWA,
    showMobileOverlay,
    dismissMobileOverlay,
  };
}