import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { Info, ShieldCheck, Globe, X, CloudSun, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceInfoProps {
  source: string;
  lastUpdated: string;
  isLive?: boolean;
  type?: 'transit' | 'climate' | 'currency';
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
  type = 'transit',
}: SourceInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [desktopPlacement, setDesktopPlacement] = useState<'above' | 'below'>('above');
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopStyle, setDesktopStyle] = useState<CSSProperties | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 1. AUTO-CLOSE ON SCROLL LOGIC
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      // Small delay/threshold can be added, but immediate closure feels most "secure"
      setIsOpen(false);
    };

    // Capture scroll on window and within any scrollable parent
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [isOpen]);

  const content = {
    transit: {
      title: "Verified Field Intel",
      icon: <ShieldCheck size={16} className="text-emerald-600" />,
      primary: "Sourced directly from Official Government Portals & 2026 Border Protocols.",
      secondary: "Cross-referenced with real-time transit alerts to ensure you have the most current ground logic."
    },
    climate: {
      title: "Meteorological Info",
      icon: <CloudSun size={16} className="text-sky-600" />,
      primary: "Aggregated from global meteorological stations and high-resolution satellite telemetry.",
      secondary: "Atmospheric data is processed through localized grid modeling to ensure neighborhood-level accuracy."
    },
    currency: {
      title: "Financial Intelligence",
      icon: <Coins size={16} className="text-amber-600" />,
      primary: "Real-time exchange rates sourced via global mid-market interbank feeds.",
      secondary: "Data reflects mid-market rates for reference only. Local exchange bureaus or card issuers may apply spreads."
    }
  }[type];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 768px)');
    const syncDesktop = () => setIsDesktop(media.matches);
    syncDesktop();
    media.addEventListener('change', syncDesktop);
    return () => media.removeEventListener('change', syncDesktop);
  }, []);

  useEffect(() => {
    if (!isOpen || !isDesktop || typeof window === 'undefined') return;

    const updateDesktopPosition = () => {
      if (!triggerRef.current || !panelRef.current) return;
      const edgePadding = 12;
      const gap = 10;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const panelWidth = panelRect.width || 340;
      const panelHeight = panelRect.height || 360;
      const viewportHeight = window.innerHeight;

      const spaceAbove = triggerRect.top - edgePadding;
      const spaceBelow = viewportHeight - triggerRect.bottom - edgePadding;

      let nextPlacement: 'above' | 'below' = spaceBelow < panelHeight + gap && spaceAbove > spaceBelow ? 'above' : 'below';

      setDesktopPlacement(nextPlacement);
      setDesktopStyle({
        top: Math.min(Math.max(nextPlacement === 'below' ? triggerRect.bottom + gap : triggerRect.top - panelHeight - gap, edgePadding), viewportHeight - panelHeight - edgePadding),
        left: Math.min(Math.max(triggerRect.left + triggerRect.width / 2 - panelWidth / 2, edgePadding), window.innerWidth - panelWidth - edgePadding),
        maxHeight: viewportHeight - edgePadding * 2,
      });
    };

    updateDesktopPosition();
    window.addEventListener('resize', updateDesktopPosition);
    return () => window.removeEventListener('resize', updateDesktopPosition);
  }, [isDesktop, isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-2 -m-2 flex items-center justify-center cursor-help outline-none rounded-full transition-all"
      >
        <div className="relative">
          <Info size={16} className={`${isOpen ? 'text-emerald-600' : 'text-slate-400'} transition-colors`} />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span className={`relative rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/20 z-[90] md:hidden" />
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              style={isDesktop ? desktopStyle : undefined}
              className={`fixed bottom-32 inset-x-6 mx-auto z-[100] w-auto max-w-[360px] md:inset-x-auto md:bottom-auto md:w-[340px] rounded-2xl border border-emerald-200 bg-white shadow-xl overflow-hidden ${isDesktop && !desktopStyle ? 'md:invisible' : ''}`}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -right-7 top-10 rotate-[-26deg] text-[52px] font-black tracking-[0.2em] text-slate-100/80 uppercase">
                  {type === 'climate' ? 'ATMOS' : type === 'currency' ? 'VAL' : 'OFFICIAL'}
                </div>
              </div>

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    {content.icon}
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">{content.title}</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 hover:text-slate-700"><X size={14} /></button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Globe size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                    <p className="text-sm leading-relaxed text-slate-700">{content.primary}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    Live-synced via high-bandwidth API. When offline, we use the most recent Hardened Cache from your last secure handshake.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700">{content.secondary}</p>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase text-slate-500">Last Verified</span>
                    <span className="font-semibold text-slate-700">{formatTimestamp(lastUpdated)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase text-slate-500">Data Freshness</span>
                    <span className={`font-black uppercase tracking-wider ${isLive ? 'text-emerald-700' : 'text-slate-500'}`}>{isLive ? 'Fresh' : 'Reliable Cache'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase text-slate-500">Source Feed</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[180px]">{source}</span>
                  </div>
                </div>
              </div>
              {isDesktop && (
                <div 
                  className={`
                    absolute left-1/2 -translate-x-1/2 border-8 border-transparent
                    ${desktopPlacement === 'above' 
                      ? 'top-full border-t-white' 
                      : 'bottom-full border-b-white'
                    }
                  `} 
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}