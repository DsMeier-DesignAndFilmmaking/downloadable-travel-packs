import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface LiveCityPulseProps {
  metric: string;
  shieldAdvice: string;
  reasoning?: string | null;
  timeOfDay?: TimeOfDay;
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

  // showReasoning is true if the state is open (tap) OR if hovering (mouse)
  const showReasoning = Boolean(reasoning?.trim() && (reasoningOpen || hovering));

  // Handle "Tap Away" to close on mobile + "Click Away" for desktop
  useEffect(() => {
    if (!reasoningOpen) return;
    
    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setReasoningOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction); // Essential for mobile

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
    };
  }, [reasoningOpen]);

  const bgClass = TIME_BG[timeOfDay];
  const isDark = timeOfDay === 'night';

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!reasoning) return;
    // Prevent the click from bubbling up if necessary
    e.stopPropagation();
    setReasoningOpen((prev) => !prev);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-[2.5rem] border-2 p-6 shadow-lg transition-colors duration-500
        min-h-[140px] flex flex-col justify-center
        ${bgClass}
      `}
    >
      {active && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <motion.span
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            aria-hidden
          />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            Active
          </span>
        </div>
      )}

      <div className="flex items-center gap-6 pr-10 md:pr-24">
        <div className="min-w-0 flex-1">
          <p className={`text-4xl font-black tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            {metric}
          </p>
        </div>

        <div ref={bubbleRef} className="relative shrink-0 max-w-[65%] sm:max-w-[55%]">
          <div
            role={reasoning ? 'button' : undefined}
            tabIndex={reasoning ? 0 : undefined}
            aria-expanded={showReasoning}
            
            // Desktop Interactions
            onMouseEnter={() => !reasoningOpen && reasoning && setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            
            // Mobile + Accessibility Interactions
            onClick={handleToggle}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle(e)}
            
            className={`
              rounded-2xl border-2 px-4 py-3
              ${reasoning ? 'cursor-pointer select-none touch-manipulation active:scale-[0.98] transition-transform' : ''}
              ${isDark ? 'bg-white/10 border-white/20' : 'bg-white/80 border-slate-200/80 shadow-sm'}
              ${showReasoning ? 'border-emerald-400/50 ring-2 ring-emerald-400/10' : ''}
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`text-xs font-semibold leading-snug min-w-0 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {shieldAdvice}
              </p>
              {reasoning && (
                <HelpCircle
                  size={14}
                  className={`shrink-0 mt-0.5 transition-colors ${showReasoning ? 'text-emerald-400' : 'text-slate-400'}`}
                  aria-hidden
                />
              )}
            </div>
          </div>

          <AnimatePresence>
            {showReasoning && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                // On mobile, the tooltip is often best placed centered or right-aligned
                className="absolute right-0 top-full z-[100] mt-3 w-64 rounded-2xl border border-slate-800 bg-[#111111] p-4 shadow-2xl"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Agent Reasoning
                    </p>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed text-emerald-300/90 italic">
                    "{reasoning}"
                  </p>
                </div>
                {/* Visual Arrow for Tooltip */}
                <div className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-slate-800 bg-[#111111]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}