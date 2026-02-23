export async function performGlobalReset(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Reset all persisted local app state (landed state, pulse caches, etc.).
  try {
    window.localStorage.clear();
  } catch {
    // Ignore storage failures and continue with network cache reset.
  }

  // Clear all Cache Storage entries so the next load pulls fresh assets/data.
  try {
    if ('caches' in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    }
  } catch {
    // Non-fatal for environments without cache access.
  }

  // Unregister all service workers to avoid stale controlled clients.
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Continue to reload even if unregister fails.
  }

  // Force reload from root so beta testers restart from a clean baseline.
  try {
    window.history.replaceState(null, '', '/');
  } catch {
    // Fallback handled by reload below.
  }

  const locationWithLegacyReload = window.location as Location & {
    reload: (forcedReload?: boolean) => void;
  };
  locationWithLegacyReload.reload(true);
}
