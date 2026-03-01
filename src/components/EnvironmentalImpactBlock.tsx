/**
 * EnvironmentalImpactBlock.tsx
 *
 * "Environmental & Local Impact" content block for city guide pages.
 *
 * Three-panel architecture:
 *   [1] Current Conditions   — live AQI + pollen + overtourism pressure
 *   [2] What You Can Do      — city-specific traveller actions with tracked CTAs
 *   [3] How It Helps         — narrative paragraph, city-specific impact story
 *
 * Data: Google Air Quality API + Google Pollen API + curated baselines
 *
 * CTA tracking:
 *   weather_adaptive_cta_clicked  → AQI-conditional actions (indoor spots, parks)
 *   sustainability_action_clicked → behaviour-change actions (transit, markets, neighbourhoods)
 */

import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wind,
  Leaf,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ExternalLink,
  Flower2,
  Thermometer,
  Info,
  X,
  ArrowUpRight,
  Train,
  ShoppingBag,
  MapPin,
  TreePine,
  Building2,
  Globe,
} from 'lucide-react';
import { useEnvironmentalImpact } from '@/hooks/useEnvironmentalImpact';
import type { EnvironmentalImpactReport, PollenBand } from '@/services/environmentalImpactService';
import {
  trackWeatherAdaptiveCta,
  trackSustainabilityAction,
} from '@/lib/analytics';

// ─── CTA Types ────────────────────────────────────────────────────────────────

/**
 * Describes a single actionable button attached to a `whatYouCanDo` action item.
 *
 * kind:
 *   'weather'        → fires weather_adaptive_cta_clicked   (AQI/condition-adaptive)
 *   'sustainability' → fires sustainability_action_clicked  (behaviour-change)
 */
export type EnvironmentalCtaKind = 'weather' | 'sustainability';

export type EnvironmentalCta = {
  /** Button label shown to the user */
  label: string;
  /** External URL the button opens */
  url: string;
  /** Which PostHog event to fire */
  kind: EnvironmentalCtaKind;
  /** Lucide icon key — mapped inside ActionsPanel */
  icon?: 'transit' | 'market' | 'neighborhood' | 'park' | 'indoor' | 'offset';
};

/**
 * Extended action item — drop-in replacement for plain string entries
 * in `report.whatYouCanDo`. Supports both string[] (legacy) and
 * EnvironmentalAction[] (new).
 */
export type EnvironmentalAction = {
  text: string;
  cta?: EnvironmentalCta;
};

// ─── Props ────────────────────────────────────────────────────────────────────

export type EnvironmentalImpactBlockProps = {
  cityId: string;
  lat?: number;
  lng?: number;
  /** City display name — passed to PostHog tracking calls */
  cityName?: string;
  /**
   * Per-city behavioural hook CTAs injected by the parent (CityGuideView).
   * Each entry maps to the corresponding index in report.whatYouCanDo.
   * Entries can be undefined to leave a row without a CTA.
   */
  actionCtaOverrides?: (EnvironmentalCta | undefined)[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aqiColor(aqi: number, category: string): string {
  if (category === 'Good' || aqi <= 50) return 'text-emerald-700';
  if (category === 'Moderate' || aqi <= 100) return 'text-amber-600';
  if (aqi <= 150) return 'text-orange-600';
  return 'text-rose-700';
}

function aqiBgStrip(aqi: number, category: string): string {
  if (category === 'Good' || aqi <= 50) return 'bg-emerald-500';
  if (category === 'Moderate' || aqi <= 100) return 'bg-amber-400';
  if (aqi <= 150) return 'bg-orange-500';
  return 'bg-rose-600';
}

function overtourismColor(index: number): string {
  if (index < 4) return 'text-emerald-700';
  if (index < 7) return 'text-amber-600';
  return 'text-rose-700';
}

function overtourismBarColor(index: number): string {
  if (index < 4) return 'bg-emerald-500';
  if (index < 7) return 'bg-amber-400';
  return 'bg-rose-500';
}

function pollenColor(band: PollenBand): string {
  if (band === 'None' || band === 'Low') return 'text-emerald-700';
  if (band === 'Moderate') return 'text-amber-600';
  return 'text-rose-700';
}

function pollenDot(band: PollenBand): string {
  if (band === 'None' || band === 'Low') return 'bg-emerald-400';
  if (band === 'Moderate') return 'bg-amber-400';
  return 'bg-rose-500';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingDown size={12} className="text-emerald-600" />;
  if (trend === 'worsening') return <TrendingUp size={12} className="text-rose-600" />;
  return <Minus size={12} className="text-slate-400" />;
}

function StressIcon({ stress }: { stress: string }) {
  if (stress === 'air') return <Wind size={16} className="text-slate-500" />;
  if (stress === 'crowding') return <Users size={16} className="text-slate-500" />;
  if (stress === 'heat') return <Thermometer size={16} className="text-slate-500" />;
  if (stress === 'water' || stress === 'waste') return <Leaf size={16} className="text-slate-500" />;
  return <Wind size={16} className="text-slate-500" />;
}

/** Maps CTA icon key → lucide component */
function CtaIcon({ icon }: { icon?: EnvironmentalCta['icon'] }) {
  const cls = 'shrink-0';
  switch (icon) {
    case 'transit':      return <Train size={13} className={cls} />;
    case 'market':       return <ShoppingBag size={13} className={cls} />;
    case 'neighborhood': return <MapPin size={13} className={cls} />;
    case 'park':         return <TreePine size={13} className={cls} />;
    case 'indoor':       return <Building2 size={13} className={cls} />;
    case 'offset':       return <Globe size={13} className={cls} />;
    default:             return <ArrowUpRight size={13} className={cls} />;
  }
}

/** Visual style per CTA kind */
function ctaStyle(kind: EnvironmentalCtaKind) {
  if (kind === 'weather') {
    return 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 group-hover:text-sky-600';
  }
  return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 group-hover:text-emerald-600';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveBadge({ isLive }: { isLive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
        isLive
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-slate-200 bg-white text-slate-500'
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          isLive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
        }`}
      />
      {isLive ? 'Live Data' : 'Baseline'}
    </span>
  );
}

function SourceDrawer({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Data Sources & Citations
        </span>
        {open ? (
          <ChevronUp size={13} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-1.5">
              {sources.map((src, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed"
                >
                  <ExternalLink size={10} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{src}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Visitor Pressure meter + tooltip ────────────────────────────────────────

function VisitorPressureMeter({
  report,
  tourismPct,
}: {
  report: EnvironmentalImpactReport;
  tourismPct: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopStyle, setDesktopStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [desktopPlacement, setDesktopPlacement] = useState<'above' | 'below'>('above');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isDesktop || typeof window === 'undefined') return;
    const update = () => {
      if (!triggerRef.current || !panelRef.current) return;
      const gap = 10;
      const pad = 12;
      const tr = triggerRef.current.getBoundingClientRect();
      const pw = panelRef.current.getBoundingClientRect().width || 320;
      const ph = panelRef.current.getBoundingClientRect().height || 320;
      const vh = window.innerHeight;
      const placement: 'above' | 'below' =
        vh - tr.bottom - pad < ph + gap && tr.top - pad > ph + gap ? 'above' : 'below';
      setDesktopPlacement(placement);
      setDesktopStyle({
        top: Math.min(
          Math.max(placement === 'below' ? tr.bottom + gap : tr.top - ph - gap, pad),
          vh - ph - pad,
        ),
        left: Math.min(
          Math.max(tr.left + tr.width / 2 - pw / 2, pad),
          window.innerWidth - pw - pad,
        ),
        maxHeight: vh - pad * 2,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen, isDesktop]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen, isDesktop]);

  type ImpactTheme = {
    label: 'Stable' | 'Managed' | 'Strained' | 'Critical';
    color: string;
    bg: string;
    bar: string;
  };

  const getOvertourismTheme = (index: number): ImpactTheme => {
    if (index <= 3) return { label: 'Stable', color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' };
    if (index <= 6) return { label: 'Managed', color: 'text-amber-700', bg: 'bg-amber-50', bar: 'bg-amber-500' };
    if (index <= 8) return { label: 'Strained', color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' };
    return { label: 'Critical', color: 'text-rose-700', bg: 'bg-rose-50', bar: 'bg-rose-500' };
  };

  const theme = getOvertourismTheme(report.overtourismIndex);

  const panelContent = (
    <div className="relative p-6 max-w-[380px] bg-white rounded-2xl shadow-xl">
      <div className="relative flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-slate-900" />
          <h3 className="text-[14px] font-black uppercase tracking-[0.1em] text-slate-800">
            Visitor Pressure Index
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-full"
        >
          <X size={18} />
        </button>
      </div>
      <div className="mt-5">
        <p className="text-[14px] leading-relaxed text-slate-600">
          Quantifies the <span className="font-bold text-slate-900">socio-environmental impact</span> of footfall density relative to city resources and local resident wellbeing.
        </p>
      </div>
      <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impact Spectrum</span>
          <span className={`text-[14px] font-black ${theme.color}`}>Score: {report.overtourismIndex.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 h-2.5">
          <div className={`rounded-full ${report.overtourismIndex <= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          <div className={`rounded-full ${report.overtourismIndex > 3 && report.overtourismIndex <= 6 ? 'bg-amber-500' : 'bg-slate-200'}`} />
          <div className={`rounded-full ${report.overtourismIndex > 6 && report.overtourismIndex <= 8 ? 'bg-orange-500' : 'bg-slate-200'}`} />
          <div className={`rounded-full ${report.overtourismIndex > 8 ? 'bg-rose-500' : 'bg-slate-200'}`} />
        </div>
        <div className="flex justify-between mt-3 text-[11px] font-bold">
          <div className="flex flex-col"><span className="text-emerald-600">Stable</span><span className="text-slate-400">0–3</span></div>
          <div className="flex flex-col text-center"><span className="text-amber-600">Managed</span><span className="text-slate-400">4–6</span></div>
          <div className="flex flex-col text-center"><span className="text-orange-600">Strained</span><span className="text-slate-400">7–8</span></div>
          <div className="flex flex-col text-right"><span className="text-rose-600">Critical</span><span className="text-slate-400">9+</span></div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Source Authority</span>
          <span className="text-[12px] font-bold text-slate-700">UNWTO Global Monitor 2024</span>
        </div>
        <div className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-sm border ${theme.bg} ${theme.color} border-black/[0.04]`}>
          {theme.label}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center">
          <Users size={12} className="text-slate-400 mr-2 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">
            Visitor Pressure
          </span>
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
            className={`ml-1.5 p-0.5 rounded-md transition-all duration-200 outline-none ${isOpen ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            aria-label="What is Visitor Pressure?"
          >
            <Info size={13} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold tabular-nums ${overtourismColor(report.overtourismIndex)}`}>
            {report.overtourismLabel}
          </span>
          <span className="text-[11px] font-medium text-slate-400 tabular-nums">
            ({report.overtourismIndex.toFixed(1)}/10)
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${tourismPct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className={`h-full rounded-full ${overtourismBarColor(report.overtourismIndex)}`}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Low</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Critical</span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                {panelContent}
              </motion.div>
            </motion.div>
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              style={desktopStyle}
              className={`fixed z-[100] hidden w-[320px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden md:block ${isDesktop && !desktopStyle ? 'md:invisible' : ''}`}
            >
              {panelContent}
              {isDesktop && (
                <div className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${desktopPlacement === 'above' ? 'top-full border-t-white' : 'bottom-full border-b-white'}`} />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Panel 1: Current Conditions ─────────────────────────────────────────────

function ConditionsPanel({ report }: { report: EnvironmentalImpactReport }) {
  const aqiPct = Math.min(100, (report.aqiValue / 300) * 100);
  const tourismPct = Math.min(100, (report.overtourismIndex / 10) * 100);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-slate-700">{report.currentConditionsSummary}</p>

      {report.aqiValue > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind size={14} className="text-slate-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Air Quality Index</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendIcon trend={report.aqiTrend} />
              <span className={`text-sm font-black tabular-nums ${aqiColor(report.aqiValue, report.aqiCategory)}`}>{report.aqiValue}</span>
              <span className={`text-xs font-bold ${aqiColor(report.aqiValue, report.aqiCategory)}`}>{report.aqiCategory}</span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aqiPct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${aqiBgStrip(report.aqiValue, report.aqiCategory)}`}
            />
          </div>
          {report.dominantPollutant && (
            <p className="text-[11px] text-slate-500">
              Dominant: <span className="font-bold text-slate-700">{report.dominantPollutant.toUpperCase()}</span>
            </p>
          )}
        </div>
      )}

      {report.highestPollenThreat !== 'None detected' && report.highestPollenThreat !== 'No data' && (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Flower2 size={13} className="text-violet-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pollen Today</span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'Tree', band: report.pollenTreeBand },
              { label: 'Grass', band: report.pollenGrassBand },
              { label: 'Weed', band: report.pollenWeedBand },
            ]
              .filter(({ band }) => band !== 'None')
              .map(({ label, band }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${pollenDot(band)}`} />
                  <span className={`text-[10px] font-bold ${pollenColor(band)}`}>{label}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      <VisitorPressureMeter report={report} tourismPct={tourismPct} />

      <div className="flex items-center gap-2">
        <StressIcon stress={report.primaryStress} />
        <span className="text-[11px] font-bold text-slate-500">
          Primary environmental stress:{' '}
          <span className="font-black capitalize text-slate-700">{report.primaryStress}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Panel 2: What You Can Do ─────────────────────────────────────────────────

function ActionsPanel({
  report,
  cityName,
  actionCtaOverrides,
}: {
  report: EnvironmentalImpactReport;
  cityName: string;
  actionCtaOverrides?: (EnvironmentalCta | undefined)[];
}) {
  return (
    <ul className="space-y-4">
      {report.whatYouCanDo.map((action, i) => {
        const cta = actionCtaOverrides?.[i];
        const actionText = typeof action === 'string' ? action : (action as EnvironmentalAction).text;
        const inlineCta = typeof action === 'object' ? (action as EnvironmentalAction).cta : undefined;
        // Prop override takes priority over inline cta baked into service data
        const resolvedCta = cta ?? inlineCta;

        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
            className="group rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 space-y-3"
          >
            {/* Action text row */}
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <p className="text-sm leading-relaxed text-slate-700">{actionText}</p>
            </div>

            {/* CTA button — only rendered when a cta is resolved */}
            {resolvedCta && (
              <a
                href={resolvedCta.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (resolvedCta.kind === 'weather') {
                    trackWeatherAdaptiveCta(cityName, resolvedCta.label, i);
                  } else {
                    trackSustainabilityAction(cityName, resolvedCta.label, i);
                  }
                }}
                className={`
                  ml-7 inline-flex items-center gap-2 px-3 py-2
                  border rounded-xl text-[11px] font-bold
                  transition-all active:scale-95 shadow-sm
                  ${ctaStyle(resolvedCta.kind)}
                `}
              >
                <CtaIcon icon={resolvedCta.icon} />
                {resolvedCta.label}
                <ArrowUpRight size={11} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

// ─── Panel 3: How It Helps ────────────────────────────────────────────────────

type ExtractedStat = { value: string; unit: string; context: string } | null;

function extractLeadStat(text: string): ExtractedStat {
  const match = text.match(
    /(\$?[\d,.]+(?:\s?(?:million|billion|bn|trillion))?)\s?(°C|°F|kg|µg\/m³|%|bn|million|days?|km|m)\b/i,
  );
  if (!match) return null;
  const value = match[1].trim();
  const unit = match[2].trim();
  const sentenceMatch = text.match(/[^.!?]*\b\d[\d,.]*\s*(?:°C|°F|kg|µg\/m³|%|bn|million|days?)[^.!?]*/i);
  const rawContext = sentenceMatch ? sentenceMatch[0].trim() : '';
  const context = rawContext
    .replace(new RegExp(`\\$?${value.replace('.', '\\.')}\\s*${unit}`, 'i'), '')
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, '')
    .slice(0, 72)
    .trim();
  return { value, unit, context };
}

function trimToTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(' ').trim();
}

function ImpactPanel({ report }: { report: EnvironmentalImpactReport }) {
  const stat = extractLeadStat(report.howItHelps);
  const prose = trimToTwoSentences(report.howItHelps);

  return (
    <div className="space-y-4">
      {stat && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-4xl font-black tabular-nums leading-none tracking-tight text-slate-900">{stat.value}</span>
              <span className="text-base font-black text-slate-500">{stat.unit}</span>
            </div>
            {stat.context && (
              <p className="text-[11px] font-semibold leading-snug text-slate-500 border-l border-slate-200 pl-3">{stat.context}</p>
            )}
          </div>
        </div>
      )}
      <p className="text-sm leading-relaxed text-slate-600">{prose}</p>
      {report.neighbourhoodRetentionPct > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 leading-snug">
              Local Economic Retention
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tabular-nums leading-none text-amber-800">{report.neighbourhoodRetentionPct}%</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-amber-600 leading-tight">of every dollar</span>
                <span className="text-[11px] font-bold text-amber-600 leading-tight">stays local</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: `${report.neighbourhoodRetentionPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = 'conditions' | 'actions' | 'impact';
const TABS: Array<{ id: TabId; label: string; shortLabel: string }> = [
  { id: 'conditions', label: 'Current Conditions', shortLabel: 'Conditions' },
  { id: 'actions',    label: 'What You Can Do',    shortLabel: 'Actions' },
  { id: 'impact',     label: 'How It Helps',        shortLabel: 'Impact' },
];

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-3/4 rounded-lg bg-slate-100" />
      <div className="h-3 w-full rounded-lg bg-slate-100" />
      <div className="h-3 w-5/6 rounded-lg bg-slate-100" />
      <div className="h-1.5 w-full rounded-full bg-slate-100" />
      <div className="h-3 w-2/3 rounded-lg bg-slate-100" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EnvironmentalImpactBlock({
  cityId,
  lat,
  lng,
  cityName = '',
  actionCtaOverrides,
}: EnvironmentalImpactBlockProps) {
  const [activeTab, setActiveTab] = useState<TabId>('conditions');
  const { report, isLoading, isLive, error } = useEnvironmentalImpact({ cityId, lat, lng });

  if (error && !report) {
    return (
      <div className="flex items-start gap-3 rounded-[2.5rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">Data Unavailable</p>
          <p className="mt-1 text-sm text-rose-700">Environmental data could not be loaded for this city. Try again in a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-6 pt-6 pb-4">
        <div>
          <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 font-mono">
            {report?.cityLabel ?? '—'}
          </h3>
        </div>
        <LiveBadge isLive={isLive} />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
              activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
            {activeTab === tab.id && (
              <motion.span
                layoutId="env-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="px-6 py-5">
        {isLoading && !report ? (
          <Skeleton />
        ) : report ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'conditions' && <ConditionsPanel report={report} />}
              {activeTab === 'actions' && (
                <ActionsPanel
                  report={report}
                  cityName={cityName}
                  actionCtaOverrides={actionCtaOverrides}
                />
              )}
              {activeTab === 'impact' && <ImpactPanel report={report} />}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Source drawer */}
      {report?.sourceRefs?.length ? (
        <div className="border-t border-slate-100 px-6 pb-5 pt-3">
          <SourceDrawer sources={report.sourceRefs} />
        </div>
      ) : null}
    </motion.div>
  );
}