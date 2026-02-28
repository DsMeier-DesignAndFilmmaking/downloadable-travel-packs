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

import { useState } from 'react';
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Visitor Pressure
            </span>
          </div>
          <span className={`text-sm font-black ${overtourismColor(report.overtourismIndex)}`}>
            {report.overtourismLabel}
            <span className="ml-1.5 text-xs font-bold opacity-60">
              ({report.overtourismIndex.toFixed(1)}/10)
            </span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tourismPct}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className={`h-full rounded-full ${overtourismBarColor(report.overtourismIndex)}`}
          />
        </div>
      </div>

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

function ImpactPanel({ report }: { report: EnvironmentalImpactReport }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-700">{report.howItHelps}</p>

      {/* Local retention stat */}
      {report.neighbourhoodRetentionPct > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
            Local Economic Retention
          </span>
          <span className="text-lg font-black tabular-nums text-amber-800">
            {report.neighbourhoodRetentionPct}%
            <span className="ml-1 text-xs font-bold text-amber-600">stays local</span>
          </span>
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