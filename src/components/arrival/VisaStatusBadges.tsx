/**
 * VisaStatusBadges — presentational visa/entry badges and last updated.
 * Accepts existing visa data as props; no API logic. Static fallback if data missing.
 */

import { ShieldCheck, Clock } from 'lucide-react';

export interface VisaStatusBadgesProps {
  visaStatus?: string | null;
  lastUpdated?: string | null;
  isLive?: boolean;
  visaLoading?: boolean;
  visaError?: string | null;
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '—';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function badgeVariant(status: string): 'required' | 'evisa' | 'on_arrival' | 'exempt' | 'standard' {
  const s = status.toLowerCase();
  if (/visa\s*required|required\s*visa/i.test(s)) return 'required';
  if (/evisa|e-visa|electronic\s*visa/i.test(s)) return 'evisa';
  if (/on\s*arrival|arrival\s*visa|voa/i.test(s)) return 'on_arrival';
  if (/exempt|waiver|visa-free/i.test(s)) return 'exempt';
  return 'standard';
}

const BADGE_CLASS: Record<string, string> = {
  required: 'bg-amber-100 text-amber-800 border-amber-200',
  evisa: 'bg-blue-100 text-blue-800 border-blue-200',
  on_arrival: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  exempt: 'bg-slate-100 text-slate-700 border-slate-200',
  standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

const BADGE_LABEL: Record<string, string> = {
  required: 'Required',
  evisa: 'eVisa',
  on_arrival: 'On Arrival',
  exempt: 'Exempt',
  standard: 'Entry',
};

export default function VisaStatusBadges({
  visaStatus,
  lastUpdated,
  isLive,
  visaLoading,
  visaError,
}: VisaStatusBadgesProps) {
  const statusText = visaLoading
    ? 'Syncing…'
    : visaError
      ? 'Live feed unavailable. Cached guidance in use.'
      : (visaStatus?.trim() || 'Standard Entry Protocol applies.');
  const variant = visaStatus ? badgeVariant(visaStatus) : 'standard';
  const badgeLabel = BADGE_LABEL[variant] ?? 'Entry';
  const timestamp =
    lastUpdated && typeof lastUpdated === 'string' && lastUpdated.trim() !== ''
      ? formatTimestamp(lastUpdated.trim())
      : null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck size={16} className="text-slate-500 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Visa & Entry
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE_CLASS[variant] ?? BADGE_CLASS.standard}`}
        >
          {badgeLabel}
        </span>
        {isLive && !visaLoading && !visaError && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            Live
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-[#222222] leading-relaxed">
        {statusText}
      </p>
      {timestamp && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={12} />
          Last updated: {timestamp}
        </p>
      )}
    </div>
  );
}
