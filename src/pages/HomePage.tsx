import { Link } from 'react-router-dom';
import { cityPacksList } from '../services/cityService';
import { Search, ChevronRight, Globe } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import AgenticValueProp from '../components/AgenticValueProp';

// Toggle this to true in Phase 2 to re-enable the UI
const SHOW_SEARCH = false;

const containerVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 8 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { 
      duration: 0.3,
      ease: "easeInOut" 
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } 
  },
};

export default function HomePage() {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-screen bg-[#F7F7F7] text-[#222222] antialiased"
    >
      <main className="max-w-xl mx-auto px-6 py-16">
        <header className="mb-16"> {/* Increased margin for better breathing room without search */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3 mb-6 origin-left"
          >
            <div className="w-8 h-10 bg-[#FFDD00] shadow-sm" />
            <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">Field Guides 2026</span>
          </motion.div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-3 uppercase italic">Travel Packs</h1>
          <p className="text-xl text-slate-500 font-light tracking-tight">Precision survival data for the modern explorer.</p>
        </header>

        {/* Agentic Value Prop hero — Compliance Autopilot, Friction Masking, Real-Time Shield */}
        <div className="mb-14">
          <AgenticValueProp />
        </div>

        {/* Search UI preserved but hidden via SHOW_SEARCH constant */}
        {SHOW_SEARCH && (
          <div className="relative mb-12 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search destination..." 
              className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#FFDD00]/20 focus:border-[#FFDD00] transition-all placeholder:text-slate-400"
            />
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">Current Catalog</h2>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{cityPacksList.length} Packs Loaded</span>
          </div>
          
          <motion.div 
            variants={containerVariants}
            className="grid gap-4"
          >
            {cityPacksList.map((city) => (
              <motion.div
                key={city.slug}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  to={`/guide/${city.slug}`}
                  className="group relative flex items-center justify-between bg-white border border-slate-200 p-6 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:border-[#FFDD00]/30"
                >
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FFDD00] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r" />
                  
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-[#FFDD00]/10 transition-colors">
                      <Globe size={22} className="text-slate-400 group-hover:text-[#222222]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl tracking-tight text-[#222222] uppercase">{city.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{city.countryName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-[#222222] transition-colors" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </motion.div>
  );
}