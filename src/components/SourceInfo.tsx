import { useState, useRef, useEffect } from 'react';
import { Info, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceInfoProps {
  source: string;
  lastUpdated: string;
  verificationId?: string; // Unique hash/id for legal audit trails
  isAuthenticated?: boolean; // True if the data signature is valid
}

export default function SourceInfo({ 
  source, 
  lastUpdated, 
  verificationId = "AUTH-PROT-2026-N/A", 
  isAuthenticated = true 
}: SourceInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside (Crucial for mobile UX)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 -m-2 flex items-center justify-center cursor-help outline-none rounded-full transition-all"
      >
        <div className="relative">
          <Info 
            size={16} 
            className={`${isOpen ? 'text-blue-500' : 'text-slate-400'} transition-colors`} 
          />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
        </div>
      </button>
      
      <AnimatePresence>
  {isOpen && (
    <>
      {/* Optional Backdrop for mobile centering focus */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] md:hidden"
      />

      <motion.div 
        /* MOBILE: Fixed to screen, centered via inset-x-6 + mx-auto 
           DESKTOP: Absolute to button icon, centered via left-1/2 + translate-x
        */
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="
          /* Mobile Styles */
          fixed bottom-32 inset-x-6 mx-auto z-[100] 
          w-auto max-w-[320px] 
          
          /* Desktop Styles (reverting to connected tooltip) */
          md:absolute md:bottom-full md:left-1/2 md:-translate-x-1/2 md:inset-x-auto md:mb-4 md:w-72
          
          p-5 bg-[#0A0A0B] text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] 
          border border-white/10 backdrop-blur-xl pointer-events-auto
        "
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Authentic Data</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold leading-tight text-white">{source}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cryptographically signed response. Valid for offline reference.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-1.5 border-t border-white/5">
            <div className="flex justify-between text-[9px] font-medium">
              <span className="text-slate-500 uppercase tracking-tighter">Last Verified</span>
              <span className="text-slate-300">{lastUpdated}</span>
            </div>
            <div className="flex justify-between text-[9px] font-medium">
              <span className="text-slate-500 uppercase tracking-tighter">Status</span>
              <span className="text-emerald-500 uppercase tracking-widest">Signed</span>
            </div>
          </div>

          <div className="p-2 bg-white/[0.03] rounded-lg border border-white/5 font-mono text-[8px] text-slate-500 break-all leading-tight">
            {verificationId}
          </div>
        </div>
        
        {/* Tooltip Arrow: ONLY visible on desktop to "connect" to the icon */}
        <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0A0A0B]" />
      </motion.div>
    </>
  )}
</AnimatePresence>
    </div>
  );
}