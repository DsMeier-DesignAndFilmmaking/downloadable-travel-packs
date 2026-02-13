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
  // This is the "Silver Bullet": We ensure the browser sees a unique manifest 
  // for every city slug, preventing the "Everything is Rome" bug.
  useEffect(() => {
    if (!citySlug) return;

    const manifestUrl = MANIFEST_URL(citySlug);
    
    // Check for any existing manifest tags to avoid duplicates
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;

    if (manifestLink) {
      // If it exists, update it to the new city-specific URL
      manifestLink.href = manifestUrl;
    } else {
      // Create it if it doesn't exist
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestUrl;
      document.head.appendChild(manifestLink);
    }

    // Optional: Refresh the browser's recognition of the manifest
    // Some browsers need the tag to be re-appended to trigger a re-parse
    const parent = manifestLink.parentNode;
    if (parent) {
      parent.removeChild(manifestLink);
      parent.appendChild(manifestLink);
    }

    // We do NOT remove the manifest on unmount because the user might 
    // click "Add to Home Screen" while the component is transitioning.
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