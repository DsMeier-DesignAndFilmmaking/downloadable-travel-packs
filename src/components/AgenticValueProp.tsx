import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, Globe, Zap } from 'lucide-react';

const COLUMNS = [
  {
    id: 'KNOW',
    icon: Globe,
    label: 'Live Updates',
    detail: 'Fresh data on 2026 entry rules and visa status, synced the second you’re online.'
  },
  {
    id: 'OFFLINE',
    icon: CloudOff,
    label: <>No Signal? <br /> No Prob.</>, // Use a Fragment with a <br />
    detail: 'All your critical city guides stay tucked in your pocket, even without Wi-Fi or roaming.'
  },
  {
      id: 'FLOW',
      icon: Zap,
      label: 'Land & Go',
      detail: 'Skip the arrival stress. We’ve pre-mapped your transit hacks and eSIM setups so you can head straight to the city.'
    },
] as const;

export default function AgenticValueProp() {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  return (
    <section className="w-full" aria-label="Key Features">
      <div className="grid grid-cols-3 gap-2">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const isActive = activeId === col.id;
          const contentId = `detail-${col.id}`;

          return (
            <div key={col.id} className="relative h-full">
              <motion.button 
                // 1. SEMANTICS: Changed div to button for keyboard focus
                type="button"
                onClick={() => setActiveId(isActive ? null : col.id)}
                // 2. ARIA: Tells screen readers if content is open
                aria-expanded={isActive}
                aria-controls={contentId}
                className={`w-full cursor-pointer rounded-2xl p-5 transition-all duration-300 border h-full flex flex-col items-center text-center 
                  ${isActive 
                    ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' 
                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm focus:ring-2 focus:ring-slate-400 outline-none'}`}
              >
                {/* 3. ICON: aria-hidden because the text provides the meaning */}
                <div className={`mb-3 p-2 rounded-xl ${isActive ? 'text-emerald-700 bg-white' : 'text-slate-500 bg-slate-50'}`}>
                  <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
                </div>

                {/* 4. LEGIBILITY: Bumped font sizes to 10px/14px minimums */}
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 
                  ${isActive ? 'text-emerald-800' : 'text-slate-500'}`}>
                  {col.id}
                </h3>
                
                <p className="text-[14px] font-black text-[#222222] leading-tight">
                  {col.label}
                </p>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      id={contentId} // Matches aria-controls
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-emerald-200">
                        {/* 5. CONTRAST: Use emerald-900 for dark-on-light accessibility */}
                        <p className="text-[12px] font-bold text-emerald-900 leading-snug">
                          {col.detail}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          );
        })}
      </div>
    </section>
  );
}