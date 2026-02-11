import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ChevronRight, Globe, Activity, BrainCircuit, ArrowRight, Sparkles } from 'lucide-react';

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

      <main className="w-full py-16">
        
        {/* Header Section */}
        <header className="max-w-xl mx-auto px-6 mb-12">
          <div className="flex justify-between items-start mb-8">
            <motion.div variants={itemVariants} className="flex items-center gap-3 origin-left">
              <div className="w-8 h-10 bg-[#FFDD00] shadow-sm" />
              <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
                Protocol v2.0
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
          Modern <br /> Field Guides
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="text-xl text-slate-500 font-light tracking-tight leading-relaxed max-w-xl"
        >
          Experience <span className="text-[#222222] font-semibold">real-time syncing</span> while online and <span className="text-[#222222] font-semibold underline decoration-[#FFDD00] decoration-2 underline-offset-4">downloadable packs</span> that stay ready for <span className="text-[#222222] font-semibold">any moment</span>.
        </motion.p>
        </header>

        {/* System Diagnostics Trigger */}
        <motion.div variants={itemVariants} className="max-w-xl mx-auto px-6 mb-16">
          <div onClick={() => setIsDiagnosticsOpen(true)} className="cursor-pointer group select-none">
            <AgenticValueProp />
            <div className="flex justify-center items-center gap-2 mt-6 opacity-30 group-hover:opacity-100 transition-all duration-300">
              <Activity size={10} className="text-emerald-600" />
              <p className="text-[9px] font-black text-[#222222] uppercase tracking-[0.2em]">
                Tap blocks to inspect system logic
              </p>
            </div>
          </div>
        </motion.div>

        {/* Catalog Section */}
        <section className="max-w-xl mx-auto px-6 space-y-6">
          <motion.div variants={itemVariants} className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">
              Current Catalog
            </h2>
            <div className="h-[1px] flex-grow mx-4 bg-slate-200" />
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              {cityPacksList.length} Units
            </span>
          </motion.div>
          
          <motion.div variants={containerVariants} className="grid gap-4">
            {cityPacksList.map((city, index) => (
              <div key={city.slug}>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    to={`/guide/${city.slug}`}
                    className="group relative flex items-center justify-between bg-white border border-slate-200 p-6 rounded-[2rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#FFDD00]/40"
                  >
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FFDD00] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r" />
                    <div className="flex items-center gap-5">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-[#FFDD00]/10 transition-colors">
                        <Globe size={22} className="text-slate-400 group-hover:text-[#222222] transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl tracking-tighter text-[#222222] uppercase italic leading-none">
                          {city.name}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                          {city.countryName} // Deployment Ready
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-[#222222] group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.div>

                {/* INJECT PROMO: After the second item */}
                {index === 1 && <SpontaneityEnginePromo />}
              </div>
            ))}
          </motion.div>
        </section>
      </main>
    </motion.div>
  );
}