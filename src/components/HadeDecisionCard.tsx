// HADE Decision Card
// Deterministic, rule-based recommendation card.
// Reactive via useArrivalStage hook.
// No API calls, no loading state.

import { buildHadeContext } from '@/lib/hade/context';
import { getHadeRecommendations } from '@/lib/hade/engine';
import { useArrivalStage } from '@/lib/hade/useArrivalStage';
import type { HadeRecommendation } from '@/lib/hade/engine';
import type { CityPack } from '@/types/cityPack';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HadeDecisionCardProps {
  city: CityPack;
  aqi?: number | null;
}

// ─── AQI dot ─────────────────────────────────────────────────────────────────

function aqiDotClass(level: 'good' | 'moderate' | 'unhealthy'): string {
  if (level === 'good') return 'bg-emerald-500';
  if (level === 'moderate') return 'bg-amber-400';
  return 'bg-red-500';
}

// ─── Recommendation row ───────────────────────────────────────────────────────

function RecommendationRow({ rec }: { rec: HadeRecommendation }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#222222]">
        {rec.title}
      </p>
      <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">
        {rec.description}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">
        → {rec.action}
      </p>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function HadeDecisionCard({ city, aqi }: HadeDecisionCardProps) {
  const arrivalStage = useArrivalStage(city.slug);

  // ✅ Corrected context input shape
  const context = buildHadeContext({
    slug: city.slug,
    aqi,
    arrivalStage
  });

  const recs = getHadeRecommendations(context);

  // ✅ Safety guard
  if (!recs || recs.length === 0) return null;

  // ✅ Limit to max 2 recommendations
  const visibleRecs = recs.slice(0, 2);

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
          <div key={rec.title}>
            {index > 0 && (
              <div className="border-t border-neutral-100 my-3" />
            )}
            <RecommendationRow rec={rec} />
          </div>
        ))}
      </div>

      {/* Optional Debug View (remove in prod) */}
      {/* 
      <pre className="text-xs mt-4 opacity-40">
        {JSON.stringify(context, null, 2)}
      </pre> 
      */}

    </div>
  );
}