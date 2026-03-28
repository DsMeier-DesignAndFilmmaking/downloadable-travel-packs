// HADE Decision Card
// Deterministic, rule-based recommendation card.
// Reactive via HadeContextProvider — context updates propagate automatically.
// No API calls, no loading state.

import { useCallback, useMemo, type MouseEvent } from 'react';
import { Check, X } from 'lucide-react';
import { useHadeCtx } from '@/contexts/HadeContextProvider';
import { getHadeRecommendations } from '@/lib/hade/engine';
import type { HadeRecommendation } from '@/lib/hade/engine';
import { SignalsDB, type FeedbackType } from '@/lib/hade/signalsDb';
import type { CityPack, HadeContext } from '@/types/cityPack';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HadeDecisionCardProps {
  city: CityPack;
  /**
   * Optional explicit AQI value — overrides the context's aqiLevel when provided.
   * Used for direct data injection (e.g., from a parent that has already fetched
   * AQI before the EnvironmentalImpactBlock callback fires).
   */
  aqi?: number | null;
}

// ─── AQI dot ─────────────────────────────────────────────────────────────────

function aqiDotClass(level: 'good' | 'moderate' | 'unhealthy' | 'unknown'): string {
  if (level === 'good') return 'bg-emerald-500';
  if (level === 'moderate') return 'bg-amber-400';
  if (level === 'unhealthy') return 'bg-red-500';
  return 'bg-slate-300'; // unknown — no data yet
}

// ─── Recommendation row ───────────────────────────────────────────────────────

function RecommendationRow({
  rec,
  recId,
  onFeedback,
}: {
  rec: HadeRecommendation;
  recId: string;
  onFeedback: (event: MouseEvent<HTMLButtonElement>, recId: string, type: FeedbackType) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-full border border-white/30 bg-white/50 px-1.5 py-1 backdrop-blur-md">
        <button
          type="button"
          onClick={(event) => onFeedback(event, recId, 'positive')}
          aria-label="Done"
          title="Done"
          className="rounded-full p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
        >
          <Check size={12} />
          <span className="sr-only">Done</span>
        </button>
        <button
          type="button"
          onClick={(event) => onFeedback(event, recId, 'negative')}
          aria-label="Not for me"
          title="Not for me"
          className="rounded-full p-1 text-rose-600 transition-colors hover:bg-rose-50"
        >
          <X size={12} />
          <span className="sr-only">Not for me</span>
        </button>
      </div>

      <p className="pr-16 text-sm font-semibold text-[#222222]">
        {rec.title}
      </p>
      <p className="mt-0.5 pr-16 text-sm text-slate-500 leading-relaxed">
        {rec.description}
      </p>
      <p className="mt-1 pr-16 text-[11px] font-medium text-slate-400">
        → {rec.action}
      </p>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function HadeDecisionCard({ city: _city, aqi }: HadeDecisionCardProps) {
  const { context: baseContext, setSignalWeight } = useHadeCtx();

  // If an explicit `aqi` prop is provided, override the context's aqiLevel.
  // This supports direct injection (e.g., parent has live AQI before the
  // EnvironmentalImpactBlock onAqiResolved callback fires).
  const context = useMemo<HadeContext>(() => {
    if (typeof aqi !== 'number') return baseContext;
    const aqiLevel: HadeContext['aqiLevel'] =
      aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : 'unhealthy';
    return { ...baseContext, aqiLevel };
  }, [baseContext, aqi]);

  const recs = getHadeRecommendations(context);

  if (!recs || recs.length === 0) return null;

  // Limit to max 2 recommendations
  const visibleRecs = recs.slice(0, 2);

  const recIdFor = useCallback(
    (rec: HadeRecommendation) =>
      `${rec.title}-${rec.action}`.toLowerCase().replace(/\s+/g, '-'),
    []
  );

  const handleFeedback = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    recId: string,
    type: FeedbackType
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const timestamp = Date.now();
    void SignalsDB.recordFeedback({ recId, type, timestamp });

    setSignalWeight((current) => {
      const delta = type === 'positive' ? 0.2 : -0.2;
      return current + delta;
    });
  }, [setSignalWeight]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          HADE Decision Engine
        </p>
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${aqiDotClass(context.aqiLevel)}`}
          aria-hidden="true"
        />
      </div>

      {/* Recommendations */}
      <div>
        {visibleRecs.map((rec, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="border-t border-neutral-100 my-3" />
            )}
            <RecommendationRow
              rec={rec}
              recId={recIdFor(rec)}
              onFeedback={handleFeedback}
            />
          </div>
        ))}
      </div>

    </div>
  );
}
