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

  // 1. DYNAMIC MANIFEST INJECTION
  // THE "SILVER BULLET": We force-replace the manifest tag with a unique ID and cache-buster
  // to ensure the OS recognizes each city as a separate standalone application.
  useEffect(() => {
    if (!citySlug) return;

    // 1. Force-remove ALL existing manifest tags to clear browser internal state
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(el => el.remove());

    // 2. Build the new manifest URL with a cache-buster
    // Adding the timestamp prevents the browser from using a locally cached manifest file.
    const manifestUrl = `${MANIFEST_URL(citySlug)}&v=${Date.now()}`;
    
    // 3. Create and append a fresh link tag
    const newManifestLink = document.createElement('link');
    newManifestLink.rel = 'manifest';
    newManifestLink.href = manifestUrl;
    
    document.head.appendChild(newManifestLink);

    console.log(`[PWA] Manifest rotated for: ${citySlug}`);
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