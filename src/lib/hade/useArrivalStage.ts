// Reactive arrival stage hook for the HADE Decision Engine.
// Initialises from localStorage and re-reads whenever the 'hade:update'
// custom event fires — dispatched by CityGuideView after each stage change.

import { useState, useEffect } from 'react';
import { resolveArrivalStage } from './context';
import type { HadeContext } from './context';

export function useArrivalStage(slug: string): HadeContext['arrivalStage'] {
  // Lazy initialiser: reads localStorage synchronously on first render
  const [arrivalStage, setArrivalStage] = useState<HadeContext['arrivalStage']>(
    () => resolveArrivalStage(slug),
  );

  useEffect(() => {
    const sync = () => setArrivalStage(resolveArrivalStage(slug));
    window.addEventListener('hade:update', sync);
    return () => window.removeEventListener('hade:update', sync);
  }, [slug]);

  return arrivalStage;
}
