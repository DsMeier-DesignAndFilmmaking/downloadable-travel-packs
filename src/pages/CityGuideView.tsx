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
  Globe 
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MANIFEST_URL } from '@/services/apiConfig';
import { fetchVisaCheck, type VisaCheckData } from '@/services/visaService';
import DebugBanner from '@/components/DebugBanner';

/** 1. Reserved Space Skeleton to prevent Layout Shifting */
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

export default function CityGuideView() {
  const { slug } = useParams<{ slug: string }>();
  const { cityData, isLoading, isOffline, error, refetch } = useCityPack(slug || '');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  
  const [isReady, setIsReady] = useState(false);
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isDomestic, setIsDomestic] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);

  useEffect(() => {
    if (!isLoading && cityData) setIsReady(true);
  }, [isLoading, cityData]);

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
  }, [cityData]);

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

  if (isLoading || !isReady) return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-2xl mx-auto px-6 pt-24 space-y-8 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    </div>
  );

  if (error || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error?.message || 'City Not Found'}</p>
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
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      {/* STATUS BANNER */}
      <div className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm ${isOffline ? 'bg-orange-50 text-orange-700' : 'bg-[#FFDD00] text-[#222222]'}`}>
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-600 animate-pulse' : 'bg-[#222222]'}`} />
          {isOffline ? 'Offline Mode Active' : 'Live Field Data'}
        </span>
        {!isOffline && <button onClick={() => refetch()} className="underline decoration-2 underline-offset-4">Refresh</button>}
      </div>

      {/* MANDATORY REGISTRATION */}
      {visaData?.mandatory_registration && (
        <div className={`sticky top-[38px] z-50 px-6 py-3 border-b border-slate-200/80 shadow-sm ${mandatoryRegistrationBg(visaData.mandatory_registration.color)} text-[#222222] flex flex-wrap items-center justify-between gap-2`}>
          <span className="text-xs font-bold">{visaData.mandatory_registration.text}</span>
          {visaData.mandatory_registration.link && (
            <a href={visaData.mandatory_registration.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-amber-800 underline">
              Register <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <motion.header variants={itemVariants} className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <Link to="/" className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-right">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none" onClick={() => {
              setDebugTapCount(prev => prev + 1);
              if (debugTapCount >= 4) { setShowDebug(true); setDebugTapCount(0); }
            }}>
              {cityData.name}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">{cityData.theme}</p>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-2">Guide Pack / {cityData.countryName}</p>
          </div>
        </div>
      </motion.header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {/* SURVIVAL DASHBOARD */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Survival Dashboard</h2>
          <div className="min-h-[140px]">
            <AnimatePresence mode="wait">
              {isApiLoading ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <HighAlertSkeleton />
                </motion.div>
              ) : isDomestic ? (
                <motion.div key="domestic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-center gap-4">
                  <Globe size={20} className="text-emerald-600" />
                  <p className="text-[#222222] text-sm font-bold">Domestic Pack Active: No visa or currency exchange required.</p>
                </motion.div>
              ) : (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <HighAlertBanner
                    digitalEntry={cityData.survival?.digitalEntry}
                    touristTax={cityData.survival?.touristTax}
                    visaStatus={visaData?.visa_rules?.primary_rule ? `${visaData.visa_rules.primary_rule.name} - ${visaData.visa_rules.primary_rule.duration || 'N/A'}` : undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isDomestic && visaData?.destination?.passport_validity && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
              <FileCheck size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Passport Warning</h3>
                <p className="text-[#222222] text-sm font-medium leading-relaxed">{visaData.destination.passport_validity}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-3xl shadow-lg select-all">
                <Phone size={22} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">{label}</span>
                <span className="text-xl font-bold mt-1 tracking-wide">{number}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* SCAM TICKER */}
        {cityData.survival?.currentScams?.length > 0 && (
          <motion.div variants={itemVariants} className="bg-[#222222] text-white rounded-2xl overflow-hidden border border-slate-800">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
              <AlertTriangle size={16} className="text-[#FFDD00] shrink-0" />
              <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">Live Scam Shield</span>
            </div>
            <div className="relative py-3 overflow-hidden">
              <div className="scam-ticker whitespace-nowrap flex gap-8 animate-marquee">
                {[...cityData.survival.currentScams, ...cityData.survival.currentScams].map((scam, i) => (
                  <span key={i} className="text-sm text-slate-300 font-medium">• {scam}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ARRIVAL LOGIC */}
        {cityData.arrival && (
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">First 60 Minutes</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <Plane size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Land & clear</span>
              </div>
              <div className="p-6">
                <p className="text-[#222222] font-medium leading-relaxed">{cityData.arrival.airportHack}</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <Wifi size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Connect</span>
              </div>
              <div className="p-6 pt-5 space-y-4">
                <p className="text-[#222222] font-medium leading-relaxed text-sm">{cityData.arrival.eSimAdvice}</p>
                {cityData.arrival.eSimHack && (
                  <p className="text-slate-600 text-sm italic border-l-2 border-[#FFDD00] pl-3">{cityData.arrival.eSimHack}</p>
                )}
              </div>
              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <Train size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Transit hack</span>
              </div>
              <div className="p-6 pt-5 text-sm font-medium text-[#222222]">{cityData.arrival.transitHack}</div>
              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <Smartphone size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Essential apps</span>
              </div>
              <div className="p-6 pt-5 flex flex-wrap gap-2">
                {cityData.arrival.essentialApps?.map((app, i) => (
                  <span key={i} className="bg-[#FFDD00] text-[#222222] px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">{app}</span>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* SURVIVAL BASICS GRID */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <Droplets className="text-blue-500 mb-4" size={24} />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap Water</h3>
              <p className="text-lg font-bold text-[#222222]">{cityData.survival?.tapWater}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <Zap className="text-[#FFDD00]" size={24} fill="#FFDD00" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Power Plug</h3>
              <p className="text-lg font-bold text-[#222222]">{typeof cityData.survival?.power === 'object' ? cityData.survival.power.type : 'Type C/F'}</p>
            </div>
            {!isDomestic && visaData?.destination?.exchange && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl" aria-hidden="true">💰</span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Exchange</h3>
                </div>
                <p className="text-lg font-bold text-[#222222]">
                  1 {visaData?.passport?.currency_code || 'USD'} = {visaData.destination.exchange} {visaData.destination.currency_code}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 italic">Last updated: {cityData.last_updated || '2026-02-10'}</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* SPENDING SHIELD BENTO */}
        {!isDomestic && visaData?.destination?.exchange && (
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Spending Shield</h2>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Live Rate</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Rate</p>
                <p className="text-3xl md:text-4xl font-black text-[#222222] tabular-nums leading-tight">
                  1 {visaData?.passport?.currency_code || 'USD'} = {visaData?.destination?.exchange} {visaData?.destination?.currency_code}
                </p>
                <div className="mt-4 w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Globe size={22} className="text-slate-400" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200/80 rounded-[2.5rem] p-6 flex flex-col justify-center">
                <div className="flex gap-2 mb-2">
                  <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">DCC Warning</span>
                </div>
                <p className="text-sm font-medium text-amber-900 leading-snug">
                  <span className="font-bold">Avoid ATM hidden fees:</span> When asked to charge in {visaData?.passport?.currency_code || 'USD'}, <span className="underline italic font-semibold">always decline</span> and choose {visaData?.destination?.currency_code}.
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* SECURITY PROTOCOL */}
        <motion.section variants={itemVariants} className="bg-[#222222] text-white rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="bg-white/10 px-8 py-4 border-b border-white/5 flex items-center gap-3">
            <AlertTriangle size={18} className="text-[#FFDD00]" />
            <h2 className="text-[#FFDD00] font-black text-[10px] tracking-[0.3em] uppercase">Security Protocol</h2>
          </div>
          <div className="p-8 space-y-8">
            {cityData.scam_alerts.map((scam, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute left-0 top-0 text-[#FFDD00] font-black text-xs">0{i + 1}</div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">"{scam}"</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* TRANSIT LOGIC */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Transit Logic</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="flex items-start gap-5 p-8 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#222222] border border-slate-100 font-black text-[10px]">APP</div>
              <div className="flex-1">
                <p className="font-bold text-xl text-[#222222] leading-none mb-2">{cityData.transit_logic.primary_app}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{cityData.transit_logic.etiquette}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 p-8 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#222222] border border-slate-100 font-black text-[10px]">PAY</div>
              <p className="font-bold text-xl text-[#222222]">{cityData.transit_logic.payment_method}</p>
            </div>
            {cityData.arrival?.transitHack && (
              <div className="p-8 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Train size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local Transit Hack</span>
                </div>
                <p className="text-sm font-bold text-[#222222] leading-relaxed">{cityData.arrival.transitHack}</p>
              </div>
            )}
          </div>
        </motion.section>
      </main>

      <AnimatePresence>
        {!isInstalled && isInstallable && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-0 right-0 px-6 z-50 pointer-events-none">
            <button onClick={installPWA} className="w-full max-w-sm mx-auto bg-[#222222] text-white h-16 rounded-2xl font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 pointer-events-auto">
              <Download size={18} className="text-[#FFDD00]" /> Download Pack
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}