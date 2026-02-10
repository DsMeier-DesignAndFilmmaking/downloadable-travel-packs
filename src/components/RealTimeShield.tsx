/**
 * RealTimeShield — Agentic advice engine for "moment-of" friction.
 * Triggers on live alerts (heat, transit strike, protest) and surfaces the alternative immediately.
 * Optimized for one-handed use while the traveler is on the move.
 */

import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type LiveEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LiveEvent {
  /** Alert type (e.g. heatwave, transit_strike, protest). */
  type: string;
  /** Severity for styling and filtering. */
  severity: LiveEventSeverity;
  /** Human-readable event description for "Shield Active: [this]". */
  description: string;
  /** Agent recommendation shown as "Agent Recommendation: [this]". */
  alternative: string;
}

export interface RealTimeShieldProps {
  /** Active alerts; empty = no shield, high-contrast off. */
  liveEvents?: LiveEvent[];
}

const severityOrder: LiveEventSeverity[] = ['critical', 'high', 'medium', 'low'];

function getWorstSeverity(events: LiveEvent[]): LiveEventSeverity {
  for (const s of severityOrder) {
    if (events.some((e) => e.severity === s)) return s;
  }
  return 'medium';
}

export default function RealTimeShield({ liveEvents = [] }: RealTimeShieldProps) {
  const activeAlerts = liveEvents.filter((e) => e.severity !== 'low');
  const hasAlert = activeAlerts.length > 0;
  const worst = hasAlert ? getWorstSeverity(activeAlerts) : null;

  return (
    <AnimatePresence mode="wait">
      {!hasAlert ? null : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="real-time-shield"
        >
          {/* High-contrast card when alert is active */}
          <div
            className={`
              rounded-2xl border-2 p-4 shadow-lg
              min-h-[88px] flex flex-col justify-center
              touch-manipulation
              ${worst === 'critical' ? 'bg-rose-950 border-rose-500 text-white' : ''}
              ${worst === 'high' ? 'bg-amber-950 border-amber-500 text-white' : ''}
              ${worst === 'medium' ? 'bg-slate-900 border-amber-400 text-white' : ''}
            `}
          >
            <div className="flex gap-3 items-start">
              <div className="shrink-0 mt-0.5">
                <ShieldAlert
                  size={28}
                  className={
                    worst === 'critical'
                      ? 'text-rose-300'
                      : worst === 'high'
                        ? 'text-amber-300'
                        : 'text-amber-200'
                  }
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {activeAlerts.slice(0, 2).map((event, i) => (
                  <div key={`${event.type}-${i}`} className="space-y-1">
                    <p className="text-sm font-bold leading-snug">
                      <span className="opacity-90">Shield Active: </span>
                      <span>{event.description}</span>
                    </p>
                    <p className="text-sm leading-snug opacity-95">
                      <span className="font-semibold opacity-90">Agent Recommendation: </span>
                      <span>{event.alternative}</span>
                    </p>
                  </div>
                ))}
                {activeAlerts.length > 2 && (
                  <p className="text-xs opacity-80 pt-0.5">
                    +{activeAlerts.length - 2} more alert{activeAlerts.length - 2 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
