/**
 * EntryAdvisoryBanner — dismissible, severity-aware entry advisory. No API, no fetch.
 * Shows summary only; detailed visa breakdown stays in Entry & Immigration stage.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';

const REVEAL_TRANSITION = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

export interface EntryAdvisoryBannerProps {
  summary: string;
  source?: string;
  lastChecked?: string;
  isLive?: boolean;
}

type Severity = 'high' | 'medium' | 'low';

function getSeverity(summary: string): Severity {
  const lower = summary.toLowerCase();
  if (lower.includes('visa required')) return 'high';
  if (lower.includes('authorization') || lower.includes('eta')) return 'medium';
  return 'low';
}

function getSeverityClasses(severity: Severity) {
  switch (severity) {
    case 'high':
      return {
        border: 'border-red-500/40',
        bg: 'bg-red-500/10',
      };
    case 'medium':
      return {
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
      };
    default:
      return {
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
      };
  }
}

function formatLastChecked(lastChecked: string): string {
  try {
    const date = new Date(lastChecked);
    if (Number.isNaN(date.getTime())) return lastChecked;
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return lastChecked;
  }
}

export default function EntryAdvisoryBanner({
  summary,
  source,
  lastChecked,
  isLive = false,
}: EntryAdvisoryBannerProps) {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('entryAdvisoryDismissed') === 'true') {
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('entryAdvisoryDismissed', 'true');
    }
    setIsExiting(true);
  };

  const handleExitComplete = () => {
    if (isExiting) setVisible(false);
  };

  if (!visible) return null;

  const trimmed = typeof summary === 'string' ? summary.trim() : '';
  if (!trimmed) return null;

  const severity = getSeverity(trimmed);
  const { border, bg } = getSeverityClasses(severity);

  let metadataLine: string | null = null;
  if (isLive === false) {
    metadataLine = 'Offline data — verify before departure.';
  } else if (lastChecked && lastChecked.trim()) {
    const formatted = formatLastChecked(lastChecked.trim());
    metadataLine = `Verified • ${formatted}`;
    if (source && source.trim()) {
      metadataLine += ` • via ${source.trim()}`;
    }
  } else if (source && source.trim()) {
    metadataLine = `via ${source.trim()}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{
        opacity: isExiting ? 0 : 1,
        y: isExiting ? -8 : 0,
        scale: isExiting ? 0.98 : 1,
      }}
      transition={REVEAL_TRANSITION}
      onAnimationComplete={handleExitComplete}
      className={`pointer-events-auto rounded-lg border px-4 py-3 flex justify-between items-start gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-700 ${border} ${bg}`}
      role="alert"
    >
      <div className="flex gap-3 min-w-0">
        <ShieldAlert size={20} className="shrink-0 mt-0.5 opacity-80" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest font-semibold opacity-70">
            Entry Advisory
          </p>
          <p className="text-sm font-medium mt-0.5">{trimmed}</p>
          {metadataLine && (
            <p className="text-xs opacity-60 mt-1">{metadataLine}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
        aria-label="Dismiss entry advisory"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}
