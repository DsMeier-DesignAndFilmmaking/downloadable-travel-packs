import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Layers } from 'lucide-react';

export default function SpontaneityEnginePromo() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-[2.5rem]"
    >
      <div className="block group">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0F1115] p-8 md:p-10 shadow-2xl transition-all duration-500 border border-white/5">
          
          {/* Dual Ambient Glow */}
          <div className="absolute -top-32 -right-32 h-64 md:h-80 w-64 md:w-80 rounded-full bg-[#6366F1]/10 blur-[80px] md:blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 h-64 md:h-80 w-64 md:w-80 rounded-full bg-[#F59E0B]/5 blur-[80px] md:blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-6">
            
        {/* VERTICALLY STACKED PREMIERE TAG */}
<div className="flex flex-wrap items-center gap-3">
  {/* The Visual Badge */}
  <div className="bg-[#F59E0B] px-3 py-1 rounded-md shadow-[0_2px_8px_rgba(245,158,11,0.2)] flex items-center gap-2 shrink-0">
    <span className="text-[9px] font-[1000] text-black uppercase tracking-[0.1em] italic leading-none">
      Premiere Feature
    </span>
    <div className="h-1 w-1 rounded-full bg-black/40 animate-pulse" />
  </div>
  
  {/* The Customer-Facing Message */}
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      <span className="text-[#818CF8]">Currently in the Lab</span>
    </span>
  </div>
</div>

            <div className="space-y-4">
              <h2 className="text-2xl md:text-4xl font-black text-[#F8F9FA] tracking-tighter uppercase italic leading-[0.9] md:leading-[0.85]">
                The Spontaneity <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-orange-200/50">Engine</span>
              </h2>

              <p className="text-[13px] md:text-[15px] text-slate-300 font-light leading-relaxed max-w-full md:max-w-[340px]">
                Pairing <span className="text-[#818CF8] font-medium">real-time transport data</span> with insider local knowledge to guide you effortlessly through&nbsp;any&nbsp;city.
              </p>
            </div>

            {/* CTA */}
            <a 
              href="https://dan-meier-portfolio.vercel.app/projects/travel-and-ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white hover:text-[#F59E0B] transition-all w-fit group/cta pt-2"
            >
              <span className="border-b border-white/20 pb-1 group-hover/cta:border-[#F59E0B] transition-colors">
                  System Architecture
              </span>
              <ArrowRight size={14} className="group-hover/cta:translate-x-2 transition-transform" />
            </a>
          </div>

          {/* Decorative Badge */}
          <div className="absolute -bottom-4 -right-4 md:bottom-[-20px] md:right-[-20px] opacity-[0.05] rotate-12 pointer-events-none">
            <Sparkles size={100} className="text-[#F59E0B] md:w-[160px] md:h-[160px]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}