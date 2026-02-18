import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  AlertTriangle,
  Download,
  Zap,
  ChevronLeft,
  ArrowUpFromLine,
  Plane,
  Info,
  Activity,
  Check,
  Droplets,
  Globe,
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
import { generateCityGuideManifest, injectManifest, updateThemeColor } from '@/utils/manifest-generator';

// --- IndexedDB Utils ---
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
  store.put({ slug, pack: cityData, data: cityData, lastUpdated: Date.now() });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Helpers ---
function getEmergencyGridItems(emergency: Record<string, string | undefined>) {
  const order = ['police', 'medical', 'ambulance', 'tourist_police', 'emergency_all', 'general_eu', 'non_emergency'] as const;
  const labels: Record<string, string> = { police: 'Police', medical: 'Medical', ambulance: 'Ambulance', tourist_police: 'Tourist Police', emergency_all: 'Emergency', general_eu: 'EU 112', non_emergency: 'Non-Emergency' };
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

// --- Components ---
function HighAlertSkeleton() {
  return <div className="w-full h-[140px] rounded-2xl bg-slate-200/50 animate-pulse border border-slate-200/60" />;
}

function HighAlertBanner({ digitalEntry, touristTax, visaStatus, isLive }: { digitalEntry?: string; touristTax?: string; visaStatus?: string; isLive: boolean; }) {
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
                {!isLive && <span className="block mt-1 text-[9px] font-black text-amber-700/60 uppercase tracking-tighter">// Live Sync Paused - Using Cached Protocol</span>}
              </p>
            </div>
          </div>
        )}
        {(hasEntry || hasTax) && (
          <div className="flex gap-3 border-t border-amber-200/50 pt-3 mt-1">
             <div className="space-y-3">
                {hasEntry && <p className="text-[#222222] text-sm font-medium leading-relaxed">{digitalEntry}</p>}
                {hasTax && <p className="text-[#222222] text-sm font-medium leading-relaxed">{touristTax}</p>}
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

const CURRENCY_PROTOCOL: Record<string, { code: string; rate: string }> = {
  TH: { code: 'THB', rate: '31.13' }, JP: { code: 'JPY', rate: '150.40' }, AE: { code: 'AED', rate: '3.67' }, GB: { code: 'GBP', rate: '0.87' }, FR: { code: 'EUR', rate: '0.94' }, IT: { code: 'EUR', rate: '0.94' }, ES: { code: 'EUR', rate: '0.94' }, DE: { code: 'EUR', rate: '0.94' }, MX: { code: 'MXN', rate: '17.05' }, US: { code: 'USD', rate: '1.00' },
};

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();

  const { cityData, isLoading: packLoading, isOffline, isLocalData, syncStatus, error, refetch } = useCityPack(cleanSlug ?? undefined);
  const { installPWA, isInstalled, showMobileOverlay, dismissMobileOverlay } = usePWAInstall(cleanSlug ?? '');

  // --- Logic State ---
  const isOnline = !isOffline;
  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');
  const [isSwControlling, setIsSwControlling] = useState<boolean>(() =>
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? !!navigator.serviceWorker.controller : false
  );
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // --- Handlers ---
  const handleSync = async () => {
    try {
      await refetch();
      const now = new Date().toISOString();
      setLastSynced(now);
      localStorage.setItem(`sync_${cleanSlug}_time`, now);
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  async function handleOfflineSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !cleanSlug || !cityData) {
      setOfflineSyncStatus('error');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const sw = registration.active;
    if (!sw) {
      setOfflineSyncStatus('error');
      return;
    }
    setOfflineSyncStatus('syncing');
    sw.postMessage({ type: 'START_CITY_SYNC', slug: cleanSlug });
  }

  // --- Effects ---
  useEffect(() => {
    if (!cleanSlug) return;
    isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
    const isThisCitySynced = localStorage.getItem(`sync_${cleanSlug}`) === 'true';
    setOfflineSyncStatus(isThisCitySynced ? 'complete' : 'idle');
    setLastSynced(localStorage.getItem(`sync_${cleanSlug}_time`));
  }, [cleanSlug]);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !cleanSlug || !cityData) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE' && event.data.slug === cleanSlug) {
        setOfflineSyncStatus('complete');
        localStorage.setItem(`sync_${cleanSlug}`, 'true');
        localStorage.setItem(`sync_${cleanSlug}_time`, new Date().toISOString());
        injectManifest(generateCityGuideManifest(cleanSlug, cityData.name));
        setOfflineAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [cleanSlug, cityData]);

  useEffect(() => {
    if (!cleanSlug || !cityData) return;
    const onControllerChange = () => setIsSwControlling(!!navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    if (offlineSyncStatus === 'complete') {
      injectManifest(generateCityGuideManifest(cleanSlug, cityData.name));
      updateThemeColor('#0f172a');
    }
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, [cleanSlug, cityData, offlineSyncStatus]);

  useEffect(() => {
    if (!cityData?.countryCode || isOffline) {
        setIsApiLoading(false);
        return;
    }
    setIsApiLoading(true);
    fetchVisaCheck('US', cityData.countryCode)
      .then(setVisaData)
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]);

  useEffect(() => {
    if (!cleanSlug || !cityData || isOffline) return;
    saveCityToIndexedDB(cleanSlug, cityData)
      .then(() => setOfflineAvailable(true))
      .catch((err) => console.warn('💾 IDB Write Failed:', err));
  }, [cleanSlug, cityData, isOffline]);

  // --- Render Logic ---
  if (error) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error.message}</p>
      <button onClick={() => navigate(-1)} className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold">Back</button>
    </div>
  );

  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div key={cleanSlug} initial="hidden" animate="visible" exit="exit" variants={containerVariants} className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-48 w-full overflow-x-hidden">
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 transition-colors cursor-pointer ${
          !isOnline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500'}`} />
          {!isOnline ? 'Offline Mode Active' : 'Live System Healthy'}
          {(offlineAvailable || isLocalData) && <span className="opacity-80"> · Offline Ready</span>}
        </div>
        <div className="flex items-center gap-2 opacity-60"><Activity size={10} /><span>Diagnostics</span></div>
      </div>

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start">
          <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-4xl font-black italic uppercase leading-none" onClick={() => { setDebugTapCount(c => c + 1); if(debugTapCount > 4) setShowDebug(true); }}>
              {cityData.name}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">{cityData.theme}</p>
            <div className="mt-4 flex items-center justify-end gap-3">
               <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Survival Dashboard</h2>
            <SourceInfo source="Intelligence Protocol" lastUpdated={lastSynced || cityData.last_updated} />
          </div>
          
          <AnimatePresence mode="wait">
            {isApiLoading ? <HighAlertSkeleton /> : (
              <HighAlertBanner
                digitalEntry={cityData.survival?.digitalEntry}
                touristTax={cityData.survival?.touristTax}
                isLive={!!visaData}
                visaStatus={visaData?.visa_rules?.primary_rule 
                  ? `${visaData.visa_rules.primary_rule.name} - ${visaData.visa_rules.primary_rule.duration || 'N/A'}`
                  : "Standard Protocol applies."}
              />
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
             {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-[2rem] shadow-lg">
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
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Arrival Hack</span>
              </div>
              <div className="p-8 text-[#222222] font-medium leading-relaxed text-[15px]">{cityData.arrival.airportHack}</div>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Basic Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[160px]">
              <Droplets className="text-blue-600 mb-4" size={32} />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Tap Water</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">{cityData.survival?.tapWater || "Check Intel"}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[160px]">
              <Zap className="text-[#d4b900] mb-4" size={32} fill="#d4b900" />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Power</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {typeof cityData.survival?.power === 'object' ? `${cityData.survival.power.type}` : cityData.survival?.power}
              </p>
            </div>
          </div>
          {cityData.facility_intel && <FacilityKit data={cityData.facility_intel} />}
        </section>

        <section className="space-y-4">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Spending</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Globe size={14} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Exchange</p></div>
            <div className="text-3xl font-black text-[#222222] tabular-nums">1 USD = {visaData?.destination?.exchange || CURRENCY_PROTOCOL[cityData.countryCode]?.rate || '---'}</div>
            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200/50 text-[14px] font-bold text-amber-900 leading-snug">{cityData.survival?.tipping}</div>
          </div>
        </section>
      </main>

      {/* DYNAMIC ATOMIC ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-[#F7F7F7]/80 backdrop-blur-xl border-t border-slate-200/50" />
        <div className="relative p-6 pb-10 max-w-md mx-auto pointer-events-auto">
          <button
            onClick={() => (offlineSyncStatus === 'complete' ? installPWA() : handleOfflineSync())}
            disabled={isInstalled || offlineSyncStatus === 'syncing' || !isSwControlling}
            className={`w-full h-16 rounded-[2rem] shadow-2xl flex items-center justify-between px-8 transition-all border ${
              !isSwControlling || offlineSyncStatus === 'syncing'
                ? 'bg-slate-50 text-slate-400 border-slate-200'
                : isInstalled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : offlineSyncStatus === 'complete'
                    ? 'bg-[#FFDD00] text-black border-[#E6C600] scale-[1.02]'
                    : 'bg-[#222222] text-white border-black'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${
                isInstalled ? 'bg-emerald-200 text-emerald-800' : 
                offlineSyncStatus === 'complete' ? 'bg-black text-[#FFDD00]' : 'bg-white/10'
              }`}>
                {offlineSyncStatus === 'syncing' ? <Activity size={20} className="animate-spin" /> :
                 isInstalled ? <Check size={20} strokeWidth={3} /> :
                 offlineSyncStatus === 'complete' ? <ArrowUpFromLine size={20} strokeWidth={3} /> :
                 <Download size={20} strokeWidth={3} />}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  {offlineSyncStatus === 'syncing' ? 'Securing Assets...' :
                   isInstalled ? 'Pack Installed' :
                   offlineSyncStatus === 'complete' ? 'Add to Home Screen' : 'Download Pack'}
                </span>
                <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest">
                  {offlineSyncStatus === 'syncing' ? 'Writing to local disk...' :
                   isInstalled ? 'Offline access enabled' :
                   offlineSyncStatus === 'complete' ? 'Setup Complete · Launch Offline' : `Sync ${cityData.name} Intel`}
                </span>
              </div>
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${
              offlineSyncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
              isInstalled ? 'bg-emerald-500' : 'bg-slate-400'
            }`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMobileOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/70 flex items-end p-6" onClick={dismissMobileOverlay}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-sm mx-auto shadow-2xl">
               <h3 className="font-black uppercase tracking-widest text-sm mb-4">Final Step</h3>
               <p className="text-slate-600 text-sm leading-relaxed mb-6">
                 Tap the <strong>Share</strong> button and select <strong>"Add to Home Screen"</strong> to enable the offline survival guide.
               </p>
               <button onClick={dismissMobileOverlay} className="w-full py-4 bg-[#222222] text-white font-black rounded-2xl uppercase tracking-widest text-xs">Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}