import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, Bus, AlertTriangle, Download, 
  WifiOff, CheckCircle, RefreshCw, Zap, Droplets
} from 'lucide-react';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MANIFEST_URL } from '@/services/apiConfig';

/** Emergency keys for dynamic tel: link generation */
const EMERGENCY_KEYS = [
  'police', 'medical', 'ambulance', 'tourist_police', 
  'emergency_all', 'non_emergency', 'general_eu'
] as const;

export default function CityGuideView() {
  const { slug } = useParams<{ slug: string }>();
  const { cityData, isLoading, isOffline, error, refetch } = useCityPack(slug || '');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();

  // Dynamic Manifest Injection for A2HS Scoping (env-aware: DEV = mock JSON, PROD = serverless)
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

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [slug]);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 font-mono tracking-widest">LOADING SURVIVAL PACK...</div>
    </div>
  );

  if (error || !cityData) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-slate-300 mb-6">{error?.message || 'City Not Found'}</p>
      <Link to="/" className="bg-slate-800 text-white px-6 py-2 rounded-full">Back to Catalog</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      {/* 1. SYNC STATUS BANNER */}
      <div className={`px-4 py-2 text-[10px] font-bold flex justify-between items-center tracking-widest uppercase ${isOffline ? 'bg-amber-900/40 text-amber-200' : 'bg-emerald-900/40 text-emerald-200'}`}>
        <span className="flex items-center gap-1.5">
          {isOffline ? <WifiOff size={12} /> : <CheckCircle size={12} />}
          {isOffline ? 'Offline Mode' : 'Live Sync Active'}
        </span>
        {!isOffline && (
          <button onClick={() => refetch()} className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <RefreshCw size={10} /> Sync
          </button>
        )}
      </div>

      {/* 2. EMERGENCY SOS HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">{cityData.name}</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">{cityData.country}</p>
          </div>
          <a href={`tel:${cityData.emergency.police}`} className="bg-rose-600 p-3 rounded-2xl shadow-lg shadow-rose-900/20 active:scale-95 transition-transform">
            <Phone size={24} className="fill-current" />
          </a>
        </div>
        
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {EMERGENCY_KEYS.map((key) => {
            const val = cityData.emergency[key];
            if (!val) return null;
            return (
              <a key={key} href={`tel:${val.replace(/\D/g, '')}`} className="shrink-0 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
                <span className="opacity-50 uppercase text-[9px]">{key.replace('_', ' ')}</span> {val}
              </a>
            );
          })}
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* 3. SURVIVAL GRID */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <Droplets className="text-blue-400 mb-2" size={20} />
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tap Water</h3>
            <p className="text-sm font-bold mt-1 leading-tight">{cityData.survival_kit.tap_water}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <Zap className="text-amber-400 mb-2" size={20} />
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Power</h3>
            <p className="text-sm font-bold mt-1 leading-tight">{cityData.survival_kit.power_plug}</p>
          </div>
        </section>

        {/* 4. SCAM ALERTS (Priority Content) */}
        <section className="bg-rose-900/20 border border-rose-500/20 p-5 rounded-[2rem]">
          <h2 className="text-rose-400 font-black text-xs tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
            <AlertTriangle size={16} /> Scam Alerts
          </h2>
          <ul className="space-y-4">
            {cityData.scam_alerts.map((scam, i) => (
              <li key={i} className="text-sm text-rose-100/80 leading-relaxed pl-4 border-l border-rose-500/30 italic">
                "{scam}"
              </li>
            ))}
          </ul>
        </section>

        {/* 5. TRANSIT LOGIC */}
        <section className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <h2 className="text-slate-400 font-black text-xs tracking-[0.2em] uppercase mb-5 flex items-center gap-2">
            <Bus size={16} /> Transit Logic
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold">App</div>
              <div>
                <p className="font-bold text-slate-200">{cityData.transit_logic.primary_app}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cityData.transit_logic.etiquette}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 font-bold">Pay</div>
              <div>
                <p className="font-bold text-slate-200">{cityData.transit_logic.payment_method}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. A2HS DOWNLOAD BUTTON (Scoped to City Page) */}
      {!isInstalled && isInstallable && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
          <button 
            onClick={installPWA}
            className="w-full bg-white text-black py-5 rounded-[2rem] font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-2xl shadow-white/10 active:scale-95 transition-transform"
          >
            <Download size={18} /> Download {cityData.name} Pack
          </button>
        </div>
      )}
    </div>
  );
}