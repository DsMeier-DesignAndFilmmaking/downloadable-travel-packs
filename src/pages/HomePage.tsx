import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ChevronRight, Globe, Activity, Info, X } from 'lucide-react';

// Services & Data
import { cityPacksList } from '../services/cityService';

// Components
import AgenticValueProp from '../components/AgenticValueProp';
import DiagnosticsOverlay from '../components/DiagnosticsOverlay';
import SpontaneityEnginePromo from '../components/SpontaneityEnginePromo'; // <--- NEW IMPORT


const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  },
};

export default function HomePage() {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isValuePropOpen, setIsValuePropOpen] = useState(false);

  useEffect(() => {
    if (!isValuePropOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsValuePropOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isValuePropOpen]);

  return (
    <motion.div 
      initial="hidden" animate="visible" exit="exit" 
      className="min-h-screen bg-[#F7F7F7] antialiased"
    >
      <DiagnosticsOverlay 
        city="Global" 
        isOpen={isDiagnosticsOpen} 
        onClose={() => setIsDiagnosticsOpen(false)} 
      />
      {isValuePropOpen && (
        <div className="fixed inset-0 z-[170]">
          <div
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
            onClick={() => setIsValuePropOpen(false)}
          />
          <div className="relative h-full overflow-y-auto px-4 py-6 sm:py-10">
            <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] ring-1 ring-black/5">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Detailed Value Overview</p>
                <button
                  onClick={() => setIsValuePropOpen(false)}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 active:scale-95 transition-transform"
                  aria-label="Close more info"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="border-b border-slate-200 bg-white px-5 py-3">
                <p className="text-sm leading-relaxed font-bold text-slate-700">
                  Travel Pack Field Notes give you the essential local knowledge for a city — fully offline — so you never feel stuck or dependent on bad WiFi.
                </p>
              </div>
              <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto bg-slate-50 p-5 md:p-6">
                <AgenticValueProp />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="w-full py-16">
        
        {/* Header Section */}
        <header className="max-w-xl mx-auto px-6 mb-12">
          <div className="flex justify-between items-start mb-8">
            <motion.div variants={itemVariants} className="flex items-center gap-3 origin-left">
              <div className="w-8 h-10 bg-[#FFDD00] shadow-sm" />
              <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
              v1.0 – Launch Edition
              </span>
            </motion.div>
            
            <motion.button 
              variants={itemVariants}
              onClick={() => setIsDiagnosticsOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] rounded-full border border-white/10 active:scale-95 transition-all shadow-lg hover:bg-black"
            >
              <div className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </div>
              <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">
                Live & Ready
              </span>
            </motion.button>
          </div>

          <motion.h1 
          variants={itemVariants}
          className="text-6xl font-black tracking-tighter mb-4 uppercase italic leading-[0.85] text-[#222222]"
        >
          Modern Travel<br /> Field Notes
        </motion.h1>

        <motion.p 
        variants={itemVariants}
        className="text-lg md:text-xl text-slate-500 font-light tracking-tight leading-relaxed max-w-xl"
      >
        <span className="text-[#222222] font-semibold">Instant updates</span> to solve on-the-ground friction as it happens.<br className="hidden md:block" />
        <span className="text-[#222222] font-semibold underline decoration-[#FFDD00] decoration-2 underline-offset-4">Offline Packs</span> for when the signal is spotty or dead.
      </motion.p>
        </header>

{/* System Diagnostics Trigger */}
<motion.div variants={itemVariants} className="max-w-xl mx-auto px-6 mb-16">
  <div className="flex flex-col items-center gap-4">
    <button
      onClick={() => setIsValuePropOpen(true)}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-[#222222] hover:border-slate-300 active:scale-95"
    >
      <Info size={12} className="text-slate-400" />
      More Details
    </button>

    <button 
      onClick={() => setIsDiagnosticsOpen(true)}
      className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-all duration-300 group cursor-pointer border-none bg-transparent"
    >
      <Activity size={10} className="text-emerald-600 group-hover:animate-pulse" />
      <p className="text-[9px] font-black text-[#222222] uppercase tracking-[0.2em]">
        Click to inspect system logic
      </p>
    </button>
  </div>
</motion.div>

        {/* Catalog Section */}
        <section className="max-w-xl mx-auto px-6 space-y-6">
        <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
        <div className="flex items-center flex-1 min-w-0">
          {/* Bumping to 13px (0.8125rem) is a safe baseline for headings */}
          <h2 className="text-[13px] font-black tracking-[0.15em] text-slate-500 uppercase whitespace-nowrap">
            Catalog
          </h2>
          <div className="h-[1px] flex-grow ml-3 mr-4 bg-slate-200" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            {/* 11px is the bare minimum for "secondary" data if font-weight is high */}
            <span className="text-[11px] font-bold text-slate-600 tabular-nums leading-tight">
              Currently {cityPacksList.length} City Packs
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {/* 10px is the absolute basement for legal/disclaimer-style text */}
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight leading-tight whitespace-nowrap">
                More Packs Coming Soon
              </span>
            </div>
          </div>
        </div>
      </motion.div>
          
      <motion.div variants={containerVariants} className="grid gap-4">
  {cityPacksList.map((city, index) => (
    <React.Fragment key={city.slug}>
      <motion.div
        variants={itemVariants}
        layoutId={`city-card-${city.slug}`}  // <-- enables shared layout for smooth transitions
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
      >
        <Link
          to={`/guide/${city.slug}`}
          className="group relative flex items-center justify-between bg-white border border-slate-200 p-6 rounded-[2rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#FFDD00]/40"
          onClick={(e) => {
            // Prevent layout shift on click: pre-calculate scroll restoration
            e.currentTarget.style.minHeight = `${e.currentTarget.offsetHeight}px`;
          }}
        >
          <motion.div layoutId={`city-card-bg-${city.slug}`} className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FFDD00] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r" />
          <div className="flex items-center gap-5">
            <motion.div layoutId={`city-card-icon-${city.slug}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-[#FFDD00]/10 transition-colors">
              <Globe size={22} className="text-slate-400 group-hover:text-[#222222] transition-colors" />
            </motion.div>
            <div>
              <h3 className="font-bold text-2xl tracking-tighter text-[#222222] uppercase italic leading-none">
                {city.name}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                {city.countryName} // Verified & Ready
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-[#222222] group-hover:translate-x-1 transition-all" />
        </Link>
      </motion.div>

      {index === 1 && (
        <motion.div variants={itemVariants}>
          <SpontaneityEnginePromo />
        </motion.div>
      )}
    </React.Fragment>
  ))}
</motion.div>
        </section>
      </main>
    </motion.div>
  );
}
