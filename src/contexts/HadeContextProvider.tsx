/**
 * HadeContextProvider — makes the full HadeContext available to any descendant
 * component without prop drilling.
 *
 * Placement: wraps CityGuideView's inner content, scoped to a single city slug.
 * Pattern: mirrors SelectedAirportContext.tsx (the canonical context pattern in
 * this codebase).
 *
 * Usage:
 *   // Provider (in CityGuideView outer shell):
 *   <HadeContextProvider slug={cleanSlug}>
 *     <CityGuideViewInner />
 *   </HadeContextProvider>
 *
 *   // Consumer (in any descendant):
 *   const { context, setArrivalStage, setAqi } = useHadeCtx();
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  useHadeContext,
  type UseHadeContextResult,
} from '@/lib/hade/useHadeContext';
import { SignalsDB } from '@/lib/hade/signalsDb';

// ─── Internal context ─────────────────────────────────────────────────────────

const HadeReactContext = createContext<UseHadeContextResult | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HadeContextProvider({
  children,
  slug,
}: {
  children: ReactNode;
  slug: string;
}) {
  const value = useHadeContext(slug);

  useEffect(() => {
    const rows = SignalsDB.getRecentFeedback(10);
    if (rows.length === 0) return;
    const sum = rows.reduce((acc, r) => acc + (r.type === 'positive' ? 1 : -1), 0);
    value.setSignalWeight(sum / rows.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount-only seed

  return (
    <HadeReactContext.Provider value={value}>
      {children}
    </HadeReactContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * useHadeCtx — consume the HADE context from any component inside HadeContextProvider.
 * Throws a clear error if called outside the provider tree.
 */
export function useHadeCtx(): UseHadeContextResult {
  const ctx = useContext(HadeReactContext);
  if (!ctx) {
    throw new Error(
      '[HADE] useHadeCtx() must be called inside <HadeContextProvider>. ' +
      'Wrap CityGuideView with <HadeContextProvider slug={slug}>.'
    );
  }
  return ctx;
}
