import { useState, useEffect, useCallback } from 'react';

/**
 * BeforeInstallPromptEvent interface for Chrome/Android native prompts.
 */
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
 * Single app-wide PWA: manifest is served from build (start_url and id "/", scope "/").
 * No per-city manifest or version params to avoid URL pollution and "sticky pack" installs.
 * citySlug kept for API compatibility; install is now app-wide.
 */
export function usePWAInstall(_citySlug: string) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  // INSTALLATION STATE & NATIVE PROMPTS (manifest comes from index.html / build)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const handler = (e: Event) => {
      // Prevent the default mini-infobar on Android
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const appInstalledHandler = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setShowMobileOverlay(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const installPWA = useCallback(async () => {
    // If native prompt is available (Chrome/Android/Desktop)
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
      return;
    }

    // If no native prompt (Safari/iOS), show our custom mobile overlay instructions
    if (isMobileIOSOrAndroid() && !isInstalled) {
      setShowMobileOverlay(true);
    }
  }, [installPrompt, isInstalled]);

  const dismissMobileOverlay = useCallback(() => {
    setShowMobileOverlay(false);
  }, []);

  return {
    isInstallable: !!installPrompt || (isMobileIOSOrAndroid() && !isInstalled),
    isInstalled,
    installPWA,
    showMobileOverlay,
    dismissMobileOverlay,
  };
}