/**
 * BorderStatusCard — presentational visa/border status. No fetching, no API, no persistence.
 */

export interface BorderStatusCardProps {
  /** Main visa status line (e.g. from API or fallback). */
  visaText?: string | null;
  /** Whether data is live (green badge) or offline (amber badge). */
  live?: boolean;
  /** Data source label (e.g. API name). */
  source?: string | null;
  /** Last checked timestamp; shown in metadata when present. */
  lastChecked?: string | null;
  /** Optional summary note. */
  summaryNote?: string | null;
  /** Shown in amber box when !live. */
  offlineFallback?: string | null;
}

export default function BorderStatusCard({
  visaText,
  live = false,
  source,
  lastChecked,
  summaryNote,
  offlineFallback,
}: BorderStatusCardProps) {
  const showVisaText = typeof visaText === 'string' && visaText.trim() !== '';
  const showSource = typeof source === 'string' && source.trim() !== '';
  const showLastChecked = typeof lastChecked === 'string' && lastChecked.trim() !== '';
  const showSummaryNote = typeof summaryNote === 'string' && summaryNote.trim() !== '';
  const showOfflineFallback =
    !live && typeof offlineFallback === 'string' && offlineFallback.trim() !== '';

  const hasContent =
    showVisaText ||
    showSummaryNote ||
    showSource ||
    showLastChecked ||
    showOfflineFallback;

  const formattedLastChecked = showLastChecked
    ? (() => {
        try {
          const date = new Date(lastChecked as string);
          if (isNaN(date.getTime())) return lastChecked;
          return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return lastChecked;
        }
      })()
    : null;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Visa Status
        </p>
        <span
          className={
            live
              ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700'
              : 'rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700'
          }
        >
          {live ? 'Live' : 'Offline'}
        </span>
      </div>

      {showVisaText && (
        <p className="mt-3 text-sm font-bold text-[#222222] leading-relaxed tracking-[0.01em]">
          {visaText!.trim()}
        </p>
      )}

      {showSummaryNote && (
        <p className="mt-2 text-sm font-medium text-[#222222] leading-relaxed tracking-[0.01em]">
          {summaryNote!.trim()}
        </p>
      )}

   {(showSource || showLastChecked) && (
        <div className="mt-2 text-xs text-slate-500">
          <span>
            {showSource && `Data source: ${source!.trim()}`}
            {showSource && showLastChecked && ' • '}
            {showLastChecked && `Last verified ${formattedLastChecked}`}
          </span>
        </div>
      )}

      {showOfflineFallback && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
          <p className="text-xs text-amber-800/90 italic leading-relaxed">
            {offlineFallback!.trim()}
          </p>
        </div>
      )}
    </div>
  );
}
