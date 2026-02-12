import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, 
  AlertTriangle, 
  Download, 
  Zap, 
  ChevronLeft,
  Plane, 
  Wifi, 
  Info, 
  Activity,
  Droplets,
  Globe,
  Navigation
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MANIFEST_URL } from '@/services/apiConfig';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DebugBanner from '@/components/DebugBanner';
import SourceInfo from '@/components/SourceInfo';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import SyncButton from '../components/SyncButton';
import FacilityKit from '@/components/FacilityKit';

/** 1. Reserved Space Skeleton */
function HighAlertSkeleton() {
  return (
    <div className="w-full h-[140px] rounded-2xl bg-slate-200/50 animate-pulse border border-slate-200/60" />
  );
}

function HighAlertBanner({
  digitalEntry,
  touristTax,
  visaStatus,
  isLive,
}: {
  digitalEntry?: string;
  touristTax?: string;
  visaStatus?: string;
  isLive: boolean;
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
      <div className="p-4 space-y-4">
        {hasVisaStatus && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Entry status</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">
                {visaStatus}
                {!isLive && (
                  <span className="block mt-1 text-[9px] font-black text-amber-700/60 uppercase tracking-tighter">
                    // Live Sync Paused - Using Cached Protocol
                  </span>
                )}
              </p>
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
          <span className="text-[13px] font-black uppercase tracking-tight text-slate-800">
            Personal Smart Guide
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-tighter mt-0.5">
          Hand-picked experiences for {city}
        </p>
      </div>
    </div>
    <div className="flex flex-col items-end opacity-60 group-hover:opacity-100 transition-opacity">
      <Activity size={16} className="text-emerald-500" />
      <span className="text-[8px] font-black uppercase tracking-widest mt-1 text-slate-500">
        View Specs
      </span>
    </div>
  </motion.button>
  );
}

const CURRENCY_PROTOCOL: Record<string, { code: string; rate: string }> = {
  TH: { code: 'THB', rate: '31.13' },
  JP: { code: 'JPY', rate: '150.40' },
  AE: { code: 'AED', rate: '3.67' },
  GB: { code: 'GBP', rate: '0.87' },
  FR: { code: 'EUR', rate: '0.94' },
  IT: { code: 'EUR', rate: '0.94' },
  ES: { code: 'EUR', rate: '0.94' },
  DE: { code: 'EUR', rate: '0.94' },
  MX: { code: 'MXN', rate: '17.05' },
  US: { code: 'USD', rate: '1.00' },
};

export default function CityGuideView() {
  const { slug } = useParams<{ slug: string }>();
  const { cityData, isLoading: packLoading, isOffline, syncStatus, error, refetch } = useCityPack(slug || '');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();  
  
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    return localStorage.getItem(`sync_${slug}`);
  });

  useEffect(() => {
    if (lastSynced && slug) {
      localStorage.setItem(`sync_${slug}`, lastSynced);
    }
  }, [lastSynced, slug]);

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

  useEffect(() => {
    if (!cityData?.countryCode) return;
    setIsApiLoading(true);
    fetchVisaCheck(DEFAULT_PASSPORT, cityData.countryCode)
      .then((data) => { if (data) setVisaData(data); })
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode]);

  const handleSync = async () => {
    try {
      await refetch();
      setLastSynced(new Date().toISOString());
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
       <p className="mt-4 text-slate-400 font-black tracking-widest uppercase text-xs animate-pulse">
         [ Accessing Field Intel... ]
       </p>
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
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${
          isOffline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white hover:bg-black'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
          {isOffline ? 'Offline Mode Active' : 'System Healthy / Live Feed Active'}
        </div>
        <div className="flex items-center gap-2 opacity-60">
          <Activity size={10} />
          <span>Under the hood</span>
        </div>
      </div>

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <Link to="/" className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-right flex flex-col items-end">
            <h1 
              className="text-4xl font-black tracking-tighter uppercase leading-none cursor-pointer italic" 
              onClick={() => {
                setDebugTapCount(p => p + 1);
                if (debugTapCount >= 4) { setShowDebug(true); setDebugTapCount(0); }
              }}
            >
              {cityData.name}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium max-w-[240px] ml-auto leading-relaxed">
              {cityData.theme}
            </p>
            
            <div className="mt-6 flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase leading-none">Local Intel</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                  {isOffline ? "Viewing Offline" : (
                    `Updated ${new Date(lastSynced || cityData.last_updated).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}`
                  )}
                </span>
              </div>
              <div className="h-9 w-[1px] bg-slate-200 mx-1" aria-hidden="true" />
              <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
            </div>
          </div>
        </div>
        <AgenticSystemTrigger city={cityData.name} onClick={() => setIsDiagnosticsOpen(true)} />
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        <section className="space-y-6">
          <div className="px-2 flex items-center justify-between">
            <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
              Survival Dashboard
              <SourceInfo source="Travel Buddy Protocol v2" lastUpdated="Synced just now" />
            </h2>
          </div>

          <div className="min-h-[140px]">
            <AnimatePresence mode="wait">
              {isApiLoading ? <HighAlertSkeleton /> : (
                <HighAlertBanner
                  digitalEntry={cityData.survival?.digitalEntry}
                  touristTax={cityData.survival?.touristTax}
                  isLive={!!visaData}
                  visaStatus={visaData?.visa_rules?.primary_rule 
                    ? `${visaData.visa_rules.primary_rule.name} - ${visaData.visa_rules.primary_rule.duration || 'N/A'}`
                    : "Standard Entry Protocol applies."}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-[2rem] shadow-lg active:scale-95 transition-transform">
                <Phone size={22} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">{label}</span>
                <span className="text-xl font-bold mt-1 tabular-nums">{number}</span>
              </div>
            ))}
          </div>
        </section>

        {cityData.arrival && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">First 60 Minutes</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <Plane size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Land & clear</span>
              </div>
              <div className="p-8 text-[#222222] font-medium leading-relaxed text-[15px]">{cityData.arrival.airportHack}</div>
              <div className="flex items-center gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                <Wifi size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Connect</span>
              </div>
              <div className="p-8 text-[15px] font-medium text-[#222222] leading-relaxed">{cityData.arrival.eSimAdvice}</div>
            </div>
          </section>
        )}

        {/* TRANSIT INTELLIGENCE SECTION */}
        {cityData.transit_logic && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">
              Transit & Transportation
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Access & Fare Strategy
                    </p>
                   
                  </div>
                </div>
                
                <p className="text-[15px] font-medium text-[#222222] leading-relaxed">
                  {cityData.transit_logic.payment_method}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      Primary Apps
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-600 uppercase italic text-right max-w-[180px]">
                    {cityData.transit_logic.primary_app}
                  </span>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Etiquette</p>
                  <p className="text-[13px] font-bold text-slate-600 italic">
                    "{cityData.transit_logic.etiquette}"
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Basic Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Droplets className="text-blue-600 mb-4" size={32} />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Tap Water</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {cityData.survival?.tapWater || "Check Local Intel"}
              </p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Zap className="text-[#d4b900] mb-4" size={32} fill="#d4b900" />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Power System</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {typeof cityData.survival?.power === 'object' ? `${cityData.survival.power.type} (${cityData.survival.power.voltage})` : cityData.survival?.power}
              </p>
            </div>
          </div>
          {cityData.facility_intel && <FacilityKit data={cityData.facility_intel} />}
        </section>

        <section className="space-y-4">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Spending Shield</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exchange Rate</p>
            </div>
            <div className="text-3xl font-black text-[#222222] tabular-nums">1 USD = {visaData?.destination?.exchange || CURRENCY_PROTOCOL[cityData.countryCode]?.rate || '---'}</div>
            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200/50 text-[14px] font-bold text-amber-900 leading-snug">
              {cityData.survival?.tipping || "Standard 10% is expected."}
            </div>
          </div>
        </section>
      </main>

      {/* FIXED DOWNLOAD BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 z-[100] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={installPWA}
            disabled={isInstalled || !isInstallable}
            className={`w-full h-16 rounded-[2rem] shadow-2xl flex items-center justify-between px-8 active:scale-[0.97] transition-all ${
              isInstalled ? 'bg-slate-100 text-slate-400' : 'bg-[#222222] text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${isInstalled ? 'bg-slate-200 text-slate-400' : 'bg-[#FFDD00] text-black'}`}>
                <Download size={20} strokeWidth={3} />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  {isInstalled ? 'Pack Installed' : 'Download Pack'}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  {isInstalled ? 'Available Offline' : `Store ${cityData.name} Offline // 2.4MB`}
                </span>
              </div>
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${isInstalled ? 'bg-blue-400' : 'bg-emerald-500 animate-pulse'}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}