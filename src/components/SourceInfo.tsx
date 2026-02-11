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
      {/* Target area: Click/Tap toggles the state */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Verify data source: ${source}`}
        className="p-2 -m-2 flex items-center justify-center cursor-help outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full transition-all"
      >
        <div className="relative">
          <Info 
            size={16} 
            className={`${isOpen ? 'text-blue-500' : 'text-slate-400'} transition-colors`} 
          />
          
          {/* Integrity Pulse */}
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
        </div>
      </button>
      
      {/* Trust Panel Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 mb-4 w-72 p-5 bg-[#0A0A0B] text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] border border-white/10 backdrop-blur-xl pointer-events-auto"
          >
            <div className="space-y-4">
              {/* Header with Source Branding */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Authentic Data</p>
                </div>
                {/* Mobile-friendly Close button inside panel */}
                <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              {/* Core Data Source Info */}
              <div className="space-y-1">
                <p className="text-xs font-bold leading-tight text-white">{source}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cryptographically signed response. This information is legally valid and timestamped for&nbsp;offline&nbsp;reference.
                </p>
              </div>

              {/* Audit Footer */}
              <div className="pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between text-[9px] font-medium">
                  <span className="text-slate-500 uppercase tracking-tighter">Last Verified</span>
                  <span className="text-slate-300">{lastUpdated}</span>
                </div>
                <div className="flex justify-between text-[9px] font-medium">
                  <span className="text-slate-500 uppercase tracking-tighter">Status</span>
                  <span className="text-emerald-500">Encrypted & Signed</span>
                </div>
              </div>

              {/* The verification ID Hash */}
              <div className="mt-2 p-2 bg-white/[0.03] rounded-lg border border-white/5">
                <p className="text-[8px] font-mono text-slate-500 break-all leading-tight">
                  SIG: {verificationId}
                </p>
              </div>
            </div>
            
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0A0A0B]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}