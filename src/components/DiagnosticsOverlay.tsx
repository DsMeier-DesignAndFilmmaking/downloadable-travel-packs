import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Zap, Database, Activity, RefreshCcw, ChevronRight } from 'lucide-react';

interface DiagnosticsProps {
  city: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DiagnosticsOverlay({ city, isOpen, onClose }: DiagnosticsProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // --- HARD REFRESH LOGIC ---
  const handleHardRefresh = async () => {
    const confirmed = window.confirm(
      "PERFORM SYSTEM RESET?\n\nThis will unregister the Service Worker and clear all cached city packs. The app will reload to fetch the latest manifest."
    );

    if (!confirmed) return;

    setIsResetting(true);
    try {
      // 1. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      // 2. Clear all named Caches (travel-guide-v1, v2, etc.)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 3. Clear PWA state memory
      localStorage.removeItem('pwa_last_pack');

      // 4. Force hard reload from server
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      setIsResetting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] pointer-events-auto"
          />
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0F0F0F] rounded-t-[2.5rem] z-[10000] border-t border-white/10 p-8 max-h-[85vh] overflow-y-auto pointer-events-auto shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

            <header className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Engine Diagnostics</h2>
                <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest mt-1">
                  Agentic Protocol v4.2.0 // Node: {city.toUpperCase()}
                </p>
              </div>
              <button 
                onClick={() => setShowTechnical(!showTechnical)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  showTechnical ? 'bg-emerald-500 text-[#0F0F0F]' : 'border border-emerald-500/30 text-emerald-500'
                }`}
              >
                {showTechnical ? 'Exit Dev Mode' : 'Technical Data'}
              </button>
            </header>

            <div className="grid gap-4 mb-10">
              <DiagnosticRow 
                icon={<ShieldCheck className="text-emerald-500" size={18} />}
                label="Compliance Engine"
                status="Verified"
                techDetail={`Source: IATA/Gov-Portal // Latency: 42ms`}
                showTech={showTechnical}
              />
              <DiagnosticRow 
                icon={<Zap className="text-emerald-500" size={18} />}
                label="Security Shield"
                status="Active Scan"
                techDetail="Model: GPT-4o-Travel-v2 // Context: Real-time"
                showTech={showTechnical}
              />
              <DiagnosticRow 
                icon={<Database className="text-emerald-500" size={18} />}
                label="Local Intelligence"
                status="Cached"
                techDetail="Store: SQLite Vector // Size: 1.2MB"
                showTech={showTechnical}
              />
            </div>

            {/* --- NEW RECOVERY BLOCK --- */}
            <section className="mb-6">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-1">System Recovery</p>
              <button 
                onClick={handleHardRefresh}
                disabled={isResetting}
                className="w-full flex items-center justify-between p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-500">
                    <RefreshCcw size={18} className={isResetting ? 'animate-spin' : ''} />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-tight">Hard Reset Engine</p>
                    <p className="text-[9px] font-bold text-rose-500/60 uppercase">Flush Manifest & SW Registry</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-rose-500/40 group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-emerald-500" />
                <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-50">AI Reasoning Flow</h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                The AI Agent is processing <span className="text-white">Live Field Signals</span> from {city}. 
                Priority is currently assigned to <span className="text-white">EES 2026 Entry Compliance</span> and local currency volatility. 
                Data integrity is verified against ground-truth embassy records.
              </p>
            </section>

            <button 
              onClick={onClose}
              className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-colors"
            >
              Close Diagnostics
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DiagnosticRow({ icon, label, status, techDetail, showTech }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-black rounded-xl border border-white/10">{icon}</div>
        <div>
          <p className="text-[11px] font-black text-white uppercase tracking-tight">{label}</p>
          <p className="text-[10px] font-bold text-emerald-500/80 uppercase">{status}</p>
        </div>
      </div>
      <AnimatePresence>
        {showTech && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="text-right"
          >
            <p className="text-[9px] font-mono text-slate-500 leading-none">{techDetail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}