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
  coordinates?: { lat: number; lng: number };
};

const PULSE_INTENSITY_BY_NEIGHBORHOOD: Record<string, number> = {
  'tokyo-japan': 0.92, 'paris-france': 0.82, 'london-uk': 0.8,
  'bangkok-thailand': 0.76, 'barcelona-spain': 0.81, 'rome-italy': 0.74,
  'dubai-uae': 0.68, 'seoul-south-korea': 0.83, 'mexico-city-mexico': 0.79,
  'new-york-us': 0.71,
};

function getNeighborhoodKey(locationId: string): string {
  return locationId?.split('_')[0]?.trim().toLowerCase() ?? '';
}

const FALLBACK_REPORT: CityVitalsReport = {
  title: 'City Breath',
  contextId: 'city-breath-steady',
  currentConditions: 'The district is breathing easy today with fresh, clear skies.',
  whatCanYouDo: "It's a perfect day for a walk or bike ride to keep the neighborhood quiet.",
  howItHelps: 'Your choice helps preserve the peaceful charm of these historic blocks.',
  neighborhoodInvestment: '80% Stays Local',
  isLive: false,
  sourceRef: 'Ref: Google Air Quality + Pollen (Maps Platform) — Seasonal Baseline',
};

export default function ImpactLedger(props: ImpactLedgerProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isSlipVisible, setIsSlipVisible] = useState(false);
  const [isSealRendered, setIsSealRendered] = useState(false);
  const [isSourceTooltipOpen, setIsSourceTooltipOpen] = useState(false);
  const [report, setReport] = useState<CityVitalsReport | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const filterId = useId().replace(/:/g, '_');

  const neighborhoodKey = useMemo(() => getNeighborhoodKey(props.Location_ID), [props.Location_ID]);
  const pulseIntensity = useMemo(() => PULSE_INTENSITY_BY_NEIGHBORHOOD[neighborhoodKey] ?? 0.75, [neighborhoodKey]);

  // Extract primitives to prevent useEffect from re-running on every render (Avoids 429 errors)
  const lat = props.coordinates?.lat;
  const lng = props.coordinates?.lng;

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlipVisible(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadVitals = async () => {
      await primeSeasonalBaselineCache();
      
      // 1. Load baseline from cache/local immediately
      const initial = await getCachedOrBaselineCityVitals(neighborhoodKey);
      if (isMounted) setReport(initial);

      // 2. If we have coordinates, attempt a live update
      if (lat && lng) {
        setIsLoadingLive(true);
        try {
          const fresh = await fetchCityVitals(neighborhoodKey, { 
            coordinates: { lat, lng } 
          });
          
          if (isMounted) {
            console.log(`[ImpactLedger] Live data for ${neighborhoodKey}:`, fresh);
            setReport(fresh);
          }
        } catch (error) {
          console.warn('[ImpactLedger] Failed to fetch live pulse:', error);
        } finally {
          if (isMounted) setIsLoadingLive(false);
        }
      }
    };

    loadVitals();
    return () => { isMounted = false; };
  }, [neighborhoodKey, lat, lng]); // Only depends on primitives, not the whole 'props' object

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setIsSealRendered(true);
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const display = report ?? FALLBACK_REPORT;
  const contentKey = `${display.contextId}-${display.isLive}`;

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 10 }}
      animate={isSlipVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      className="relative overflow-hidden border border-stone-300 border-l-2 border-l-rose-600 bg-stone-50/85 px-5 py-6 text-sm leading-relaxed text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur-sm"
      style={{ 
        borderRadius: '22px 18px 26px 18px / 18px 24px 18px 24px', 
        filter: `url(#${filterId})` 
      }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="0.5" />
          </filter>
        </defs>
      </svg>
      
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <motion.div 
        key={contentKey} 
        initial={{ opacity: 0.92 }} 
        animate={{ opacity: 1 }} 
        className="relative z-10 space-y-4"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span 
              className={`mt-1 h-2.5 w-2.5 rounded-full border border-emerald-700/40 ${isLoadingLive ? 'animate-pulse' : ''}`} 
              style={{ backgroundColor: `rgba(16,185,129,${pulseIntensity})` }} 
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono">City Vitals</p>
                {display.isLive && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-black uppercase">Live</span>
                )}
              </div>
              <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 font-mono">{display.title}</h3>
            </div>
          </div>
          <div ref={tooltipRef} className="relative">
            <button 
              onClick={() => setIsSourceTooltipOpen(!isSourceTooltipOpen)} 
              className="h-6 w-6 rounded-full border border-stone-400 bg-white/90 text-[11px] font-black text-slate-600 font-mono"
            >
              i
            </button>
            <AnimatePresence>
              {isSourceTooltipOpen && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-8 z-20 w-[280px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-lg">
                  <p className="font-black uppercase tracking-[0.14em] text-slate-500">Verified Sources</p>
                  <p className="mt-1 leading-normal">{display.sourceRef}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <article className="rounded-lg border border-rose-200 border-l-2 border-l-rose-600 bg-rose-50/80 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700 font-mono">Current Conditions</p>
          <p className="mt-1 text-sm text-slate-700">{display.currentConditions}</p>
        </article>

        <article className="rounded-lg border border-emerald-200 border-l-2 border-l-emerald-600 bg-emerald-50/80 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 font-mono">What can I do?</p>
          <p className="mt-1 text-sm text-slate-700">{display.whatCanYouDo}</p>
        </article>

        <article className="rounded-lg border border-amber-200 border-l-2 border-l-amber-500 bg-amber-50/80 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700 font-mono">How it helps?</p>
          <p className="mt-1 text-sm text-slate-700">{display.howItHelps}</p>
        </article>

        <div className="border-t border-stone-200/80 pt-3">
          <AnimatePresence>
            {isSealRendered && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="ml-auto rounded-md bg-slate-900 px-3 py-2 text-white shadow-md max-w-fit"
              >
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-300 font-mono">Neighborhood Investment</p>
                <p className="mt-1 text-sm font-black text-emerald-300">{display.neighborhoodInvestment}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.section>
  );
}