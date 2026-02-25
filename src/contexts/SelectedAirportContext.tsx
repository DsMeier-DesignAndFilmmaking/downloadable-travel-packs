/**
 * App-level selected airport per city. Persists to localStorage for session + offline.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getStoredAirport,
  setStoredAirport,
  getDefaultAirportForCity,
  getAirportsForCity,
} from '@/data/multiAirport';

interface SelectedAirportContextValue {
  /** Get stored airport code for city slug, or default (first option) if none stored. */
  getAirport: (citySlug: string) => string | null;
  /** Set airport for city and persist. */
  setAirport: (citySlug: string, code: string) => void;
  /** True if this city has multiple airports and user has not yet made a selection (no stored value). */
  needsSelection: (citySlug: string) => boolean;
  /** Airport options for city, if multi-airport. */
  getOptions: (citySlug: string) => { code: string; name: string; distanceToCenter?: string }[];
}

const SelectedAirportContext = createContext<SelectedAirportContextValue | null>(null);

export function SelectedAirportProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState<Record<string, string>>({});

  const getAirport = useCallback(
    (citySlug: string): string | null => {
      const stored = hydrated[citySlug] ?? getStoredAirport(citySlug);
      if (stored) return stored;
      return getDefaultAirportForCity(citySlug);
    },
    [hydrated]
  );

  const setAirport = useCallback((citySlug: string, code: string) => {
    setStoredAirport(citySlug, code);
    setHydrated((prev) => ({ ...prev, [citySlug]: code }));
  }, []);

  const needsSelection = useCallback(
    (citySlug: string): boolean => {
      const options = getAirportsForCity(citySlug);
      if (options.length === 0) return false;
      const stored = hydrated[citySlug] ?? getStoredAirport(citySlug);
      return !stored;
    },
    [hydrated]
  );

  const getOptions = useCallback((citySlug: string) => {
    return getAirportsForCity(citySlug);
  }, []);

  const value = useMemo<SelectedAirportContextValue>(
    () => ({
      getAirport,
      setAirport,
      needsSelection,
      getOptions,
    }),
    [getAirport, setAirport, needsSelection, getOptions]
  );

  return (
    <SelectedAirportContext.Provider value={value}>
      {children}
    </SelectedAirportContext.Provider>
  );
}

export function useSelectedAirport(): SelectedAirportContextValue {
  const ctx = useContext(SelectedAirportContext);
  if (!ctx) {
    return {
      getAirport: () => null,
      setAirport: () => {},
      needsSelection: () => false,
      getOptions: () => [],
    };
  }
  return ctx;
}
