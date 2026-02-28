import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  fetchCityVitals,
  getCachedOrBaselineCityVitals,
  primeSeasonalBaselineCache,
  type CityVitalsReport,
} from '@/services/urbanDiagnosticService';

export type ImpactLedgerProps = {
  ActivityType: string;
  Location_ID: string;
  Duration: number;
  VendorType?: string;
  category?: string;
  distanceKm?: number;
  reusable?: boolean;
  civicEngagement?: boolean;
  offPeak?: boolean;
  vendorName?: string;
};

const PULSE_INTENSITY_BY_NEIGHBORHOOD: Record<string, number> = {
  'tokyo-japan': 0.92,
  'paris-france': 0.82,
  'london-uk': 0.8,
  'bangkok-thailand': 0.76,
  'barcelona-spain': 0.81,
  'rome-italy': 0.74,
  'dubai-uae': 0.68,
  'seoul-south-korea': 0.83,
  'mexico-city-mexico': 0.79,
  'new-york-us': 0.71,
};

function getNeighborhoodKey(locationId: string): string {
  if (!locationId) return '';
  return locationId.split('_')[0]?.trim().toLowerCase() ?? '';
}

const FALLBACK_REPORT: CityVitalsReport = {
  title: 'City Breath',
  contextId: 'city-breath-steady',
  currentConditions: 'The city is breathing easy right now, with movement close to its seasonal rhythm.',
  whatCanYouDo:
    'Because conditions are steady, keep this leg walk-first and use transit for longer hops to preserve the lighter rhythm.',
  howItHelps:
    'This keeps streets calm and accessible for the families and neighborhood businesses who rely on them every day.',
  neighborhoodInvestment: '80% Stays Local',
  isLive: false,
  sourceRef: 'Ref: WAQI + TomTom + GDS-Index 2026 (Seasonal Baseline)',
};

export default function ImpactLedger(props: ImpactLedgerProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isSlipVisible, setIsSlipVisible] = useState(false);
  const [isSealRendered, setIsSealRendered] = useState(false);
  const [isSourceTooltipOpen, setIsSourceTooltipOpen] = useState(false);
  const [report, setReport] = useState<CityVitalsReport | null>(null);
  const filterId = useId().replace(/:/g, '_');

  const neighborhoodKey = useMemo(() => getNeighborhoodKey(props.Location_ID), [props.Location_ID]);

  const pulseIntensity = useMemo(
    () => PULSE_INTENSITY_BY_NEIGHBORHOOD[neighborhoodKey] ?? 0.75,
    [neighborhoodKey],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlipVisible(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;

    void primeSeasonalBaselineCache();

    (async () => {
      const cachedOrBaseline = await getCachedOrBaselineCityVitals(neighborhoodKey);
      if (active) {
        setReport(cachedOrBaseline);
      }

      const fresh = await fetchCityVitals(neighborhoodKey);
      if (active) {
        setReport((current) => {
          if (
            current &&
            current.contextId === fresh.contextId &&
            current.currentConditions === fresh.currentConditions &&
            current.whatCanYouDo === fresh.whatCanYouDo &&
            current.howItHelps === fresh.howItHelps &&
            current.neighborhoodInvestment === fresh.neighborhoodInvestment &&
            current.isLive === fresh.isLive
          ) {
            return current;
          }

          return fresh;
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [neighborhoodKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;

    const fallbackTimer = window.setTimeout(() => {
      setIsSealRendered(true);
    }, 1000);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setIsSealRendered(true);
          observer.disconnect();
          window.clearTimeout(fallbackTimer);
        }
      },
      { threshold: [0, 0.6, 1] },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      if (!tooltipRef.current.contains(event.target as Node)) {
        setIsSourceTooltipOpen(false);
      }
    };

    if (isSourceTooltipOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSourceTooltipOpen]);

  const display = report ?? FALLBACK_REPORT;
  const conditionNarrativeId = `city-vitals-condition-${display.contextId}`;
  const actionNarrativeId = `city-vitals-action-${display.contextId}`;

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 10 }}
      animate={isSlipVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden border border-stone-300 border-l-2 border-l-rose-600 bg-stone-50/85 px-5 py-6 text-sm leading-relaxed text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur-sm"
      style={{
        borderRadius: '22px 18px 26px 18px / 18px 24px 18px 24px',
        filter: `url(#${filterId})`,
      }}
      aria-labelledby="city-vitals-title"
    >
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="0.5" />
          </filter>
        </defs>
      </svg>

      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div
        className="pointer-events-none absolute inset-y-3 right-0 w-3 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at right center, transparent 0 5px, rgba(120,113,108,0.35) 5px 6px, transparent 6px)',
          backgroundSize: '12px 18px',
          backgroundRepeat: 'repeat-y',
        }}
        aria-hidden
      />

      <div className="relative z-10 space-y-4">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span
                className="mt-1 inline-block h-2.5 w-2.5 rounded-full border border-emerald-700/40"
                style={{ backgroundColor: `rgba(16,185,129,${pulseIntensity})` }}
                aria-hidden
              />
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.18em] text-slate-500"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                >
                  City Vitals
                </p>
                <h3
                  id="city-vitals-title"
                  className="mt-1 text-base font-black tracking-tight text-slate-900"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                >
                  {display.title}
                </h3>
              </div>
            </div>

            <div ref={tooltipRef} className="relative">
              <button
                type="button"
                aria-label="Verified data sources"
                onClick={() => setIsSourceTooltipOpen((prev) => !prev)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-400 bg-white/90 text-[11px] font-black text-slate-600 shadow-sm transition-colors hover:text-slate-800"
                style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
              >
                i
              </button>

              <AnimatePresence>
                {isSourceTooltipOpen && (
                  <motion.div
                    role="tooltip"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 top-8 z-20 w-[280px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-lg"
                  >
                    <p className="font-black uppercase tracking-[0.14em] text-slate-500">Verified Sources</p>
                    <p className="mt-1 leading-relaxed">{display.sourceRef}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {display.isLive ? 'Live Signal' : 'Steady Baseline'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <article
          id={conditionNarrativeId}
          data-context-id={display.contextId}
          className="rounded-lg border border-rose-200 border-l-2 border-l-rose-600 bg-rose-50/80 p-3"
        >
          <p
            className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700"
            style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
          >
            Current Conditions
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-slate-700">{display.currentConditions}</p>
        </article>

        <article
          id={actionNarrativeId}
          data-context-id={display.contextId}
          aria-describedby={conditionNarrativeId}
          className="rounded-lg border border-emerald-200 border-l-2 border-l-emerald-600 bg-emerald-50/80 p-3"
        >
          <p
            className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700"
            style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
          >
            What can you do?
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-slate-700">{display.whatCanYouDo}</p>
        </article>

        <article
          data-context-id={display.contextId}
          aria-describedby={actionNarrativeId}
          className="rounded-lg border border-amber-200 border-l-2 border-l-amber-500 bg-amber-50/80 p-3"
        >
          <p
            className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700"
            style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
          >
            How it helps?
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-slate-700">{display.howItHelps}</p>
        </article>

        <div className="border-t border-stone-200/80 pt-3">
          <AnimatePresence>
            {isSealRendered && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 1.03 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  x: [0, -1.6, 1.6, -0.8, 0],
                  rotate: [0, -0.7, 0.5, -0.3, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.25, ease: 'easeOut' },
                  y: { duration: 0.25, ease: 'easeOut' },
                  scale: { duration: 0.25, ease: 'easeOut' },
                  x: { duration: 0.28, ease: 'easeOut' },
                  rotate: { duration: 0.28, ease: 'easeOut' },
                }}
                className="ml-auto rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-white shadow-md"
                aria-hidden
              >
                <p
                  className="text-[9px] uppercase tracking-[0.18em] text-slate-300"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                >
                  Neighborhood Investment
                </p>
                <p className="mt-1 text-sm font-black tracking-tight text-emerald-300">{display.neighborhoodInvestment}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sr-only" aria-live="polite">
          Current conditions: {display.currentConditions}. What can you do: {display.whatCanYouDo}. How it helps:
          {` ${display.howItHelps}`}. Neighborhood investment: {display.neighborhoodInvestment}.
        </div>
      </div>
    </motion.section>
  );
}
