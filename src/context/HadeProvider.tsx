import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type HadeContext, initialHadeContext } from './HadeContext';

// ─── React context object ──────────────────────────────────────────────────────
// Seeded with initialHadeContext so consumers outside the tree receive safe
// defaults (no-op updateContext, neutral field values) rather than null.

export const HadeCtx = createContext<HadeContext>(initialHadeContext);

// ─── Provider ──────────────────────────────────────────────────────────────────

interface HadeProviderProps {
  children: ReactNode;
}

export function HadeProvider({ children }: HadeProviderProps) {
  const [state, setState] = useState<HadeContext>(initialHadeContext);

  // Stable merge updater — identity never changes so downstream consumers that
  // only destructure updateContext never re-render due to its reference shifting.
  const updateContext = useCallback((updates: Partial<HadeContext>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Memoised value object — re-computed only when state changes, not on every
  // HadeProvider render. updateContext is omitted from updates; it is injected
  // directly so callers always receive the stable callback reference.
  const value = useMemo<HadeContext>(
    () => ({ ...state, updateContext }),
    [state, updateContext],
  );

  return <HadeCtx.Provider value={value}>{children}</HadeCtx.Provider>;
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * useHade — access the full HadeContext from any component inside HadeProvider.
 *
 * Returns the live context value including the stable updateContext dispatcher.
 * Accepts updates from any source (geolocation, user actions, external services)
 * via: const { updateContext } = useHade();
 */
export function useHade(): HadeContext {
  return useContext(HadeCtx);
}
