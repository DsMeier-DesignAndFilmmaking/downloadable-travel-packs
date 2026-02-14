import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Navigation,
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { CityPack } from '@/types/cityPack';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { getCleanSlug } from '@/utils/slug';
import { isGuideOfflineAvailable } from '@/utils/cityPackIdb';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DebugBanner from '@/components/DebugBanner';
import SourceInfo from '@/components/SourceInfo';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import SyncButton from '../components/SyncButton';
import FacilityKit from '@/components/FacilityKit';
import GuideDebugPanel from '@/components/GuideDebugPanel';

// ---------------------------------------------------------------------------
// IndexedDB: persist city pack after load (same store as cityPackIdb, keyPath 'slug')
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('travel-packs-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('city-packs')) {
        db.createObjectStore('city-packs', { keyPath: 'slug' });
      }
    };
  });
}

async function saveCityToIndexedDB(slug: string, cityData: CityPack): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('city-packs', 'readwrite');
  const store = tx.objectStore('city-packs');
  store.put({
    slug,
    pack: cityData,
    data: cityData,
    lastUpdated: Date.now(),
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  console.log('💾 Saved to IndexedDB:', slug);
}

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

/** FIX: Optimized variants to prevent page shifting */
const containerVariants: Variants = {
  hidden: { 
    opacity: 0,
    transition: { when: "afterChildren" }
  },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  },
  exit: { 
    opacity: 0,
    filter: "blur(10px)",
    position: "fixed", // Critical: prevents the next page from jumping down
    top: 0,
    left: 0,
    right: 0,
    transition: { duration: 0.3, ease: "easeInOut" } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const DEFAULT_PASSPORT = 'US';

function AgenticSystemTrigger({ onClick }: {
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Zap size={14} />
      <span>Live Intelligence</span>
      <Activity size={14} className="opacity-60" />
    </motion.button>
  );
}

const CURRENCY_PROTOCOL: Record<string, { code: string; rate: string }> = {
  TH: { code: 'THB', rate: '31.13' }, JP: { code: 'JPY', rate: '150.40' },
  AE: { code: 'AED', rate: '3.67' }, GB: { code: 'GBP', rate: '0.87' },
  FR: { code: 'EUR', rate: '0.94' }, IT: { code: 'EUR', rate: '0.94' },
  ES: { code: 'EUR', rate: '0.94' }, DE: { code: 'EUR', rate: '0.94' },
  MX: { code: 'MXN', rate: '17.05' }, US: { code: 'USD', rate: '1.00' },
};

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();
  const {
    cityData,
    isLoading: packLoading,
    isOffline,
    isLocalData,
    syncStatus,
    error,
    refetch,
  } = useCityPack(cleanSlug ?? undefined);
  const { installPWA, isInstalled, showMobileOverlay, dismissMobileOverlay } = usePWAInstall(
    cleanSlug ?? ''
  );

  // Dynamic manifest scoped to this guide (start_url/scope = /guide/{slug})
  // /Users/danielmeier/Desktop/Downloadable_Travel-Packs/src/pages/CityGuideView.tsx

  useEffect(() => {
    if (!cleanSlug) return;
  
    // 1. Remove "Ghost" manifests
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
  
    // 2. Inject Fresh Identity
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.setAttribute('type', 'application/manifest+json'); // Force JSON interpretation
    link.crossOrigin = 'use-credentials'; 
    
    // Use query param style to match sw.ts bypass logic
    link.href = `/api/manifest?slug=${cleanSlug}&v=${Date.now()}`;
    
    document.head.appendChild(link);
    localStorage.setItem('pwa_last_pack', `/guide/${cleanSlug}`);
  
    console.log(`🎯 Identity Swap: Manifest requested for ${cleanSlug}`);
  }, [cleanSlug]);
  // Online/offline and offline-availability state
  const isOnline = !isOffline;
  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);

  const isOfflineAvailable = useMemo(
    () => Boolean(cityData && (isOffline || isLocalData)),
    [cityData, isOffline, isLocalData]
  );

  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`sync_${cleanSlug}`) : null
  );

  // Check IndexedDB for this guide on mount (for "available offline" badge before data loads)
useEffect(() => {
  if (!cleanSlug) return;
  isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
}, [cleanSlug]);

// Persist to IndexedDB
useEffect(() => {
  if (!cleanSlug || !cityData || isOffline) return; // Don't try to write if we know we're offline
  saveCityToIndexedDB(cleanSlug, cityData).catch((err) => {
    console.warn('💾 IDB Write Failed:', err);
  });
}, [cleanSlug, cityData, isOffline]);

/**
 * BLOCK 2: DATA CACHING
 * Tells the Service Worker to download the specific assets for this city.
 */
useEffect(() => {
  // Use 'controller' to ensure the SW is active and ready for messages
  if (!('serviceWorker' in navigator) || !cleanSlug || !navigator.serviceWorker.controller) {
    return;
  }

  // Tell the global SW to partition data for this specific slug
  navigator.serviceWorker.controller.postMessage({ 
    type: 'CACHE_CITY', 
    citySlug: cleanSlug 
  });
  
  console.log(`📡 SW Signaling: Caching intel for ${cleanSlug}`);
}, [cleanSlug, cityData]); // Re-runs if slug changes or data refreshes

// --- END OF PWA BLOCKS ---

  useEffect(() => {
    if (lastSynced && cleanSlug) localStorage.setItem(`sync_${cleanSlug}`, lastSynced);
  }, [lastSynced, cleanSlug]);

  // Deep-link guard: remember last viewed pack for PWA standalone re-open
  useEffect(() => {
    if (cleanSlug && cityData && typeof window !== 'undefined') {
      try {
        localStorage.setItem('pwa_last_pack', window.location.pathname);
      } catch {
        // ignore quota or private mode
      }
    }
  }, [cleanSlug, cityData]);

  useEffect(() => {
    if (!cityData?.countryCode) return;
    
    // If we are offline, don't even try the Visa API to avoid hangs
    if (isOffline) {
      setIsApiLoading(false);
      return;
    }

    setIsApiLoading(true);
    fetchVisaCheck(DEFAULT_PASSPORT, cityData.countryCode)
      .then((data) => { 
        if (data) setVisaData(data); 
      })
      .catch(err => {
        console.error("Visa Check Protocol Failed:", err);
      })
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]); // Added isOffline to dependency

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
      <button
        onClick={() => navigate(-1)}
        className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
      >
        Back to Catalog
      </button>
    </div>
  );

  return (
    <motion.div 
      key={cleanSlug}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40 w-full overflow-x-hidden"
    >
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${
          !isOnline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white hover:bg-black'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
          {!isOnline ? 'Offline Mode Active' : 'System Healthy / Live Feed Active'}
          {(offlineAvailable || isOfflineAvailable) && (
            <span className="opacity-80"> · Available offline</span>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-60">
          <Activity size={10} />
          <span>Under the hood</span>
        </div>
      </div>

      {import.meta.env.DEV && cleanSlug && (
        <div className="px-6 max-w-2xl mx-auto mt-2">
          <GuideDebugPanel slug={cleanSlug} />
        </div>
      )}

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
  <div className="flex justify-between items-start mb-10">
    <button
      onClick={() => navigate(-1)}
      className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform"
    >
      <ChevronLeft size={20} />
    </button>

    <div className="text-right flex flex-col items-end">
      <h1
        className="text-4xl font-black tracking-tighter uppercase leading-none cursor-pointer italic"
        onClick={() => {
          setDebugTapCount(p => p + 1);
          if (debugTapCount >= 4) {
            setShowDebug(true);
            setDebugTapCount(0);
          }
        }}
      >
        {cityData.name}
      </h1>

      <p className="text-sm text-slate-600 mt-2 font-medium max-w-[240px] ml-auto leading-relaxed">
        {cityData.theme}
      </p>

      <div className="mt-6 flex items-center gap-4 flex-wrap justify-end">
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase leading-none">
            Local Intel
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            {isOffline
              ? 'Viewing Offline'
              : `Updated ${new Date(
                  lastSynced || cityData.last_updated
                ).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
          </span>
        </div>

        <div className="h-8 w-[1px] bg-slate-200" />

        <SyncButton
          onSync={handleSync}
          isOffline={isOffline}
          status={syncStatus}
        />

        <AgenticSystemTrigger
          onClick={() => setIsDiagnosticsOpen(true)}
        />
      </div>
    </div>
  </div>
</header>


      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {/* Survival Section */}
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

        {/* Arrival Section */}
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

        {/* Transit Section */}
        {cityData.transit_logic && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Transit & Transportation</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Navigation size={20} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access & Fare Strategy</p>
              </div>
              <p className="text-[15px] font-medium text-[#222222] leading-relaxed">{cityData.transit_logic.payment_method}</p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Primary Apps</span>
                </div>
                <span className="text-xs font-black text-blue-600 uppercase italic text-right max-w-[180px]">{cityData.transit_logic.primary_app}</span>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Etiquette</p>
                <p className="text-[13px] font-bold text-slate-600 italic">"{cityData.transit_logic.etiquette}"</p>
              </div>
            </div>
          </section>
        )}

        {/* Basic Needs Section */}
        <section className="space-y-6">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Basic Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Droplets className="text-blue-600 mb-4" size={32} />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Tap Water</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">{cityData.survival?.tapWater || "Check Local Intel"}</p>
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

        {/* Spending Section */}
        <section className="space-y-4">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Spending Shield</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exchange Rate</p>
            </div>
            <div className="text-3xl font-black text-[#222222] tabular-nums">
              1 USD = {visaData?.destination?.exchange || CURRENCY_PROTOCOL[cityData.countryCode]?.rate || '---'}
            </div>
            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200/50 text-[14px] font-bold text-amber-900 leading-snug">
              {cityData.survival?.tipping || "Standard 10% is expected."}
            </div>
          </div>
        </section>
      </main>

      {/* FIXED DOWNLOAD BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-[#F7F7F7]/60 backdrop-blur-xl border-t border-slate-200/50" 
             style={{ maskImage: 'linear-gradient(to top, black 80%, transparent)' }} />
        <div className="relative p-6 pb-10 max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={installPWA}
            disabled={isInstalled}
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
                  {isInstalled
                    ? 'Available Offline'
                    : isOfflineAvailable || offlineAvailable
                      ? 'Cached · Add to Home Screen'
                      : `Store ${cityData.name} Offline // 2.4MB`}
                </span>
              </div>
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${isInstalled ? 'bg-blue-400' : 'bg-emerald-500 animate-pulse'}`} />
          </button>
        </div>
      </div>

      {/* Mobile overlay: Share → Add to Home Screen (when no beforeinstallprompt) */}
      <AnimatePresence>
        {showMobileOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 flex items-end justify-center p-6 pb-24"
            onClick={dismissMobileOverlay}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#F7F7F7] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200"
            >
              <p className="text-[#222222] font-bold text-center mb-4">Add to Home Screen</p>
              <ol className="text-slate-600 text-sm space-y-3 mb-6 list-decimal list-inside">
                <li>Tap the Share icon (box with arrow)</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
              </ol>
              <button
                onClick={dismissMobileOverlay}
                className="w-full py-3 rounded-full bg-[#222222] text-white font-bold"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}