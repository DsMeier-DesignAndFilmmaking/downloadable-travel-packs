import { ChevronLeft, ShieldAlert, Lock, EyeOff, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurityProtocolView() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link to="/" className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
          Security Protocol
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Data Governance / v2.0
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8">
        
        {/* ENCRYPTION SECTION */}
        <section className="bg-[#222222] text-white rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-[#FFDD00]" size={24} />
            <h3 className="font-black text-xs tracking-widest uppercase">Client-Side Vault</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-6 font-medium">
            Your passport origin and travel preferences never leave your device. We utilize 
            <span className="text-white font-bold"> AES-256 local encryption </span> 
            to ensure that your data is invisible to everyone—including us.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <EyeOff size={18} className="text-[#FFDD00] mb-2" />
              <div className="text-[10px] font-bold uppercase text-white">Zero Knowledge</div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <Radio size={18} className="text-[#FFDD00] mb-2" />
              <div className="text-[10px] font-bold uppercase text-white">Encrypted Sync</div>
            </div>
          </div>
        </section>

        {/* PROTOCOLS */}
        <div className="space-y-4">
          <ProtocolItem 
            number="01" 
            title="Field Intelligence Verification" 
            desc="Every scam alert and 'Digital Entry' requirement is cross-referenced against official embassy feeds and local ground-team reports."
          />
          <ProtocolItem 
            number="02" 
            title="Volatile Memory Auto-Wipe" 
            desc="Sensitive session data is cleared automatically after 24 hours of inactivity or upon 'Protocol Reset' in the settings."
          />
          <ProtocolItem 
            number="03" 
            title="Offline Redundancy" 
            desc="Security data is cached locally to ensure that critical emergency numbers and safety warnings are accessible even when your cellular signal is jammed or unavailable."
          />
        </div>

        <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-100 flex gap-4">
          <ShieldAlert className="text-rose-600 shrink-0" size={24} />
          <div>
            <h4 className="text-xs font-black uppercase text-rose-900 mb-1">Emergency Override</h4>
            <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
              If you suspect your device has been compromised, use the "Nuke Session" button in the Debug panel to immediately wipe all local travel caches.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

function ProtocolItem({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex gap-5">
      <div className="text-xl font-black text-slate-200 tabular-nums">{number}</div>
      <div>
        <h3 className="text-xs font-black uppercase tracking-tight mb-1">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}