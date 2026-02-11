import { ChevronLeft, AlertTriangle, ShieldAlert, MapPinOff, Flame, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TravelDisclaimerView() {
  return (
    // Wrap your content in a motion.div to "read" the variable
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto py-16 px-6"
    >
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link to="/" className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
          Travel Disclaimer
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Document Ref: RISK-V2-2026
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-10">
        
        {/* HIGH-LEVEL WARNING */}
        <section className="bg-amber-100 border border-amber-200 p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-amber-800">
            <AlertTriangle size={24} />
            <h2 className="font-black text-xs tracking-widest uppercase">Assumption of Risk</h2>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed font-bold">
            Travel is inherently risky. By using this Guide Pack, you acknowledge that you are 
            voluntarily assuming all risks related to travel, including but not limited to 
            health hazards, political instability, and physical safety.
          </p>
        </section>

        {/* 1. NO GUARANTEE OF SAFETY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <MapPinOff size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Security Advisory</h2>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
            While our "Live Scam Shield" utilizes field data, we cannot guarantee your 
            personal safety. Intelligence on pickpocketing, scams, and dangerous areas is 
            subjective and can change within minutes. The absence of a warning for a specific 
            location does not imply that location is safe.
          </div>
        </section>

        {/* 2. VISA & BORDER PROTOCOL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <ShieldAlert size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">2. Entry Requirements</h2>
          </div>
          <div className="bg-[#222222] text-white p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FFDD00] mb-4">Advisory Nature</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4 font-medium">
              Visa requirements, health certificates (e.g., vaccines), and digital entry fees 
              listed in this app are for <span className="text-white italic">informational purposes only</span>. 
              The final authority on entry is the Border Officer at your destination.
            </p>
          </div>
        </section>

        {/* 3. DISCLOSURES */}
        <div className="grid grid-cols-1 gap-4">
          <DisclosureCard 
            icon={<Flame size={20} className="text-orange-500" />}
            title="Force Majeure"
            desc="We are not liable for travel disruptions caused by civil unrest, natural disasters, or airline strikes."
          />
          <DisclosureCard 
            icon={<HelpCircle size={20} className="text-blue-500" />}
            title="Medical Advice"
            desc="This app does not provide medical advice. Consult a travel clinic for vaccination requirements and local health risks."
          />
        </div>

        {/* FINAL INDEMNITY */}
        <section className="p-8 border-t border-slate-200">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Indemnification</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            By proceeding, you agree to indemnify and hold harmless the developers of Travel Buddy Protocol v2 
            from any claims, damages, or expenses (including legal fees) arising from your travel 
            decisions based on the intelligence provided herein.
          </p>
        </section>

        <footer className="text-center pb-10">
          <div className="inline-block px-4 py-1 rounded-full bg-slate-200 text-[9px] font-black uppercase tracking-tighter">
            Verified Protocol 2026.1
          </div>
        </footer>
      </main>
    </div>
    </motion.div>
  );
}

function DisclosureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex gap-4">
      <div className="shrink-0">{icon}</div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-tight mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}