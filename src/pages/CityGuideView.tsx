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

// --- DATABASE UTILS ---
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

// --- UI COMPONENTS ---
function HighAlertSkeleton() {
  return <div className="w-full h-[140px] rounded-2xl bg-slate-200/50 animate-pulse border border-slate-200/60" />;
}

function HighAlertBanner({ digitalEntry, touristTax, visaStatus, isLive }: {
  digitalEntry?: string; touristTax?: string; visaStatus?: string; isLive: boolean;
}) {
  const hasEntry = Boolean(digitalEntry?.trim());
  const hasTax = Boolean(touristTax?.trim());
  const hasVisaStatus = Boolean(visaStatus?.trim());
  if (!hasEntry && !hasTax && !hasVisaStatus) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200/80 bg-amber-100 shadow-sm overflow-hidden">
      <div className="p-4 space-y-4">
        {hasVisaStatus && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Entry status</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">
                {visaStatus}
                {!isLive && <span className="block mt-1 text-[9px] font-black text-amber-700/60 uppercase tracking-tighter">// Offline Protocol</span>}
              </p>
            </div>
          </div>
        )}
        {hasEntry && (
          <div className="flex gap-3">
            <Info size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Entry / visa</p>
              <p className="text-[#222222] text-sm font-medium leading-relaxed">{digitalEntry}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();

  const { cityData, isLoading: packLoading, isOffline, isLocalData, syncStatus, error, refetch } = useCityPack(cleanSlug ?? undefined);
  const { installPWA, isInstalled, showMobileOverlay, dismissMobileOverlay } = usePWAInstall(cleanSlug ?? '');

  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`sync_${cleanSlug}`) : null
  );

  // --- PWA LOGIC BLOCK 1: IDENTITY ---
  useEffect(() => {
    if (!cleanSlug) return;
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.crossOrigin = 'use-credentials';
    link.href = `/api/manifest?slug=${cleanSlug}&v=${Date.now()}`;
    document.head.appendChild(link);
    localStorage.setItem('pwa_last_pack', `/guide/${cleanSlug}`);
    console.log(`🎯 Identity Swap: ${cleanSlug}`);
  }, [cleanSlug]);

  // --- PWA LOGIC BLOCK 2: SOFT RESET (The Fix) ---
  useEffect(() => {
    if (!cleanSlug || !('serviceWorker' in navigator)) return;

    const rotateEngine = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        // Re-register global worker to ensure clean state for new city identity
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log(`♻️ Engine Rotated: Fresh state for ${cleanSlug}`);
      } catch (e) {
        console.warn("Soft Reset failed", e);
      }
    };
    rotateEngine();
  }, [cleanSlug]);

  // --- PWA LOGIC BLOCK 3: CACHING ---
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !cleanSlug || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CITY', citySlug: cleanSlug });
    console.log(`📡 SW Signaling: Caching intel for ${cleanSlug}`);
  }, [cleanSlug, cityData]);

  // --- DATA SYNC & IDB ---
  useEffect(() => {
    if (!cleanSlug) return;
    isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
  }, [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug || !cityData) return;
    saveCityToIndexedDB(cleanSlug, cityData);
  }, [cleanSlug, cityData]);

  useEffect(() => {
    if (!cityData?.countryCode || isOffline) {
      setIsApiLoading(false);
      return;
    }
    setIsApiLoading(true);
    fetchVisaCheck('US', cityData.countryCode)
      .then(data => data && setVisaData(data))
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]);

  const handleSync = async () => {
    await refetch();
    setLastSynced(new Date().toISOString());
  };

  if (packLoading || !cityData) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-4 text-slate-400 font-black tracking-widest uppercase text-xs animate-pulse">[ Accessing Field Intel... ]</p>
      </div>
    );
  }

  return (
    <motion.div key={cleanSlug} initial="hidden" animate="visible" exit="exit" variants={containerVariants} className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40 w-full overflow-x-hidden">
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      
      {/* STATUS BAR */}
      <div onClick={() => setIsDiagnosticsOpen(true)} className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${!isOffline ? 'bg-[#222222] text-white' : 'bg-orange-50 text-orange-700'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${!isOffline ? 'bg-emerald-500' : 'bg-orange-600 animate-pulse'}`} />
          {!isOffline ? 'Live Feed Active' : 'Offline Mode Active'}
          {(offlineAvailable) && <span className="opacity-80"> · Available offline</span>}
        </div>
        <Activity size={10} className="opacity-60" />
      </div>

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform"><ChevronLeft size={20} /></button>
          <div className="text-right flex flex-col items-end">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none italic cursor-pointer" onClick={() => { setDebugTapCount(p => p + 1); if (debugTapCount >= 4) setShowDebug(true); }}>{cityData.name}</h1>
            <p className="text-sm text-slate-600 mt-2 font-medium max-w-[240px] leading-relaxed">{cityData.theme}</p>
            <div className="mt-6 flex items-center gap-4 flex-wrap justify-end">
              <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
              <button onClick={() => setIsDiagnosticsOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold active:scale-95 transition-all"><Zap size={14} /><span>Live Intelligence</span></button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {/* SURVIVAL */}
        <section className="space-y-6">
          <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Survival Dashboard</h2>
          <AnimatePresence mode="wait">
            {isApiLoading ? <HighAlertSkeleton /> : (
              <HighAlertBanner 
                digitalEntry={cityData.survival?.digitalEntry} 
                touristTax={cityData.survival?.touristTax} 
                isLive={!!visaData} 
                visaStatus={visaData?.visa_rules?.primary_rule?.name} 
              />
            )}
          </AnimatePresence>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(cityData.emergency).slice(0, 4).map(([key, val]) => val && (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-[2rem] shadow-lg">
                <Phone size={22} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">{key}</span>
                <span className="text-xl font-bold mt-1 tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TRANSIT */}
        {cityData.transit_logic && (
          <section className="space-y-4">
            <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Transit Strategy</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <p className="text-[15px] font-medium text-[#222222] leading-relaxed mb-6">{cityData.transit_logic.payment_method}</p>
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Primary App</span>
                <span className="text-xs font-black text-blue-600 uppercase italic">{cityData.transit_logic.primary_app}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FIXED DOWNLOAD BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-[#F7F7F7]/60 backdrop-blur-xl border-t border-slate-200/50" style={{ maskImage: 'linear-gradient(to top, black 80%, transparent)' }} />
        <div className="relative p-6 pb-10 max-w-md mx-auto pointer-events-auto">
          <button onClick={installPWA} disabled={isInstalled} className={`w-full h-16 rounded-[2rem] shadow-2xl flex items-center justify-between px-8 transition-all ${isInstalled ? 'bg-slate-100 text-slate-400' : 'bg-[#222222] text-white active:scale-[0.97]'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${isInstalled ? 'bg-slate-200' : 'bg-[#FFDD00] text-black'}`}><Download size={20} strokeWidth={3} /></div>
              <div className="flex flex-col items-start text-left">
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">{isInstalled ? 'Pack Installed' : 'Download Pack'}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{isInstalled ? 'Available Offline' : `Store ${cityData.name} Offline`}</span>
              </div>
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${isInstalled ? 'bg-blue-400' : 'bg-emerald-500 animate-pulse'}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMobileOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/70 flex items-end justify-center p-6 pb-24" onClick={dismissMobileOverlay}>
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={e => e.stopPropagation()} className="bg-[#F7F7F7] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <p className="text-[#222222] font-bold text-center mb-4">Add to Home Screen</p>
              <ol className="text-slate-600 text-sm space-y-3 mb-6 list-decimal list-inside">
                <li>Tap the Share icon</li>
                <li>Tap &quot;Add to Home Screen&quot;</li>
              </ol>
              <button onClick={dismissMobileOverlay} className="w-full py-3 rounded-full bg-[#222222] text-white font-bold">Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}