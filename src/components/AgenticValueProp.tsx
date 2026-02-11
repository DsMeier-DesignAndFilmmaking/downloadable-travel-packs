import { useState } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Smartphone, Zap, X, ChevronRight } from 'lucide-react';

/** * Animation variants using the imported Variants type 
 * to ensure TS6133 is cleared during build.
 */
const overlayVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.3, 
      ease: [0.23, 1, 0.32, 1] 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const COLUMNS = [
  {
    id: 'entry',
    icon: ShieldCheck,
    title: 'Arrival Ready',
    tagline: 'Visas and entry rules verified for your arrival.',
    technicalDetail: 'Cross-references IATA Timatic data with local embassy JSON feeds.'
  },
  {
    id: 'digital',
    icon: Smartphone,
    title: 'Instant Setup',
    tagline: 'Maps, eSIMs, and transit passes pre-mapped.',
    technicalDetail: 'Automated provisioning for GSMA-compliant eSIMs and Vector Tile caching.'
  },
  {
    id: 'safety',
    icon: Zap,
    title: 'Live Alerts',
    tagline: 'Stay ahead of local scams and transport delays.',
    technicalDetail: 'Aggregates GDACS alerts and GTFS-Realtime feeds with AI sentiment.'
  },
] as const;

export default function AgenticValueProp() {
  const [activeSpec, setActiveSpec] = useState<string | null>(null);
  
  return (
    <section className="relative w-full">
      {/* CONSTRAINED CONTAINER:
        Matches the max-w-xl (576px) of the home page.
        Responsive: Swipes on mobile (w-[92%]), grids on desktop.
      */}
      <div 
        className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar gap-3 pb-4 md:pb-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const isExpanded = activeSpec === col.id;

          return (
            <motion.div 
              key={col.id} 
              className="relative flex-none w-[92%] md:w-full snap-center"
            >
              <div className="h-full rounded-[2rem] border border-emerald-500/20 bg-[#141617] p-6 shadow-xl ring-1 ring-white/5 
                            min-h-[190px] flex flex-col justify-between transition-all duration-300">
                
                {/* Marketing View */}
                <div className={`transition-all duration-300 ${isExpanded ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-500">
                      {col.title}
                    </h3>
                  </div>
                  
                  <p className="text-[14px] leading-snug font-medium text-slate-200">
                    {col.tagline}
                  </p>

                  <button 
                    onClick={() => setActiveSpec(col.id)}
                    className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    View Spec <ChevronRight size={12} />
                  </button>
                </div>

                {/* Technical Overlay */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      variants={overlayVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute inset-0 bg-[#0A0A0B] rounded-[2rem] p-6 z-10 flex flex-col justify-between border border-emerald-500/40 shadow-2xl"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-tighter">
                            Log // {col.id}
                          </span>
                          <button 
                            onClick={() => setActiveSpec(null)} 
                            className="p-2 -m-2 text-slate-400 hover:text-white transition-colors"
                            aria-label="Close specification"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <p className="text-[12px] font-mono text-slate-300 leading-relaxed">
                          {col.technicalDetail}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="text-[9px] font-mono text-emerald-900 uppercase">
                          STABLE_BUILD
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}