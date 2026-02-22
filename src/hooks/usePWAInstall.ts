import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlatform, type PlatformInfo } from '@/utils/platform';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'installed';

interface UsePWAInstallReturn {
  platform: PlatformInfo;
  isInstalled: boolean;
  isInstallable: boolean;
  hasActivePrompt: boolean;
  installFieldPack: () => Promise<InstallOutcome>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const platform = useMemo(() => getPlatform(), []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const syncInstalledState = () => {
      const inStandalone =
        mediaQuery.matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandaloneMode(inStandalone);
      if (inStandalone) {
        setIsInstalled(true);
      }
    };

    syncInstalledState();
    mediaQuery.addEventListener('change', syncInstalledState);

    return () => {
      mediaQuery.removeEventListener('change', syncInstalledState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    const checkServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!cancelled) setHasServiceWorker(Boolean(registration));
      } catch {
        if (!cancelled) setHasServiceWorker(false);
      }
    };

    checkServiceWorker();

    const onControllerChange = () => checkServiceWorker();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    // Client-only listener for Chrome Android install prompt interception.
    if (typeof window === 'undefined') return;
    if (platform.os !== 'android') return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('Field Pack deployed to home screen.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [platform.os]);

  const isInstallable =
    platform.os === 'android' &&
    hasServiceWorker &&
    !isStandaloneMode &&
    !isInstalled &&
    deferredPrompt != null;

  const installFieldPack = useCallback(async (): Promise<InstallOutcome> => {
    if (isInstalled || isStandaloneMode) return 'installed';
    if (!isInstallable || !deferredPrompt) return 'unavailable';

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      return 'accepted';
    }

    return 'dismissed';
  }, [deferredPrompt, isInstallable, isInstalled, isStandaloneMode]);

  return {
    platform,
    isInstalled,
    isInstallable,
    hasActivePrompt: isInstallable,
    installFieldPack,
  };
}
