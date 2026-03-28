/**
 * PivotScannerFAB
 *
 * Floating action button + result bottom-sheet for the Pivot Scanner feature.
 *
 * - FAB: fixed bottom-right radar icon. Spins while scanning.
 * - Result sheet: slides up from the bottom after a successful scan. Shows
 *   composite score, risk badge, optional night-time warning, and the
 *   agentically-surfaced safe alternative (Safe Haven or Quiet Zone).
 * - Error toast: shown if GPS is unavailable or the scan fails.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePivotScanner } from '@/hooks/usePivotScanner';
import type { CityPack, HadeContext } from '@/types/cityPack';
import type { PivotRiskLevel } from '@/lib/hade/engine';

// ─── Risk level display metadata ──────────────────────────────────────────────

const RISK_META: Record<PivotRiskLevel, { bg: string; label: string }> = {
  'safe':       { bg: '#10B981', label: 'Safe Zone'         },
  'caution':    { bg: '#F59E0B', label: 'Proceed with Care' },
  'high-risk':  { bg: '#EF4444', label: 'High Risk'         },
  'high-crowd': { bg: '#8B5CF6', label: 'High Crowd'        },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function RadarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 6a6 6 0 0 1 6 6" />
      <path d="M12 10a2 2 0 0 1 2 2" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PivotScannerFABProps {
  cityPack: CityPack;
  hadeContext: HadeContext;
  themeColor: string;
  /**
   * Called when the user taps 'Pivot Here →' on the safe alternative card.
   * The parent (TacticalMapStep) pans the map to this neighborhood name.
   */
  onPivotTo: (neighborhoodName: string) => void;
}

export function PivotScannerFAB({
  cityPack,
  hadeContext,
  themeColor,
  onPivotTo,
}: PivotScannerFABProps) {
  const { state, scan, reset } = usePivotScanner(cityPack, hadeContext);

  const isScanning = state.status === 'scanning';
  const result     = state.status === 'done' ? state.result : null;
  const riskMeta   = result ? RISK_META[result.riskLevel] : null;

  return (
    <>
      {/* ── FAB button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => { void scan(); }}
        disabled={isScanning}
        aria-label="Scan this area"
        className="fixed bottom-8 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-70"
        style={{ background: isScanning ? '#6B7280' : themeColor }}
      >
        {isScanning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
          />
        ) : (
          <RadarIcon />
        )}
      </button>

      {/* ── Result sheet ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && riskMeta && (
          <motion.div
            key="pivot-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-40 rounded-t-[2rem] bg-[#16181D] px-6 pb-10 pt-6 shadow-2xl"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-white/10" />

            {/* Header: neighborhood name + composite score ring */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  Nearest Node
                </p>
                <h3 className="mt-1 truncate text-2xl font-bold text-white">
                  {result.nearestNeighborhood.name}
                </h3>
                <p className="mt-1 text-sm text-white/40">
                  {result.nearestNeighborhood.vibe}
                </p>
              </div>
              <div
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 text-xl font-black text-white"
                style={{ borderColor: riskMeta.bg }}
              >
                {result.compositeScore.toFixed(1)}
              </div>
            </div>

            {/* Risk level badge */}
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white"
              style={{ background: riskMeta.bg }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              {riskMeta.label}
            </div>

            {/* Night-time caution warning */}
            {result.warning && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                <span className="text-amber-400">⚠</span>
                <p className="text-sm font-bold text-amber-300">{result.warning}</p>
              </div>
            )}

            {/* Agentic safe alternative — auto-surfaced for high-risk / high-crowd */}
            {result.safeAlternative && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  {result.safeAlternative.type === 'safe-haven' ? '🛡 Safe Haven' : '🌿 Quiet Zone'}
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {result.safeAlternative.name}
                </p>
                <p className="mt-1 text-sm text-white/40">{result.safeAlternative.vibe}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                    Safety
                  </span>
                  <span className="text-[10px] font-black text-emerald-400">
                    {result.safeAlternative.safetyScore}/10
                  </span>
                </div>
                <button
                  onClick={() => {
                    onPivotTo(result.safeAlternative!.name);
                    reset();
                  }}
                  className="mt-4 w-full rounded-xl bg-white py-3 text-[11px] font-black uppercase tracking-widest text-[#16181D] transition hover:opacity-90 active:scale-[0.98]"
                >
                  Pivot Here →
                </button>
              </div>
            )}

            {/* Dismiss */}
            <button
              onClick={reset}
              className="mt-6 w-full text-center text-[11px] font-bold uppercase tracking-widest text-white/20 transition hover:text-white/50"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {state.status === 'error' && (
          <motion.div
            key="pivot-error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-6 z-50 flex max-w-[280px] items-start gap-3 rounded-2xl border border-red-400/20 bg-[#16181D] px-5 py-3 shadow-xl"
          >
            <p className="flex-1 text-sm font-medium text-red-400">{state.message}</p>
            <button
              onClick={reset}
              className="flex-shrink-0 text-white/30 transition hover:text-white"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
