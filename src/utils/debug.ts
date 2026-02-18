/**
 * SYNC RESET HELPER
 * Clears all local presence of a city guide to re-test the download flow.
 */
export async function resetCitySync(slug: string): Promise<void> {
    console.group(`🧹 Resetting Sync: ${slug}`);
  
    // 1. Clear LocalStorage Flags
    localStorage.removeItem(`sync_${slug}`);
    localStorage.removeItem(`sync_${slug}_time`);
    console.log('✅ LocalStorage flags cleared.');
  
    // 2. Delete City-Specific Caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cityCaches = cacheNames.filter(name => name.includes(slug));
      
      await Promise.all(
        cityCaches.map(cacheName => {
          console.log(`Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      console.log(`✅ ${cityCaches.length} city caches deleted.`);
    }
  
    // 3. Optional: Clear Service Worker (Forces a fresh shell install next time)
    // Warning: This will trigger a reload to unregister the SW
    /*
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }
    */
  
    console.groupEnd();
    
    // Refresh the page to reset the UI state
    window.location.reload();
  }