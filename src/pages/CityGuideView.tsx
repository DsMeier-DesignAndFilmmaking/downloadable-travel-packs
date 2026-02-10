import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, AlertTriangle, Download, 
  Zap, Droplets, ChevronLeft,
  Plane, Wifi, Smartphone, Train, Info, FileCheck, ExternalLink, Lightbulb,
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MANIFEST_URL } from '@/services/apiConfig';
import { fetchVisaCheck, type VisaCheckData } from '@/services/visaService';
import DebugBanner from '@/components/DebugBanner';

/** High-alert banner for 2026 critical updates: digital entry, tourist tax, and optional visa status. */
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
    <div className="rounded-2xl border border-amber-200/80 bg-amber-100 shadow-sm overflow-hidden">
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
    </div>
  );
}

/** Tap-to-call cells for Survival Dashboard 2x2. */
function getEmergencyGridItems(emergency: Record<string, string | undefined>) {
  const order = ['police', 'medical', 'ambulance', 'tourist_police', 'emergency_all', 'general_eu', 'non_emergency'] as const;
  const labels: Record<string, string> = {
    police: 'Police',
    medical: 'Medical',
    ambulance: 'Ambulance',
    tourist_police: 'Tourist Police',
    emergency_all: 'Emergency',
    general_eu: 'EU 112',
    non_emergency: 'Non-Emergency',
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
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  },
};

// Change from 'USA' to 'US'
const DEFAULT_PASSPORT = 'US';

function mandatoryRegistrationBg(color?: string): string {
  if (!color) return 'bg-amber-100';
  const c = color.toLowerCase();
  if (c === 'yellow' || c === 'amber') return 'bg-amber-100';
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
    if (!isLoading && cityData) {
      setIsReady(true);
    }
  }, [isLoading, cityData]);

  // Real-time hydration logic: skip API for domestic travel (passport country === destination)
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
    console.log(`✈️ API REQUEST: ${DEFAULT_PASSPORT} -> ${cityData.countryCode}`);

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

  // Dynamic Manifest generation for PWA
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
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-10 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
          <div className="h-14 w-14 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-slate-200 rounded-3xl" />
        </div>
        <div className="h-48 bg-slate-200 rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (error || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error?.message || 'City Not Found'}</p>
      <Link to="/" className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform">
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
{showDebug && (
        <DebugBanner
          data={visaData ?? undefined}
          cityId={cityData.slug}
          loading={isApiLoading}
        />
      )}

      {/* 1. STATUS BANNER */}
      <div className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 shadow-sm ${isOffline ? 'bg-orange-50 text-orange-700' : 'bg-[#FFDD00] text-[#222222]'}`}>
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-600 animate-pulse' : 'bg-[#222222]'}`} />
          {isOffline ? 'Offline Mode Active' : 'Live Field Data'}
        </span>
        {!isOffline && (
          <button onClick={() => refetch()} className="underline decoration-2 underline-offset-4 active:opacity-50 transition-opacity">
            Refresh
          </button>
        )}
      </div>

      {/* 2. MANDATORY REGISTRATION BANNER */}
      {visaData?.mandatory_registration && (
        <div
          className={`sticky top-[38px] z-50 px-6 py-3 border-b border-slate-200/80 shadow-sm ${mandatoryRegistrationBg(visaData.mandatory_registration.color)} text-[#222222] flex flex-wrap items-center justify-between gap-2`}
          role="alert"
        >
          <span className="text-xs font-bold">
            {visaData.mandatory_registration.text || `Mandatory ${visaData.mandatory_registration.name} required before travel`}
          </span>
          {visaData.mandatory_registration.link && (
            <a
              href={visaData.mandatory_registration.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 underline decoration-2 underline-offset-2 hover:no-underline"
            >
              Register <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <motion.header variants={itemVariants} className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <Link to="/" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-right">
            <h1
              className="text-4xl font-black tracking-tighter uppercase leading-none cursor-default select-none"
              onClick={() => {
                const next = debugTapCount + 1;
                setDebugTapCount(next);
                if (next >= 5) {
                  setShowDebug(true);
                  setDebugTapCount(0);
                }
              }}
              role="heading"
              aria-level={1}
            >
              {cityData.name}
            </h1>
            {cityData.theme && (
              <p className="text-sm text-slate-600 mt-2 font-medium leading-snug max-w-xs ml-auto" role="doc-subtitle">
                {cityData.theme}
              </p>
            )}
            <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-2">Guide Pack / {cityData.countryName}</p>
          </div>
        </div>
      </motion.header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {/* SURVIVAL DASHBOARD */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Survival Dashboard</h2>
          {isDomestic ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
              <p className="text-[#222222] text-sm font-medium leading-relaxed">
                Domestic Trip: No visa or currency exchange required for US Citizens.
              </p>
            </div>
          ) : (
            <>
              <HighAlertBanner
                digitalEntry={cityData.survival?.digitalEntry}
                touristTax={cityData.survival?.touristTax}
                visaStatus={
                  visaData?.visa_rules?.primary_rule?.name != null
                    ? [visaData.visa_rules.primary_rule.name, visaData.visa_rules.primary_rule.duration]
                        .filter(Boolean)
                        .join(' - ')
                    : undefined
                }
              />
              {visaData?.destination?.passport_validity && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
                  <FileCheck size={22} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Passport Warning</h3>
                    <p className="text-[#222222] text-sm font-medium leading-relaxed">{visaData.destination.passport_validity}</p>
                  </div>
                </div>
              )}
              {(visaData?.visa_rules?.secondary_rule?.link || visaData?.visa_rules?.primary_rule?.link) && (
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={visaData.visa_rules.secondary_rule?.link || visaData.visa_rules.primary_rule?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#222222] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-black active:scale-[0.98] transition-all"
                  >
                    Apply Now <ExternalLink size={16} />
                  </a>
                  <span className="text-[10px] text-slate-500 font-medium">Official eVisa / eTA portal</span>
                </div>
              )}
            </>
          )}

<div className="grid grid-cols-2 gap-4">
  {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
    <div
      key={key}
      className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-3xl shadow-lg shadow-black/10 select-all"
    >
      <Phone size={22} className="mb-2 text-[#FFDD00]" />
      <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">
        {label}
      </span>
      <span className="text-xl font-bold mt-1 tracking-wide">
        {number}
      </span>
      {/* Optional: Add a 'Manual Entry Only' hint in tiny text */}
    </div>
  ))}
</div>

          {cityData.survival?.currentScams?.length > 0 && (
            <div className="bg-[#222222] text-white rounded-2xl overflow-hidden border border-slate-800">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
                <AlertTriangle size={16} className="text-[#FFDD00] shrink-0" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">Scam Alert</span>
              </div>
              <div className="relative py-3 overflow-hidden">
                <div className="scam-ticker whitespace-nowrap flex gap-8">
                  {[...cityData.survival.currentScams, ...cityData.survival.currentScams].map((scam, i) => (
                    <span key={i} className="text-sm text-slate-300 font-medium">• {scam}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {visaData?.exception_rule?.full_text && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3" role="complementary">
              <Lightbulb size={20} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Pro-Tip</p>
                <p className="text-[#222222] text-sm font-medium leading-relaxed">Did you know? {visaData.exception_rule.full_text}</p>
              </div>
            </div>
          )}
        </motion.section>

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
              {cityData.arrival.eSimAdvice && (
                <>
                  <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Wifi size={20} className="text-[#222222]" />
                    <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Connect</span>
                  </div>
                  <div className="p-6 pt-0 space-y-3">
                    <p className="text-[#222222] font-medium leading-relaxed text-sm">{cityData.arrival.eSimAdvice}</p>
                    {cityData.arrival.eSimHack && (
                      <p className="text-slate-600 text-sm italic border-l-2 border-[#FFDD00] pl-3">{cityData.arrival.eSimHack}</p>
                    )}
                  </div>
                </>
              )}
              {cityData.arrival.transitHack && (
                <>
                  <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Train size={20} className="text-[#222222]" />
                    <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Transit hack</span>
                  </div>
                  <div className="p-6 pt-0 text-sm font-medium">{cityData.arrival.transitHack}</div>
                </>
              )}
              {cityData.arrival.essentialApps?.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Smartphone size={20} className="text-[#222222]" />
                    <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Essential apps</span>
                  </div>
                  <div className="p-6 pt-0 flex flex-wrap gap-2">
                    {cityData.arrival.essentialApps.map((app, i) => (
                      <span key={i} className="bg-[#FFDD00] text-[#222222] px-3 py-1.5 rounded-xl text-xs font-bold">{app}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.section>
        )}

        {/* SURVIVAL BASICS — Tap Water, Power, Live Exchange (Money Hack) */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <Droplets className="text-blue-500 mb-4" size={24} />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap Water</h3>
              <p className="text-lg font-bold text-[#222222]">{cityData.survival?.tapWater ?? cityData.survival_kit?.tap_water}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <Zap className="text-[#FFDD00]" size={24} fill="#FFDD00" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-4">Power Plug</h3>
              <p className="text-lg font-bold text-[#222222]">
                {cityData.survival?.power && typeof cityData.survival.power === 'object'
                  ? `${cityData.survival.power.type} (${cityData.survival.power.voltage})`
                  : cityData.survival_kit?.power_plug}
              </p>
            </div>
          </div>
          {!isDomestic &&
            visaData?.destination?.exchange != null &&
            visaData?.passport?.currency_code != null &&
            visaData?.destination?.currency_code != null && (
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl" aria-hidden>💰</span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Exchange</h3>
                </div>
                <p className="text-lg font-bold text-[#222222]">
                  1 {visaData.passport?.currency_code} = {visaData.destination?.exchange} {visaData.destination?.currency_code}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 italic">Last updated: {cityData.last_updated}</p>
              </motion.div>
            )}
        </motion.section>

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
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
            <div className="flex items-start gap-5 p-8 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#222222] border border-slate-100 font-black text-[10px]">APP</div>
              <div className="flex-1">
                <p className="font-bold text-xl text-[#222222] leading-none mb-2">{cityData.transit_logic.primary_app}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{cityData.transit_logic.etiquette}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#222222] border border-slate-100 font-black text-[10px]">PAY</div>
              <p className="font-bold text-xl text-[#222222]">{cityData.transit_logic.payment_method}</p>
            </div>
          </div>
        </motion.section>
      </main>

      <AnimatePresence>
        {!isInstalled && isInstallable && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ delay: 0.8, type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-10 left-0 right-0 px-6 z-50 pointer-events-none"
          >
            <button 
              onClick={installPWA}
              className="w-full max-w-sm mx-auto bg-[#222222] text-white h-16 rounded-2xl font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all pointer-events-auto"
            >
              <Download size={18} className="text-[#FFDD00]" /> 
              Download Pack
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}