/**
 * EnvironmentalImpactBlock.tsx
 *
 * "Environmental & Local Impact" content block for city guide pages.
 *
 * Three-panel architecture:
 *   [1] Current Conditions   — live AQI + pollen + overtourism pressure
 *   [2] What You Can Do      — 2-3 concrete, city-specific traveller actions
 *   [3] How It Helps         — narrative paragraph, city-specific impact story
 *
 * Data: Google Air Quality API + Google Pollen API + curated baselines
 * Sources cited inline via expandable source drawer.
 *
 * Design notes:
 *   - Matches existing CityGuideView card aesthetic (rounded-[2.5rem], shadow-sm,
 *     border border-slate-200, font-mono section labels, emerald/amber/rose accents)
 *   - AnimatePresence used for panel transitions (consistent with ImpactLedger)
 *   - No new dependencies beyond framer-motion + lucide-react (already in project)
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
} from 'lucide-react';
import { useEnvironmentalImpact } from '@/hooks/useEnvironmentalImpact';
import type { EnvironmentalImpactReport, PollenBand } from '@/services/environmentalImpactService';

// ─── Props ────────────────────────────────────────────────────────────────────

export type EnvironmentalImpactBlockProps = {
  cityId: string;
  lat?: number;
  lng?: number;
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
// Matches SourceInfo.tsx interaction pattern exactly:
//   mobile  → full-screen modal with backdrop blur + AnimatePresence
//   desktop → positioned floating panel anchored to trigger button
//   shared  → close-on-scroll, click-outside, X button, same motion values

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

  // Detect desktop breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [isOpen]);

  // Close on click outside
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

  // Desktop panel positioning
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

  // Lock body scroll on mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen, isDesktop]);

  const panelContent = (
    <div className="relative p-5">
      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-4 top-8 rotate-[-22deg] text-[44px] font-black tracking-[0.2em] text-slate-100/80 uppercase select-none">
          INDEX
        </div>
      </div>

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-600" />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
            Visitor Pressure Index
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="relative mt-4 space-y-3">
        <p className="text-sm leading-relaxed text-slate-700">
          A <span className="font-bold text-slate-900">0–10 index</span> measuring how
          concentrated tourist footfall strains a city's infrastructure, housing costs,
          and local communities relative to its residential population.
        </p>

        {/* Scale breakdown */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 space-y-2">
          {[
            { range: '0 – 3', label: 'Low',      desc: 'Tourism integrated with daily city life.',          bar: 'bg-emerald-400', text: 'text-emerald-700' },
            { range: '4 – 6', label: 'Moderate', desc: 'Visible pressure in peak zones and seasons.',       bar: 'bg-amber-400',   text: 'text-amber-700' },
            { range: '7 – 8', label: 'High',     desc: 'Resident quality of life measurably affected.',     bar: 'bg-orange-400',  text: 'text-orange-700' },
            { range: '9 – 10', label: 'Critical', desc: 'Active policy interventions underway.',            bar: 'bg-rose-500',    text: 'text-rose-700' },
          ].map(({ range, label, desc, bar, text }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full shrink-0 ${bar}`} />
              <span className={`text-[10px] font-black w-10 shrink-0 ${text}`}>{range}</span>
              <span className="text-[10px] font-black text-slate-700 w-14 shrink-0">{label}</span>
              <span className="text-[10px] text-slate-500 leading-snug">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative mt-4 border-t border-slate-200 pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase text-slate-500">This City</span>
          <span className={`font-black ${overtourismColor(report.overtourismIndex)}`}>
            {report.overtourismLabel} · {report.overtourismIndex.toFixed(1)}/10
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase text-slate-500">Methodology</span>
          <span className="font-semibold text-slate-600 text-right max-w-[180px]">
            UNWTO Overtourism Monitor 2024
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-2">

      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-slate-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Visitor Pressure
          </span>
          {/* ⓘ trigger — matches SourceInfo button style */}
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
            className="p-1.5 -m-1.5 flex items-center justify-center rounded-full outline-none transition-all cursor-help"
            aria-label="What is Visitor Pressure?"
          >
            <div className="relative">
              <Info size={14} className={`${isOpen ? 'text-slate-600' : 'text-slate-400'} transition-colors`} />
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-slate-300 opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-slate-400" />
              </span>
            </div>
          </button>
        </div>
        <span className={`text-sm font-black ${overtourismColor(report.overtourismIndex)}`}>
          {report.overtourismLabel}
          <span className="ml-1.5 text-xs font-bold opacity-60">
            ({report.overtourismIndex.toFixed(1)}/10)
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${tourismPct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className={`h-full rounded-full ${overtourismBarColor(report.overtourismIndex)}`}
        />
      </div>

      {/* Scale legend */}
      <div className="flex justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Low</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Critical</span>
      </div>

      {/* Modal / floating panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile: backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm md:hidden"
            />
            {/* Mobile: centred modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
            {/* Desktop: positioned floating panel */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              style={desktopStyle}
              className={`fixed z-[100] hidden w-[320px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden md:block ${isDesktop && !desktopStyle ? 'md:invisible' : ''}`}
            >
              {panelContent}
              {/* Caret */}
              {isDesktop && (
                <div
                  className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${
                    desktopPlacement === 'above' ? 'top-full border-t-white' : 'bottom-full border-b-white'
                  }`}
                />
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
      {/* Summary prose */}
      <p className="text-sm leading-relaxed text-slate-700">
        {report.currentConditionsSummary}
      </p>

      {/* AQI meter */}
      {report.aqiValue > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind size={14} className="text-slate-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Air Quality Index
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendIcon trend={report.aqiTrend} />
              <span className={`text-sm font-black tabular-nums ${aqiColor(report.aqiValue, report.aqiCategory)}`}>
                {report.aqiValue}
              </span>
              <span className={`text-xs font-bold ${aqiColor(report.aqiValue, report.aqiCategory)}`}>
                {report.aqiCategory}
              </span>
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

      {/* Pollen row */}
      {report.highestPollenThreat !== 'None detected' && report.highestPollenThreat !== 'No data' && (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Flower2 size={13} className="text-violet-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Pollen Today
            </span>
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
                  <span className={`text-[10px] font-bold ${pollenColor(band)}`}>
                    {label}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Overtourism meter */}
      <VisitorPressureMeter report={report} tourismPct={tourismPct} />

      {/* Primary stress pill */}
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

function ActionsPanel({ report }: { report: EnvironmentalImpactReport }) {
  return (
    <ul className="space-y-3">
      {report.whatYouCanDo.map((action, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-relaxed text-slate-700">{action}</p>
        </motion.li>
      ))}
    </ul>
  );
}

// ─── Panel 3: How It Helps ────────────────────────────────────────────────────

// ─── Impact stat extractor ────────────────────────────────────────────────────
// Pulls the first meaningful number + its unit label from howItHelps prose.
// Used to surface a hero stat visually rather than burying it in the paragraph.

type ExtractedStat = { value: string; unit: string; context: string } | null;

function extractLeadStat(text: string): ExtractedStat {
  // Patterns: "71%", "44 million", "340 kg", "2.4°C", "$15bn", "21%", "73 days"
  const match = text.match(
    /(\$?[\d,.]+(?:\s?(?:million|billion|bn|trillion))?)\s?(°C|°F|kg|µg\/m³|%|bn|million|days?|km|m)\b/i,
  );
  if (!match) return null;

  const value = match[1].trim();
  const unit = match[2].trim();

  // Extract a short context label from the sentence containing the stat
  const sentenceMatch = text.match(/[^.!?]*\b\d[\d,.]*\s*(?:°C|°F|kg|µg\/m³|%|bn|million|days?)[^.!?]*/i);
  const rawContext = sentenceMatch ? sentenceMatch[0].trim() : '';

  // Strip the stat itself from the context to avoid repetition, cap at ~60 chars
  const context = rawContext
    .replace(new RegExp(`\\$?${value.replace('.', '\\.')}\\s*${unit}`, 'i'), '')
    .replace(/^[\s,–—-]+|[\s,–—-]+$/g, '')
    .slice(0, 72)
    .trim();

  return { value, unit, context };
}

// Trim howItHelps to 2 sentences for the supporting prose line
function trimToTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(' ').trim();
}

// ─── ImpactPanel ──────────────────────────────────────────────────────────────

function ImpactPanel({ report }: { report: EnvironmentalImpactReport }) {
  const stat = extractLeadStat(report.howItHelps);
  const prose = trimToTwoSentences(report.howItHelps);

  return (
    <div className="space-y-4">

      {/* Hero stat — extracted from howItHelps prose */}
      {stat && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Big number */}
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-4xl font-black tabular-nums leading-none tracking-tight text-slate-900">
                {stat.value}
              </span>
              <span className="text-base font-black text-slate-500">{stat.unit}</span>
            </div>
            {/* Context label */}
            {stat.context && (
              <p className="text-[11px] font-semibold leading-snug text-slate-500 border-l border-slate-200 pl-3">
                {stat.context}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Supporting prose — 2 sentences max */}
      <p className="text-sm leading-relaxed text-slate-600">{prose}</p>

      {/* Local retention stat */}
      {report.neighbourhoodRetentionPct > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 leading-snug">
              Local Economic Retention
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tabular-nums leading-none text-amber-800">
                {report.neighbourhoodRetentionPct}%
              </span>
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
}: EnvironmentalImpactBlockProps) {
  const [activeTab, setActiveTab] = useState<TabId>('conditions');
  const { report, isLoading, isLive, error } = useEnvironmentalImpact({
    cityId,
    lat,
    lng,
  });

  // ── Error state (only shown when no data at all) ──────────────────────────
  if (error && !report) {
    return (
      <div className="flex items-start gap-3 rounded-[2.5rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">
            Data Unavailable
          </p>
          <p className="mt-1 text-sm text-rose-700">
            Environmental data could not be loaded for this city. Try again in a moment.
          </p>
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
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b border-slate-100 px-6 pt-6 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono">
            Environmental & Local Impact
          </p>
          <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 font-mono">
            {report?.cityLabel ?? '—'}
          </h3>
        </div>
        <LiveBadge isLive={isLive} />
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
              activeTab === tab.id
                ? 'text-slate-900'
                : 'text-slate-400 hover:text-slate-600'
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

      {/* ── Panel body ────────────────────────────────────────────────────── */}
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
              {activeTab === 'actions' && <ActionsPanel report={report} />}
              {activeTab === 'impact' && <ImpactPanel report={report} />}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* ── Source drawer ─────────────────────────────────────────────────── */}
      {report?.sourceRefs?.length ? (
        <div className="border-t border-slate-100 px-6 pb-5 pt-3">
          <SourceDrawer sources={report.sourceRefs} />
        </div>
      ) : null}
    </motion.div>
  );
}
