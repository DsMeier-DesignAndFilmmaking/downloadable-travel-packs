/**
 * ComplianceAutopilot — ETIAS / Schengen 90-180 compliance as a background process.
 * Silent Mode (green) until threshold crossed; then Warning (pulsing orange) or Action Required (red).
 */

import { Shield, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  computeCompliance,
  ETIAS_OFFICIAL_URL,
  type TravelSegment,
  type ComplianceStatus,
} from '@/services/complianceEngine';

export interface ComplianceAutopilotProps {
  /** User's passport country (ISO Alpha-2, e.g. US). */
  passportCountry: string;
  /** Current location country (ISO Alpha-2, e.g. FR for France). */
  currentLocation: string;
  /** Past Schengen stays for 90/180 calculation. */
  travelHistory?: TravelSegment[];
  /** ETIAS authorization expiry (ISO date). Omit if not applicable. */
  etiasExpiryDate?: string | null;
}

const statusConfig: Record<
  ComplianceStatus,
  { label: string; iconColor: string; bgClass: string; pulse?: boolean }
> = {
  clear: {
    label: 'Clear',
    iconColor: 'text-emerald-600',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  warning: {
    label: 'Check soon',
    iconColor: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-200',
    pulse: true,
  },
  action_required: {
    label: 'Action required',
    iconColor: 'text-red-600',
    bgClass: 'bg-red-50 border-red-200',
  },
};

export default function ComplianceAutopilot({
  passportCountry,
  currentLocation,
  travelHistory = [],
  etiasExpiryDate = null,
}: ComplianceAutopilotProps) {
  const result = computeCompliance(
    { passportCountry, currentLocation, travelHistory, etiasExpiryDate },
    new Date()
  );

  const config = statusConfig[result.status];
  const showRenewalButton = result.status === 'action_required';

  return (
    <div
      className={`rounded-2xl border p-4 ${config.bgClass}`}
      role="status"
      aria-live="polite"
      aria-label={`Compliance status: ${config.label}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {config.pulse ? (
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className={`inline-flex rounded-full p-1.5 ${config.bgClass}`}
            >
              <Shield size={24} className={config.iconColor} aria-hidden />
            </motion.span>
          ) : (
            <span className="inline-flex rounded-full p-1.5">
              <Shield size={24} className={config.iconColor} aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Compliance Autopilot
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#222222]">{config.label}</p>
          {result.inEtiasRegion && result.daysRemainingInSchengen >= 0 && (
            <p className="mt-1 text-xs text-slate-600">
              {result.daysRemainingInSchengen} days left in Schengen (90/180)
              {result.daysUntilEtiasExpiry != null && result.daysUntilEtiasExpiry >= 0 && (
                <> · ETIAS expires in {result.daysUntilEtiasExpiry} days</>
              )}
            </p>
          )}
          {result.showEtiasRenewalLink && (
            <a
              href={ETIAS_OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 underline underline-offset-2 hover:no-underline"
            >
              Official ETIAS renewal <ExternalLink size={12} />
            </a>
          )}
          {showRenewalButton && (
            <motion.a
              href={ETIAS_OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] transition-colors"
            >
              Start Auto-Renewal <ExternalLink size={16} />
            </motion.a>
          )}
        </div>
      </div>
    </div>
  );
}
