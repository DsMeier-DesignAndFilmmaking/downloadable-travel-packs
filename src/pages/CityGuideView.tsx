import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, Bus, AlertTriangle, Download, 
  WifiOff, CheckCircle, RefreshCw, Zap, Droplets, ChevronLeft,
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
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40">
      {/* 1. STATUS BANNER (Nat Geo Yellow) */}
      <div className={`px-6 py-2.5 text-[9px] font-black flex justify-between items-center tracking-[0.2em] uppercase sticky top-0 z-[60] border-b border-slate-200 ${isOffline ? 'bg-orange-50 text-orange-700' : 'bg-[#FFDD00] text-[#222222]'}`}>
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-orange-600 animate-pulse' : 'bg-[#222222]'}`} />
          {isOffline ? 'Offline Mode Active' : 'Live Field Data'}
        </span>
        {!isOffline && (
          <button onClick={() => refetch()} className="underline decoration-2 underline-offset-4">Refresh</button>
        )}
      </div>

      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <Link to="/" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-right">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">{cityData.name}</h1>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-2">Guide Pack / {cityData.country}</p>
          </div>
        </div>

        {/* EMERGENCY DIALER - High Contrast */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <a href={`tel:${cityData.emergency.police}`} className="flex items-center gap-3 bg-[#222222] text-white px-6 py-4 rounded-2xl hover:bg-black transition-colors shrink-0 shadow-lg shadow-black/10">
            <Phone size={18} fill="currentColor" />
            <span className="text-xs font-black uppercase tracking-widest">Emergency</span>
          </a>
          {EMERGENCY_KEYS.slice(1).map((key) => {
            const val = cityData.emergency[key];
            if (!val) return null;
            return (
              <a key={key} href={`tel:${val.replace(/\D/g, '')}`} className="shrink-0 bg-white border border-slate-200 px-5 py-4 rounded-2xl text-[11px] font-bold hover:border-slate-400 transition-colors">
                <span className="text-slate-400 mr-2 uppercase text-[9px] tracking-tighter">{key.replace('_', ' ')}</span> {val}
              </a>
            );
          })}
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {/* 3. SURVIVAL GRID - Airbnb Style Whitespace */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <Droplets className="text-blue-500 mb-4" size={24} />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap Water</h3>
            <p className="text-lg font-bold text-[#222222]">{cityData.survival_kit.tap_water}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <Zap className="text-[#FFDD00]" size={24} fill="#FFDD00" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-4">Power Plug</h3>
            <p className="text-lg font-bold text-[#222222]">{cityData.survival_kit.power_plug}</p>
          </div>
        </section>

        {/* 4. SCAM ALERTS - Bold Warning Style */}
        <section className="bg-[#222222] text-white rounded-[2.5rem] overflow-hidden shadow-2xl">
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
        </section>

        {/* 5. TRANSIT LOGIC */}
        <section className="space-y-4">
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
        </section>
      </main>

      {/* 6. INSTALL BUTTON (Airbnb Contrast) */}
      {!isInstalled && isInstallable && (
        <div className="fixed bottom-10 left-0 right-0 px-6 z-50">
          <button 
            onClick={installPWA}
            className="w-full max-w-sm mx-auto bg-[#222222] text-white h-16 rounded-2xl font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
          >
            <Download size={18} className="text-[#FFDD00]" /> 
            Cache Full Guide
          </button>
        </div>
      )}
    </div>
  );
}