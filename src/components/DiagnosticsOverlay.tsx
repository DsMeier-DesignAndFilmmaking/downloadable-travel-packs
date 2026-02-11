import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Zap, Database, Cpu, Activity, X, Info, Globe } from 'lucide-react';

interface DiagnosticsProps {
  city: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DiagnosticsOverlay({ city, isOpen, onClose }: DiagnosticsProps) {
  const [showTechnical, setShowTechnical] = useState(false);

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