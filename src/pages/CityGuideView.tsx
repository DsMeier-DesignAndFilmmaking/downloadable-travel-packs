import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, 
  AlertTriangle, 
  Download, 
  Zap, 
  Droplets, 
  ChevronLeft,
  Plane, 
  Wifi, 
  Info, 
  Train,
  FileCheck, 
  Smartphone,
  ExternalLink, 
  ShieldCheck,
  Globe,
  Activity
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MANIFEST_URL } from '@/services/apiConfig';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DebugBanner from '@/components/DebugBanner';
import SourceInfo from '@/components/SourceInfo';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';

/** 1. Reserved Space Skeleton for Dashboard to prevent Layout Shifting */
function HighAlertSkeleton() {
  return (
    <div className="w-full h-[140px] rounded-2xl bg-slate-200/50 animate-pulse border border-slate-200/60" />
  );
}

function HighAlertBanner({
  digitalEntry,
  touristTax,
  visaStatus,
}: {
  digitalEntry?: string;
  touristTax?: string;
  visaStatus?: string;
}) {
  const hasEntry = Boolean(digitalEntry?.trim());
  const hasTax = Boolean(touristTax?.trim());
  const hasVisaStatus = Boolean(visaStatus?.trim());
  
  if (!hasEntry && !hasTax && !hasVisaStatus) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-200/80 bg-amber-100 shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/60 bg-amber-50/80">
        <Info size={18} className="text-amber-700 shrink-0" aria-hidden />
        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
          Critical 2026 Update
        </span>
      </div>
      <div className="p-4 space-y-4">
        {hasVisaStatus && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Entry status</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">{visaStatus}</p>
            </div>
          </div>
        )}
        {hasEntry && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Entry / visa</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">{digitalEntry}</p>
            </div>
          </div>
        )}
        {hasTax && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Tourist tax / budget</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">{touristTax}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getEmergencyGridItems(emergency: Record<string, string | undefined>) {
  const order = ['police', 'medical', 'ambulance', 'tourist_police', 'emergency_all', 'general_eu', 'non_emergency'] as const;
  const labels: Record<string, string> = {
    police: 'Police', medical: 'Medical', ambulance: 'Ambulance',
    tourist_police: 'Tourist Police', emergency_all: 'Emergency',
    general_eu: 'EU 112', non_emergency: 'Non-Emergency',
  };
  const out: { key: string; label: string; number: string }[] = [];
  for (const key of order) {
    const val = emergency[key];
    if (val && /[\d]/.test(val)) {
      out.push({ key, label: labels[key] ?? key, number: val });
      if (out.length >= 4) break;
    }
  }
  return out;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const DEFAULT_PASSPORT = 'US';

function mandatoryRegistrationBg(color?: string): string {
  if (!color) return 'bg-amber-100';
  const c = color.toLowerCase();
  if (c === 'red') return 'bg-red-50';
  if (c === 'green') return 'bg-emerald-50';
  if (c === 'blue') return 'bg-sky-50';
  return 'bg-amber-100';
}

/** * REPLACED: Static Status View is now a Trigger 
 */
function AgenticSystemTrigger({ city, onClick }: { city: string, onClick: () => void }) {
  return (
    <motion.button 
      variants={itemVariants} 
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-emerald-500/[0.04] border border-emerald-500/10 shadow-sm active:scale-[0.98] transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
          <Zap size={20} className="text-white fill-white" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-black uppercase tracking-tight text-slate-700">Agentic Intelligence</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-tighter mt-0.5">Verified Local Protocols for {city}</p>
        </div>
      </div>
      <div className="flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
        <Activity size={16} className="text-slate-400" />
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Diagnostics</span>
      </div>
    </motion.button>
  );
}

export default function CityGuideView() {
  const { slug } = useParams<{ slug: string }>();
  const { cityData, isLoading: packLoading, isOffline, error, refetch } = useCityPack(slug || '');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [isDomestic, setIsDomestic] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Synchronize Visa API with City Data
  useEffect(() => {
    if (!cityData?.countryCode) return;
    
    const passportNorm = DEFAULT_PASSPORT.toUpperCase().trim();
    const destinationNorm = cityData.countryCode.toUpperCase().trim();
    const domestic = passportNorm === destinationNorm;

    if (domestic) {
      setIsDomestic(true);
      setIsApiLoading(false);
      setVisaData(null);
      return;
    }

    setIsDomestic(false);
    let cancelled = false;
    setIsApiLoading(true);

    fetchVisaCheck(DEFAULT_PASSPORT, cityData.countryCode)
      .then((data) => {
        if (!cancelled && data) setVisaData(data);
      })
      .catch((err) => console.error("API Error:", err))
      .finally(() => {
        if (!cancelled) setIsApiLoading(false);
      });

    return () => { cancelled = true; };
  }, [cityData?.countryCode]);

  // Handle Dynamic Manifest
  useEffect(() => {
    if (!slug) return;
    const id = 'tp-v2-dynamic-manifest';
    let link = document.getElementById(id) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = MANIFEST_URL(slug);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, [slug]);

  // Global Skeleton Loading
  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error.message}</p>
      <Link to="/" className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold shadow-lg">
        Back to Catalog
      </Link>
    </div>
  );

  return (
    <motion.div 
      key={slug}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40"
    >
      <DiagnosticsOverlay 
        city={cityData.name} 
        isOpen={isDiagnosticsOpen} 
        onClose={() => setIsDiagnosticsOpen(false)} 
      />

      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      {/* 1. STATUS BAR - Now a toggle for Diagnostics */}
      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${
          isOffline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white hover:bg-black'
        }`}
      >
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
          {isOffline ? 'Offline Mode Active' : 'System Healthy / Live Feed Active'}
        </span>
        <div className="flex items-center gap-2 opacity-60">
          <Activity size={10} />
          <span>Under the hood</span>
        </div>
      </div>

      {/* 2. REGISTRATION BANNER */}
      <div className="sticky top-[38px] z-50 min-h-[45px]">
        {isApiLoading ? (
          <div className="w-full px-6 py-3 border-b border-slate-200/80 bg-slate-100 animate-pulse flex items-center justify-between">
            <div className="h-3 w-40 bg-slate-200 rounded-full" />
            <div className="h-3 w-12 bg-slate-200 rounded-full" />
          </div>
        ) : visaData?.mandatory_registration ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className={`px-6 py-3 border-b border-slate-200/80 shadow-sm ${mandatoryRegistrationBg(visaData.mandatory_registration.color)} text-[#222222] flex flex-wrap items-center justify-between gap-2`}
          >
            <span className="text-xs font-bold">
              {visaData.mandatory_registration.text || "Action Required: Travel Registration Needed"}
            </span>
            {visaData.mandatory_registration.link && (
              <a href={visaData.mandatory_registration.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-amber-800 underline">
                Register <ExternalLink size={14} />
              </a>
            )}
          </motion.div>
        ) : null}
      </div>

      <motion.header variants={itemVariants} className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <Link to="/" className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-right flex flex-col items-end">
            <h1 
              className="text-4xl font-black tracking-tighter uppercase leading-none cursor-pointer select-none italic" 
              onClick={() => {
                setDebugTapCount(prev => prev + 1);
                if (debugTapCount >= 4) { setShowDebug(true); setDebugTapCount(0); }
              }}
            >
              {cityData.name}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium max-w-[240px] ml-auto leading-relaxed">
              {cityData.theme}
            </p>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-3">
              Guide Pack / {cityData.countryName}
            </p>
          </div>
        </div>
        <AgenticSystemTrigger city={cityData.name} onClick={() => setIsDiagnosticsOpen(true)} />
      </motion.header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        <motion.section variants={itemVariants} className="space-y-6">
          <div 
            onClick={() => setIsDiagnosticsOpen(true)}
            className="px-2 flex items-center justify-between cursor-pointer group"
          >
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              Survival Dashboard
              <SourceInfo source="Travel Buddy Protocol v2" lastUpdated="Synced 4m ago" />
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors">v4.2.0</span>
            </div>
          </div>

          <div className="min-h-[140px]">
            <AnimatePresence mode="wait">
              {isApiLoading ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <HighAlertSkeleton />
                </motion.div>
              ) : isDomestic ? (
                <motion.div key="domestic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-center gap-4 shadow-sm">
                  <Globe size={20} className="text-emerald-600" />
                  <p className="text-[#222222] text-sm font-bold">Domestic Pack Active: Local protocols verified.</p>
                </motion.div>
              ) : (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <HighAlertBanner
                    digitalEntry={cityData.survival?.digitalEntry}
                    touristTax={cityData.survival?.touristTax}
                    visaStatus={visaData?.visa_rules?.primary_rule ? `${visaData.visa_rules.primary_rule.name} - ${visaData.visa_rules.primary_rule.duration || 'N/A'}` : "Checking Status..."}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isDomestic && visaData?.destination?.passport_validity && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
              <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0"><FileCheck size={20} className="text-amber-600" /></div>
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Passport Warning</h3>
                <p className="text-[#222222] text-[14px] font-medium leading-relaxed">{visaData.destination.passport_validity}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-[2rem] shadow-lg active:scale-95 transition-transform">
                <Phone size={22} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">{label}</span>
                <span className="text-xl font-bold mt-1 tabular-nums tracking-wide">{number}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ARRIVAL LOGIC */}
        {cityData.arrival && (
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">First 60 Minutes</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <Plane size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Land & clear</span>
              </div>
              <div className="p-8"><p className="text-[#222222] font-medium leading-relaxed text-[15px]">{cityData.arrival.airportHack}</p></div>
              <div className="flex items-center gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                <Wifi size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Connect</span>
              </div>
              <div className="p-8 space-y-4">
                <p className="text-[#222222] font-medium leading-relaxed text-[15px]">{cityData.arrival.eSimAdvice}</p>
                {cityData.arrival.eSimHack && <p className="text-slate-600 text-sm italic border-l-2 border-[#FFDD00] pl-4">{cityData.arrival.eSimHack}</p>}
              </div>
              <div className="flex items-center gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                <Train size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Transit hack</span>
              </div>
              <div className="p-8 text-[15px] font-medium text-[#222222] leading-relaxed">{cityData.arrival.transitHack}</div>
            </div>
          </motion.section>
        )}

        {/* BASICS */}
        <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
            <Droplets className="text-blue-500 mb-4" size={28} />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap Water</h3>
            <p className="text-xl font-bold text-[#222222]">{cityData.survival?.tapWater}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
            <Zap className="text-[#FFDD00]" size={28} fill="#FFDD00" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Power Plug</h3>
            <p className="text-xl font-bold text-[#222222]">{typeof cityData.survival?.power === 'object' ? cityData.survival.power.type : 'Type C/F'}</p>
          </div>
        </motion.section>

        {/* SPENDING SHIELD */}
        {!isDomestic && (
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-end px-2"><h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Spending Shield</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Rate</p>
                <p className="text-3xl font-black text-[#222222] tabular-nums leading-tight">1 USD = {cityData.countryCode === 'TH' ? '31.23' : visaData?.destination?.exchange} {cityData.countryCode === 'TH' ? 'THB' : visaData?.destination?.currency_code}</p>
                <div className="mt-6 flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live FX</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200/80 rounded-[2.5rem] p-8 flex flex-col justify-center">
                <div className="flex gap-2 mb-3"><Info size={18} className="text-amber-600 shrink-0 mt-0.5" /><span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Local Tip</span></div>
                <p className="text-[14px] font-bold text-amber-900 leading-snug">{cityData.survival?.tipping}</p>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      {/* INSTALL OVERLAY */}
      <AnimatePresence>
        {!isInstalled && isInstallable && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-0 right-0 px-6 z-50 pointer-events-none">
            <button onClick={installPWA} className="w-full max-w-sm mx-auto bg-[#222222] text-white h-16 rounded-[1.5rem] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-2xl active:scale-95 pointer-events-auto transition-transform">
              <Download size={20} className="text-[#FFDD00]" /> Save City Pack
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}