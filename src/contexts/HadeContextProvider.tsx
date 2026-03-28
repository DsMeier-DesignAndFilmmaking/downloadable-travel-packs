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

import { createContext, useContext, type ReactNode } from 'react';
import {
  useHadeContext,
  type UseHadeContextResult,
} from '@/lib/hade/useHadeContext';

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
