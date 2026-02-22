import { useState, useRef, useEffect } from 'react';
import { Info, ShieldCheck, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceInfoProps {
  source: string;
  lastUpdated: string;
  isLive?: boolean;
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || 'Pending verification';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SourceInfo({
  source,
  lastUpdated,
  isLive = false,
}: SourceInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [desktopPlacement, setDesktopPlacement] = useState<'above' | 'below'>('above');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    console.log('🛡️ DATA INTEGRITY REPORT:', {
      source,
      timestamp: lastUpdated,
      syncStatus: isLive,
    });
  }, [isLive, isOpen, lastUpdated, source]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const updatePlacement = () => {
      if (window.innerWidth < 768) return;
      if (!triggerRef.current || !panelRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const panelHeight = panelRef.current.offsetHeight || 360;
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;

      // Prefer top placement, but flip below if top space is insufficient.
      if (spaceAbove < panelHeight + 20 && spaceBelow > spaceAbove) {
        setDesktopPlacement('below');
      } else {
        setDesktopPlacement('above');
      }
    };

    const rafId = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-2 -m-2 flex items-center justify-center cursor-help outline-none rounded-full transition-all"
        aria-label="Open data integrity details"
      >
        <div className="relative">
          <Info
            size={16}
            className={`${isOpen ? 'text-emerald-600' : 'text-slate-400'} transition-colors`}
          />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-[90] md:hidden"
            />

            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="
                fixed bottom-32 inset-x-6 mx-auto z-[100] w-auto max-w-[360px]
                md:absolute md:left-1/2 md:-translate-x-1/2 md:inset-x-auto md:w-[340px]
                overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]
                ${desktopPlacement === 'above' ? 'md:bottom-full md:mb-4' : 'md:top-full md:mt-4'}
              "
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -right-7 top-10 rotate-[-26deg] text-[52px] font-black tracking-[0.2em] text-slate-100/80">
                  OFFICIAL
                </div>
              </div>

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Verified Field Intel
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-slate-500 hover:text-slate-700"
                    aria-label="Close data integrity overlay"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Globe size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                    <p className="text-sm leading-relaxed text-slate-700">
                      Sourced directly from Official Government Portals &amp; 2026 Border Protocols.
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700">
                    Live-synced every 60 minutes. When you&apos;re offline, we use the most recent Hardened Cache from your last connection.
                  </p>

                  <p className="text-sm leading-relaxed text-slate-700">
                    Cross-referenced with real-time transit alerts to ensure you have the most current ground logic.
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wide text-slate-500">Last Verified</span>
                    <span className="font-semibold text-slate-700">{formatTimestamp(lastUpdated)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wide text-slate-500">Data Freshness</span>
                    <span className={`font-black uppercase tracking-[0.12em] ${isLive ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {isLive ? 'Fresh' : 'Reliable Cache'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wide text-slate-500">Source Feed</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[180px]">{source}</span>
                  </div>
                </div>
              </div>

              {desktopPlacement === 'above' ? (
                <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
              ) : (
                <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white" />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
