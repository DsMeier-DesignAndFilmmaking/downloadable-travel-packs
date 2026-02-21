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
  X,
  Droplets,
  Globe,
  Navigation,
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { CityPack } from '@/types/cityPack';
import { useCityPack } from '@/hooks/useCityPack';
import { getCleanSlug } from '@/utils/slug';
import { isGuideOfflineAvailable } from '@/utils/cityPackIdb';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DebugBanner from '@/components/DebugBanner';
import SourceInfo from '@/components/SourceInfo';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import SyncButton from '../components/SyncButton';
import FacilityKit from '@/components/FacilityKit';
import { updateThemeColor } from '@/utils/manifest-generator';

import { usePostHog } from '@posthog/react';

// ---------------------------------------------------------------------------
// IndexedDB: persist city pack after load
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

// ---------------------------------------------------------------------------
// Components & Helpers
// ---------------------------------------------------------------------------

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, filter: "blur(10px)", position: "fixed", top: 0, left: 0, right: 0, transition: { duration: 0.3, ease: "easeInOut" } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function AgenticSystemTrigger({ onClick }: { onClick: () => void; }) {
  return (
    <motion.button variants={itemVariants} onClick={onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all active:scale-95 focus:outline-none">
      <Zap size={14} />
      <span>Live Intelligence</span>
      <Activity size={14} className="opacity-60" />
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Updated OfflineAccessModal (Receives data via props)
// ---------------------------------------------------------------------------

function OfflineAccessModal({ 
  isOpen, 
  onClose, 
  cityData, 
  cleanSlug 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  cityData: CityPack; 
  cleanSlug: string | undefined;
}) {
  const [showWhyRequired, setShowWhyRequired] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    if (!isOpen) setShowWhyRequired(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full overflow-y-auto">
        <div className="min-h-full px-4 py-6">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <h2 className="text-sm font-black uppercase tracking-wide text-[#222222]">Add This Pack to Your Device</h2>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors active:scale-95"
                aria-label="Close offline instructions"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 text-[14px] text-slate-700">
              <div className="space-y-2">
                <p className="text-sm leading-relaxed text-slate-600">
                  Do these steps once, so you can easily access this pack from your device home screen <strong>100% OFFLINE</strong>.
                </p>
              </div>

              <ol className="space-y-3">
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">1</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Open Share Menu</p>
                      <p className="mt-1 leading-relaxed">Tap the <strong>Share icon</strong> (or more or three ...) in your browser address bar.</p>
                    </div>
                  </div>
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">2</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Add To Home Screen</p>
                      <p className="mt-1 leading-relaxed">Find and tap <strong>"Add to Home Screen."</strong></p>
                    </div>
                  </div>
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">3</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Launch Once Online</p>
                      <p className="mt-1 leading-relaxed">Open this city <strong>from the home screen icon</strong> while still online.</p>
                    </div>
                  </div>
                </li>
              </ol>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">Critical</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900">
                  The first home-screen launch finalizes offline setup. After this, the city pack can open without internet.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">If It Fails</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  If that first home-screen launch happens offline, the city pack may not load correctly. Go back online to relaunch the pack from your home screen icon.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWhyRequired((v) => !v)}
                  className="text-xs font-black uppercase tracking-wider text-slate-500 underline underline-offset-2"
                >
                  Why is this required?
                </button>
                {showWhyRequired && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Local device storage for web apps need to be opened once from the home screen to complete offline setup.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  posthog?.capture('pwa_instructions_acknowledged', {
                    city: cityData?.name,
                    slug: cleanSlug,
                    network_status: navigator.onLine ? 'online' : 'offline',
                  });
                  onClose();
                }}
                className="h-12 w-full rounded-2xl bg-[#222222] text-[11px] font-black uppercase tracking-[0.18em] text-white active:scale-[0.98] transition-transform"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CURRENCY_PROTOCOL: Record<string, { code: string; rate: string }> = {
  TH: { code: 'THB', rate: '31.13' }, JP: { code: 'JPY', rate: '150.40' }, AE: { code: 'AED', rate: '3.67' }, GB: { code: 'GBP', rate: '0.87' }, FR: { code: 'EUR', rate: '0.94' }, IT: { code: 'EUR', rate: '0.94' }, ES: { code: 'EUR', rate: '0.94' }, DE: { code: 'EUR', rate: '0.94' }, MX: { code: 'MXN', rate: '17.05' }, US: { code: 'USD', rate: '1.00' },
};

const DEFAULT_PASSPORT = 'US';
const STANDALONE_FIRST_LAUNCH_KEY = 'travelpacks-standalone-first-launch';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();
  const posthog = usePostHog();
  
  const {
    cityData,
    isLoading: packLoading,
    isOffline,
    isLocalData,
    syncStatus,
    error,
    refetch,
  } = useCityPack(cleanSlug ?? undefined);

  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);
  const [isOfflineHelpOpen, setIsOfflineHelpOpen] = useState(false);
  const [showStandaloneBanner, setShowStandaloneBanner] = useState(false);
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>(() => new Date().toISOString());

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true);

  const isMobileDevice =
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 768px)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
      ));

  const showBackButton = !isStandalone || (!isMobileDevice && isLocalData);

  const isOnline = !isOffline;
  const modeStatusLabel = isOnline ? 'Online Mode Active' : 'Offline Mode Active';
  const isOfflineAvailable = useMemo(
    () => Boolean(cityData && (isOffline || isLocalData)),
    [cityData, isOffline, isLocalData]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !isStandalone) return;
    if (localStorage.getItem(STANDALONE_FIRST_LAUNCH_KEY)) return;

    localStorage.setItem(STANDALONE_FIRST_LAUNCH_KEY, '1');
    setShowStandaloneBanner(true);

    const timeoutId = window.setTimeout(() => {
      setShowStandaloneBanner(false);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isStandalone]);

  useEffect(() => {
    // Check if cityData exists before trying to access .name
    if (cityData?.name) {
      posthog.capture('city_pack_opened', {
        city: cityData.name, // Changed from cityName to cityData.name
        is_online: navigator.onLine,
        slug: cleanSlug
      });
    }
  }, [cityData?.name, posthog, cleanSlug]); // Added dependencies for safety

  /** Document title and theme for city page. */
/** Document title, theme, and Analytics for city page. */
  useEffect(() => {
    if (!cleanSlug || !cityData) return;
    
    const cityName = cityData.name; // Now cityName is defined here
    document.title = `${cityName} Pack`;
    
    // Track page open
    posthog.capture('city_pack_opened', {
      city: cityName,
      is_online: navigator.onLine,
      slug: cleanSlug
    });

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', cityName);
    
    updateThemeColor('#0f172a');
    localStorage.setItem('pwa_last_pack', `/guide/${cleanSlug}`);
  }, [cleanSlug, cityData, posthog]);

  /**
   * 3. PERSISTENCE & OFFLINE SIGNALING
   */
  useEffect(() => {
    if (!cleanSlug) return;
    isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
  }, [cleanSlug]);

  useEffect(() => {
    // Always show a fresh "Updated" timestamp when a city page loads.
    setLastSynced(new Date().toISOString());
  }, [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug || !cityData || isOffline) return;
    saveCityToIndexedDB(cleanSlug, cityData)
      .then(() => setOfflineAvailable(true))
      .catch((err) => console.warn('💾 IDB Write Failed:', err));
  }, [cleanSlug, cityData, isOffline]);

  /**
   * 4. VISA & EXCHANGE PROTOCOLS
   */
  useEffect(() => {
    if (!cityData?.countryCode) return;
    setVisaData(null);
    if (isOffline) {
      setIsApiLoading(false);
      return;
    }
    setIsApiLoading(true);
    fetchVisaCheck(DEFAULT_PASSPORT, cityData.countryCode)
      .then((data) => { if (data) setVisaData(data); })
      .catch(err => console.error("Visa Protocol Failed:", err))
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]);

  const handleSync = async () => {
    try {
      await refetch();
      const now = new Date().toISOString();
      setLastSynced(now);
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
       <p className="mt-4 text-slate-400 font-black tracking-widest uppercase text-xs animate-pulse">[ Accessing Field Intel... ]</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error.message}</p>
      <button onClick={() => navigate(-1)} className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform">Back to Catalog</button>
    </div>
  );

  return (
    <motion.div key={cleanSlug} initial="hidden" animate="visible" exit="exit" variants={containerVariants} className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40 w-full overflow-x-hidden">
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      
      {/* Fixed Modal Call with passed Props */}
      <OfflineAccessModal 
        isOpen={isOfflineHelpOpen} 
        onClose={() => setIsOfflineHelpOpen(false)} 
        cityData={cityData}
        cleanSlug={cleanSlug}
      />

      {showStandaloneBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[190] w-full max-w-md px-4 pointer-events-none">
          <div className="mx-auto rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2 text-[11px] font-black text-[#222222] tracking-wide shadow-lg backdrop-blur-sm">
            Opening from home screen. Finalizing offline setup...
          </div>
        </div>
      )}
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-center items-center tracking-[0.2em] uppercase fixed top-0 left-0 right-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${
          !isOnline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-center">
          <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
          {modeStatusLabel}
          {(offlineAvailable || isOfflineAvailable) && <span className="opacity-80"> · Available offline</span>}
        </div>
      </div>

      <header className="px-6 pt-14 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="back-button-nav p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="text-right flex flex-col items-end">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none cursor-pointer italic" onClick={() => { setDebugTapCount(p => p + 1); if (debugTapCount >= 4) { setShowDebug(true); setDebugTapCount(0); } }}>
              {cityData.name}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium max-w-[240px] ml-auto leading-relaxed">{cityData.theme}</p>
            <div className="mt-6 flex items-center gap-4 flex-wrap justify-end">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase leading-none">Local Intel</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                  {isOffline ? 'Viewing Offline' : `Updated ${new Date(lastSynced).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
              <AgenticSystemTrigger onClick={() => setIsDiagnosticsOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
    <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
      Survival Dashboard
    </h2>
    <SourceInfo 
      source="Global Intelligence Protocol" 
      lastUpdated={lastSynced} 
    />
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

        {cityData.transit_logic && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Transit & Transportation</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-6"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Navigation size={20} /></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access & Fare Strategy</p></div>
              <p className="text-[15px] font-medium text-[#222222] leading-relaxed">{cityData.transit_logic.payment_method}</p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Primary Apps</span></div>
                <span className="text-xs font-black text-blue-600 uppercase italic text-right max-w-[180px]">{cityData.transit_logic.primary_app}</span>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Etiquette</p><p className="text-[13px] font-bold text-slate-600 italic">"{cityData.transit_logic.etiquette}"</p></div>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Basic Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]"><Droplets className="text-blue-600 mb-4" size={32} /><h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Tap Water</h3><p className="text-2xl font-bold text-[#1a1a1a] leading-tight">{cityData.survival?.tapWater || "Check Local Intel"}</p></div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]"><Zap className="text-[#d4b900] mb-4" size={32} fill="#d4b900" /><h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Power System</h3><p className="text-2xl font-bold text-[#1a1a1a] leading-tight">{typeof cityData.survival?.power === 'object' ? `${cityData.survival.power.type} (${cityData.survival.power.voltage})` : cityData.survival?.power}</p></div>
          </div>
          {cityData.facility_intel && <FacilityKit data={cityData.facility_intel} />}
        </section>

        <section className="space-y-4">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Spending Shield</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2"><Globe size={14} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exchange Rate</p></div>
            <div className="text-3xl font-black text-[#222222] tabular-nums">1 USD = {visaData?.destination?.exchange || CURRENCY_PROTOCOL[cityData.countryCode]?.rate || '---'}</div>
            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200/50 text-[14px] font-bold text-amber-900 leading-snug">{cityData.survival?.tipping || "Standard 10% is expected."}</div>
          </div>
        </section>
      </main>

      {!isStandalone && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
          <div 
            className="absolute inset-0 bg-[#F7F7F7]/60 backdrop-blur-xl border-t border-slate-200/50" 
            style={{ maskImage: 'linear-gradient(to top, black 80%, transparent)' }} 
          />
          
          <div className="relative p-6 pb-10 max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => {
                posthog?.capture('pwa_install_instructions_viewed', {
                  city: cityData?.name,
                  slug: cleanSlug,
                  network_status: isOnline ? 'online' : 'offline',
                  device_type: isMobileDevice ? 'mobile' : 'desktop'
                });
                setIsOfflineHelpOpen(true);
              }}
              className="w-full h-16 rounded-[2rem] shadow-2xl flex items-center justify-between px-8 active:scale-[0.97] transition-all border bg-[#222222] text-white border-black group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl transition-colors bg-white/10 text-white group-hover:bg-emerald-500/20 group-hover:text-emerald-400">
                  <Download size={20} strokeWidth={3} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add to Your Device</span>
                  <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Setup offline access</span>
                </div>
              </div>
              <div className={`h-1.5 w-1.5 rounded-full transition-colors ${offlineAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
