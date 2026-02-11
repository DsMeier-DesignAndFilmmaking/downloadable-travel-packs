import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Layers } from 'lucide-react';

export default function SpontaneityEnginePromo() {
  return (
    // Changed from motion.a to motion.div
    <motion.div
      className="block my-8 group"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1A1C1E] p-8 md:p-10 shadow-2xl transition-all duration-500">
        
        {/* Status Tag */}
        <div className="md:absolute md:top-8 md:right-8 mb-6 md:mb-0 flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8FBF8]/5 border border-[#E8FBF8]/10 w-fit">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8FBF8] opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8FBF8]"></span>
          </span>
          <span className="text-[9px] font-black text-[#E8FBF8] uppercase tracking-[0.2em] whitespace-nowrap">
            Currently in R & D
          </span>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-32 -right-32 h-64 md:h-80 w-64 md:w-80 rounded-full bg-[#E8FBF8]/5 blur-[80px] md:blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6 md:mb-8">
            <div className="p-2.5 md:p-3 bg-[#E8FBF8]/5 rounded-xl border border-[#E8FBF8]/10">
              <Layers size={20} className="text-[#E8FBF8] md:w-[22px] md:h-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[#E8FBF8]">
                Intelligent Systems
              </span>
              <span className="text-[8px] md:text-[9px] font-medium text-slate-500 uppercase tracking-widest">
                Modular Mobility Architecture
              </span>
            </div>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-[#F8F9FA] tracking-tighter uppercase italic leading-[0.9] md:leading-[0.85] mb-4 md:mb-6">
            The Spontaneity <br /> Engine
          </h2>

          <p className="text-[13px] md:text-[15px] text-slate-300 font-light leading-relaxed max-w-full md:max-w-[320px] mb-8 md:mb-10">
            Orchestrating <span className="text-white font-medium">integrated intelligence</span> to transform real-time context into verifiable local experiences. 
            <span className="block mt-2 text-slate-500 italic text-[12px] md:text-[14px]">Phase I: Architectural Research & Protocol.</span>
          </p>

          {/* THE ONLY CLICKABLE ELEMENT */}
          <a 
            href="https://dan-meier-portfolio.vercel.app/projects/travel-and-ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#F8F9FA] hover:gap-5 transition-all w-fit group/cta"
          >
            <span className="border-b border-[#E8FBF8]/60 pb-1 group-hover/cta:border-[#E8FBF8] transition-colors">
                View System Architecture
            </span>
            <ArrowRight size={14} className="text-[#E8FBF8] md:w-[16px] md:h-[16px]" />
          </a>
        </div>

        {/* Decorative Badge */}
        <div className="absolute -bottom-4 -right-4 md:bottom-[-20px] md:right-[-20px] opacity-[0.03]">
          <Sparkles size={100} className="text-[#E8FBF8] md:w-[160px] md:h-[160px]" />
        </div>
      </div>
    </motion.div>
  );
}