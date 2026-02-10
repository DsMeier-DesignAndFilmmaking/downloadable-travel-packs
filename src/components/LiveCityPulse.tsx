/**
 * LiveCityPulse — Contextual live card with time-of-day background, metric, and shield advice.
 * Optional integration with pulseLogic; supports direct metric + advice props.
 * Reasoning tooltip works on hover (desktop) and tap (mobile).
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface LiveCityPulseProps {
  /** Primary metric shown large on the left (e.g. '34°C', 'Peak Crowds'). */
  metric: string;
  /** Shield advice text in the right bubble. */
  shieldAdvice: string;
  /** Why the Agent suggested this — shown in Reasoning tooltip (e.g. 'EES Compliance', 'Coolcation Thermal Avoidance'). */
  reasoning?: string | null;
  /** Time of day for background transition. */
  timeOfDay?: TimeOfDay;
  /** Show pulsing green Active indicator. Default true. */
  active?: boolean;
}

const TIME_BG: Record<TimeOfDay, string> = {
  morning: 'bg-amber-50/90 border-amber-200/60',
  afternoon: 'bg-sky-50/90 border-sky-200/60',
  evening: 'bg-orange-50/90 border-orange-200/60',
  night: 'bg-slate-800/95 border-slate-600/50 text-white',
};

export default function LiveCityPulse({
  metric,
  shieldAdvice,
  reasoning = null,
  timeOfDay = 'afternoon',
  active = true,
}: LiveCityPulseProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const showReasoning = Boolean(reasoning?.trim() && (reasoningOpen || hovering));

  // Close reasoning on outside click (mobile: tap away)
  useEffect(() => {
    if (!reasoningOpen) return;
    const handle = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setReasoningOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [reasoningOpen]);

  const bgClass = TIME_BG[timeOfDay];
  const isDark = timeOfDay === 'night';

  return (
    <div
      className={`
        relative overflow-hidden rounded-[2.5rem] border-2 p-6 shadow-lg transition-colors duration-500
        min-h-[140px] flex flex-col justify-center
        ${bgClass}
      `}
    >
      {/* Top-right: Pulsing green Active indicator */}
      {active && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <motion.span
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            aria-hidden
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isDark ? 'text-emerald-300' : 'text-emerald-700'
            }`}
          >
            Active
          </span>
        </div>
      )}

      <div className="flex items-center gap-6 pr-24">
        {/* Left: Large metric */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-4xl font-black tracking-tight tabular-nums ${
              isDark ? 'text-white' : 'text-[#222222]'
            }`}
          >
            {metric}
          </p>
        </div>

        {/* Right: Shield advice bubble + Reasoning tooltip */}
        <div ref={bubbleRef} className="relative shrink-0 max-w-[55%]">
          <div
            role={reasoning ? 'button' : undefined}
            tabIndex={reasoning ? 0 : undefined}
            aria-label={reasoning ? 'Advice: show why the agent suggested this' : undefined}
            onMouseEnter={() => reasoning && setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onKeyDown={(e) => reasoning && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setReasoningOpen((o) => !o))}
            onClick={() => reasoning && setReasoningOpen((o) => !o)}
            className={`
              rounded-2xl border-2 px-4 py-3
              ${reasoning ? 'cursor-pointer select-none touch-manipulation' : ''}
              ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/80 border-slate-200/80 shadow-sm'}
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-xs font-semibold leading-snug min-w-0 ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {shieldAdvice}
              </p>
              {reasoning && (
                <HelpCircle
                  size={14}
                  className="shrink-0 mt-0.5 text-slate-400"
                  aria-hidden
                />
              )}
            </div>
          </div>
          <AnimatePresence>
            {showReasoning && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2.5 shadow-xl"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Why the Agent suggested this
                </p>
                <p className="font-mono text-xs leading-snug text-emerald-300/95">
                  {reasoning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
