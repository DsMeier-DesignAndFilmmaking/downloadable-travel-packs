import { useState, useEffect, useCallback } from 'react';
import { MANIFEST_URL } from '@/services/apiConfig';

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

export function usePWAInstall(citySlug: string) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  /// 1. DYNAMIC MANIFEST INJECTION (HOT-SWAP VERSION)
  useEffect(() => {
    if (!citySlug) return;

    const updateManifest = () => {
      // 1. Clean up ALL old manifests
      const existing = document.querySelectorAll('link[rel="manifest"]');
      existing.forEach(el => el.remove());

      // 2. Create the new one with a HARD identity in the URL
      const link = document.createElement('link');
      link.rel = 'manifest';
      // We use the slug as a path segment to help the browser distinguish identity
      link.href = `${MANIFEST_URL(citySlug)}&v=${Date.now()}`;
      
      // 3. Add a unique ID to the element itself
      link.id = `manifest-${citySlug}`;
      
      document.head.appendChild(link);
      
      console.log(`[PWA] Hot-swapped manifest to: ${citySlug}`);
    };

    updateManifest();

    // OPTIONAL: A small hack for Chrome/Android
    // Changing the theme color slightly can sometimes force a manifest re-read
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      const current = themeMeta.getAttribute('content');
      themeMeta.setAttribute('content', current === '#0f172a' ? '#0f172b' : '#0f172a');
    }

  }, [citySlug]);

  // 2. INSTALLATION STATE & NATIVE PROMPTS
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