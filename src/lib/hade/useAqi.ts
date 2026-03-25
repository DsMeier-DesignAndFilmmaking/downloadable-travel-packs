// Reactive AQI hook for the HADE Decision Engine.
// Initialises from localStorage cache and re-reads whenever 'hade:update' fires —
// dispatched by environmentalImpactService after each successful fetch.

import { useState, useEffect } from 'react';
import { getCachedEnvironmentalReport } from '@/services/environmentalImpactService';

function readAqi(slug: string): number | null {
  return getCachedEnvironmentalReport(slug)?.aqiValue ?? null;
}

export function useAqi(slug: string | null | undefined): number | null {
  const [aqi, setAqi] = useState<number | null>(() =>
    slug ? readAqi(slug) : null,
  );

  useEffect(() => {
    if (!slug) return;
    // Sync immediately in case cache was populated between render and effect
    setAqi(readAqi(slug));

    const sync = () => setAqi(readAqi(slug));
    window.addEventListener('hade:update', sync);
    return () => window.removeEventListener('hade:update', sync);
  }, [slug]);

  return aqi;
}
