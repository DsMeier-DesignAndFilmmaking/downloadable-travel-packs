/**
 * BorderStatusCard — premium arrival block for visa/border verification status.
 * Renders only when borderStatus is provided; no API or manifest logic.
 */

import type { ArrivalLiveData } from '@/hooks/useArrivalLiveData';

export interface BorderStatus {
  live?: boolean;
  source?: string;
  last_checked?: string | null;
  summary_note?: string;
  offline_fallback?: string;
}

export interface BorderStatusCardProps {
  borderStatus?: BorderStatus | null;
  liveData?: ArrivalLiveData | null;
}

export default function BorderStatusCard({ borderStatus, liveData }: BorderStatusCardProps) {
  if (borderStatus == null || typeof borderStatus !== 'object') {
    return null;
  }
  void liveData; // Reserved for future live API integration

  const summaryNote = borderStatus.summary_note?.trim();
  const offlineFallback = borderStatus.offline_fallback?.trim();
  const lastChecked = borderStatus.last_checked?.trim() || null;
  const hasContent =
    Boolean(summaryNote) ||
    borderStatus.live === true ||
    Boolean(lastChecked) ||
    Boolean(offlineFallback);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        Border & Visa Status
      </p>
      <div className="mt-3 space-y-2">
        {summaryNote ? (
          <p className="text-sm font-medium text-[#222222] leading-relaxed tracking-[0.01em]">
            {summaryNote}
          </p>
        ) : null}
        {borderStatus.live === true ? (
          <p className="text-sm font-semibold text-emerald-600">
            Live Visa Verification Enabled
          </p>
        ) : null}
        {lastChecked ? (
          <p className="text-xs text-slate-500">
            Last checked: {lastChecked}
          </p>
        ) : null}
        {offlineFallback ? (
          <p className="text-xs text-amber-700/90 italic">
            {offlineFallback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
