import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  Download,
  Zap,
  ChevronLeft,
  Activity,
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { CityPack } from '@/types/cityPack';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { getCleanSlug } from '@/utils/slug';
import { isGuideOfflineAvailable } from '@/utils/cityPackIdb';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import SyncButton from '../components/SyncButton';
import FacilityKit from '@/components/FacilityKit';

// --- PERSISTENCE UTILS ---

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
}

// --- UI SUB-COMPONENTS ---

function HighAlertSkeleton() {
  return (
    <div className="w-full h-[140px] rounded-2xl bg-slate-200/50 animate-pulse border border-slate-200/60" />
  );
}

function HighAlertBanner({
  visaStatus,
  isLive,
}: {
  visaStatus?: string;
  isLive: boolean;
}) {
  if (!visaStatus) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-200/80 bg-amber-100 shadow-sm overflow-hidden"
    >
      <div className="p-4 flex gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-amber-700 text-[10px] font-bold">!</span>
        </div>
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
    </motion.div>
  );
}

function getEmergencyGridItems(emergency: Record<string, string | undefined>) {
  const order = ['police', 'medical', 'ambulance', 'tourist_police', 'emergency_all'] as const;
  const labels: Record<string, string> = {
    police: 'Police', medical: 'Medical', ambulance: 'Ambulance',
    tourist_police: 'Tourist Police', emergency_all: 'Emergency',
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

// --- ANIMATION VARIANTS ---

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const CURRENCY_PROTOCOL: Record<string, { rate: string }> = {
  TH: { rate: '31.13' }, JP: { rate: '150.40' }, AE: { rate: '3.67' },
  GB: { rate: '0.87' }, FR: { rate: '0.94' }, IT: { rate: '0.94' },
  ES: { rate: '0.94' }, DE: { rate: '0.94' }, MX: { rate: '17.05' }, US: { rate: '1.00' },
};

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();
  
  const {
    cityData,
    isLoading: packLoading,
    isOffline,
    syncStatus,
    error,
    refetch,
  } = useCityPack(cleanSlug ?? undefined);
  
  const { installPWA, isInstalled, showMobileOverlay, dismissMobileOverlay } = usePWAInstall(
    cleanSlug ?? ''
  );

  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`sync_${cleanSlug}`) : null
  );

  // Identity Swap Logic
  useEffect(() => {
    if (!cleanSlug) return;
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = `/api/manifest?slug=${cleanSlug}&v=${Date.now()}`;
    document.head.appendChild(link);
    localStorage.setItem('pwa_last_pack', `/guide/${cleanSlug}`);
  }, [cleanSlug]);

  // SW Rotation Logic
  useEffect(() => {
    if (!cleanSlug || !('serviceWorker' in navigator)) return;
    const rotate = async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      await navigator.serviceWorker.register('/sw.js');
    };
    rotate();
  }, [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug) return;
    isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
  }, [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug || !cityData) return;
    saveCityToIndexedDB(cleanSlug, cityData).catch(() => {});
  }, [cleanSlug, cityData]);

  useEffect(() => {
    if (!cityData?.countryCode || isOffline) {
      setIsApiLoading(false);
      return;
    }
    setIsApiLoading(true);
    fetchVisaCheck('US', cityData.countryCode)
      .then(d => { if (d) setVisaData(d); })
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]);

  const handleSync = async () => {
    await refetch();
    setLastSynced(new Date().toISOString());
  };

  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center items-center">
       <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto">
        <span className="text-rose-500 font-bold">!</span>
      </div>
      <p className="font-bold mb-4">{error.message}</p>
      <button onClick={() => navigate(-1)} className="bg-black text-white px-6 py-2 rounded-full">Back</button>
    </div>
  );

  return (
    <motion.div 
      key={cleanSlug}
      initial="hidden" animate="visible" exit="exit" variants={containerVariants}
      className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40"
    >
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />

      <div onClick={() => setIsDiagnosticsOpen(true)} className="px-6 py-2 text-[9px] font-black flex justify-between bg-[#222222] text-white uppercase sticky top-0 z-50 cursor-pointer">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-500' : 'bg-emerald-500'}`} />
          {isOffline ? 'Offline Mode' : 'Live Mode'}
          {offlineAvailable && <span>· Saved</span>}
        </div>
        <Activity size={10} />
      </div>

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto flex justify-between items-start">
        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-4xl font-black italic uppercase leading-none">{cityData.name}</h1>
          
          {/* Use lastSynced here to resolve TS6133 */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            {lastSynced 
              ? `Last Intel Sync: ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Sync required for live data'}
          </p>

          <div className="mt-4 flex items-center gap-4 justify-end">
            <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
            <motion.button 
              variants={itemVariants} 
              onClick={() => setIsDiagnosticsOpen(true)} 
              className="p-2 bg-emerald-50 rounded-full text-emerald-600"
            >
              <Zap size={14} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Protocol</h2>
          <AnimatePresence mode="wait">
            {isApiLoading ? <HighAlertSkeleton /> : (
              <HighAlertBanner isLive={!!visaData} visaStatus={visaData?.visa_rules?.primary_rule?.name} />
            )}
          </AnimatePresence>
          <div className="grid grid-cols-2 gap-4">
            {getEmergencyGridItems(cityData.emergency).map(item => (
              <div key={item.key} className="bg-black text-white p-6 rounded-3xl flex flex-col items-center">
                <Phone size={18} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black uppercase text-[#FFDD00]">{item.label}</span>
                <span className="text-xl font-bold">{item.number}</span>
              </div>
            ))}
          </div>
        </section>

        {cityData.facility_intel && <FacilityKit data={cityData.facility_intel} />}

        <section className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Exchange Rate</p>
          <div className="text-3xl font-black">1 USD = {visaData?.destination?.exchange || CURRENCY_PROTOCOL[cityData.countryCode]?.rate || '---'}</div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={installPWA}
            disabled={isInstalled}
            className={`w-full h-16 rounded-3xl shadow-xl flex items-center justify-between px-8 transition-all ${isInstalled ? 'bg-slate-100 text-slate-400' : 'bg-black text-white active:scale-95'}`}
          >
            <div className="flex items-center gap-4">
              <Download size={20} />
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-black uppercase">{isInstalled ? 'Installed' : 'Download Pack'}</span>
                <span className="text-[8px] font-bold text-slate-500">{cityData.name} Offline</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMobileOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/70 flex items-end p-6" onClick={dismissMobileOverlay}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-3xl p-8 w-full">
              <p className="font-bold text-center mb-4">Add to Home Screen</p>
              <ol className="text-sm space-y-2 mb-6 list-decimal list-inside text-slate-600">
                <li>Tap Share</li>
                <li>Tap "Add to Home Screen"</li>
              </ol>
              <button onClick={dismissMobileOverlay} className="w-full py-3 rounded-full bg-black text-white font-bold">Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}