/**
 * FrictionMasker — Semantic layer over the "Digital Iron Curtain" (EES/ETIAS/ETA).
 * Abstracts gov-speak into friendly status (e.g. "Border Readiness: 80%") and
 * aggregates a Digital Arrival Card (hotel, flight, ETIAS QR) with a Single-Tap Approval view.
 */

import { useState, useId } from 'react';
import { FileCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FrictionMaskerProps {
  /** ETIAS / eTA expiry (ISO date string). */
  etiasExpiryDate?: string | null;
  /** EES/biometric state: pending → 80%, registered → 100%. */
  biometricStatus?: 'pending' | 'registered' | 'not_required';
  /** Hotel address for Digital Arrival Card. */
  hotelAddress?: string | null;
  /** Flight number for Digital Arrival Card. */
  flightNumber?: string | null;
  /** Override Border Readiness 0–100. If set, overrides biometricStatus. */
  borderReadinessPercent?: number | null;
}

const BORDER_READINESS: Record<string, number> = {
  registered: 100,
  not_required: 100,
  pending: 80,
};

/** Complex term → simple explanation for Help tooltip. */
const FRICTION_GLOSSARY: { term: string; simple: string }[] = [
  { term: 'Schengen Overstay', simple: 'Travel limit' },
  { term: 'EES', simple: 'Border biometric check' },
  { term: 'ETIAS', simple: 'Travel authorisation' },
  { term: 'Biometric Registration', simple: 'Face/fingerprint at border' },
];

function formatExpiry(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FrictionMasker({
  etiasExpiryDate = null,
  biometricStatus = 'pending',
  hotelAddress = null,
  flightNumber = null,
  borderReadinessPercent = null,
}: FrictionMaskerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();

  const readiness =
    borderReadinessPercent != null && borderReadinessPercent >= 0 && borderReadinessPercent <= 100
      ? borderReadinessPercent
      : BORDER_READINESS[biometricStatus] ?? 80;
  const isFullyReady = readiness >= 100;
  const hasArrivalDetails = Boolean(hotelAddress?.trim() || flightNumber?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl"
    >
      {/* Glassmorphism base */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-white/5" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

      <div className="relative p-5">
        {/* Header: Single-Tap Approval + Help */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            Single-Tap Approval
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              aria-expanded={showHelp}
              aria-describedby={showHelp ? helpId : undefined}
            >
              <HelpCircle size={18} aria-hidden />
            </button>
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  id={helpId}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-white/20 bg-slate-900/95 px-3 py-2.5 shadow-xl backdrop-blur-md"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">
                    Simple terms
                  </p>
                  <ul className="space-y-1.5 text-xs text-white/90">
                    {FRICTION_GLOSSARY.map(({ term, simple }) => (
                      <li key={term}>
                        <span className="text-white/50">{term}</span>
                        <span className="mx-1.5">→</span>
                        <span className="font-medium">{simple}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Border Readiness (abstraction instead of "EES Biometric Registration Pending") */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <FileCheck
              size={22}
              className={isFullyReady ? 'text-emerald-400' : 'text-amber-400'}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Border Readiness
            </p>
            <p className="text-lg font-bold text-white tabular-nums">
              {readiness}%
            </p>
          </div>
        </div>

        {/* Digital Arrival Card: QR placeholder + ETIAS expiry + Biometric checkmark */}
        <div className="grid grid-cols-[auto_1fr] gap-4 rounded-xl bg-black/20 p-4">
          {/* QR placeholder */}
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-[10px] font-bold text-white/50"
            aria-hidden
          >
            QR
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                ETIAS valid until
              </p>
              <p className="text-sm font-semibold text-white">
                {formatExpiry(etiasExpiryDate)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400 shrink-0" aria-hidden />
              <span className="text-xs font-medium text-white/90">
                {isFullyReady ? 'Biometric status: Ready' : 'Biometric status: Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Optional: hotel + flight aggregate */}
        {hasArrivalDetails && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            {flightNumber?.trim() && (
              <p className="text-xs text-white/80">
                <span className="text-white/50">Flight </span>
                <span className="font-semibold">{flightNumber}</span>
              </p>
            )}
            {hotelAddress?.trim() && (
              <p className="text-xs text-white/80">
                <span className="text-white/50">Hotel </span>
                <span className="font-medium">{hotelAddress}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
