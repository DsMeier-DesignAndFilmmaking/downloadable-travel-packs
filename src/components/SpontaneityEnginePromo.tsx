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
          
          {/* Status Tag: Using "Aerospace Teal" for reliability */}
          <div className="md:absolute md:top-8 md:right-8 mb-6 md:mb-0 flex items-center gap-2 px-3 py-1 rounded-full bg-[#2DD4BF]/5 border border-[#2DD4BF]/20 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2DD4BF]"></span>
            </span>
            <span className="text-[9px] font-black text-[#2DD4BF] uppercase tracking-[0.2em] whitespace-nowrap">
            Live Demo // <br></br>Sandbox Environment
          </span>
          </div>

          {/* Dual Ambient Glow: Indigo (AI) vs Terra (Travel) */}
          <div className="absolute -top-32 -right-32 h-64 md:h-80 w-64 md:w-80 rounded-full bg-[#6366F1]/10 blur-[80px] md:blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 h-64 md:h-80 w-64 md:w-80 rounded-full bg-[#F59E0B]/5 blur-[80px] md:blur-[100px]" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
              {/* Icon Box: Deep Indigo border for "Intelligence" */}
              <div className="p-2.5 md:p-3 bg-white/5 rounded-xl border border-[#6366F1]/30">
                <Layers size={20} className="text-[#818CF8] md:w-[22px] md:h-[22px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#818CF8]">
                  Agentic Protocol
                </span>
                <span className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">
                  Neural Mobility Core
                </span>
              </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-[#F8F9FA] tracking-tighter uppercase italic leading-[0.9] md:leading-[0.85] mb-4 md:mb-6">
              The Spontaneity <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-orange-200/50">Engine</span>
            </h2>

            <p className="text-[13px] md:text-[15px] text-slate-300 font-light leading-relaxed max-w-full md:max-w-[340px] mb-8 md:mb-10">
              Pairing <span className="text-[#818CF8] font-medium">real-time transport data</span> with insider local knowledge to guide you effortlessly through&nbsp;any&nbsp;city.
              <span className="block mt-2 text-slate-500 italic text-[12px] md:text-[14px]">
                Phase I: Global Intelligence&nbsp;Layer.
              </span>
            </p>

            {/* CTA: Subtle Terra Amber hover to represent the "Warmth" of travel */}
            <a 
              href="https://dan-meier-portfolio.vercel.app/projects/travel-and-ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white hover:text-[#F59E0B] transition-all w-fit group/cta"
            >
              <span className="border-b border-white/20 pb-1 group-hover/cta:border-[#F59E0B] transition-colors">
                  System Architecture
              </span>
              <ArrowRight size={14} className="group-hover/cta:translate-x-2 transition-transform" />
            </a>
          </div>

          {/* Decorative Badge: Faint Terra Glow */}
          <div className="absolute -bottom-4 -right-4 md:bottom-[-20px] md:right-[-20px] opacity-[0.05] rotate-12">
            <Sparkles size={100} className="text-[#F59E0B] md:w-[160px] md:h-[160px]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}