import { motion } from 'framer-motion';
import { ChevronLeft, Gavel, AlertOctagon, Scale, ShieldAlert, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfServiceView() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link to="/" className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
          Terms of Service
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Revision: 2026.04 // Legal Protocol
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-10">
        
        {/* CRITICAL DISCLAIMER */}
        <section className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-3 mb-4 text-rose-700">
            <AlertOctagon size={24} />
            <h2 className="font-black text-xs tracking-widest uppercase">Emergency Disclaimer</h2>
          </div>
          <p className="text-sm text-rose-900 leading-relaxed font-bold">
            THIS SERVICE IS PROVIDED "AS IS." TRAVEL BUDDY PROTOCOL IS AN INFORMATION AGGREGATOR. 
            WE ARE NOT A GOVERNMENT AGENCY. ALWAYS CROSS-REFERENCE VISA DATA WITH OFFICIAL 
            EMBASSY DOCUMENTATION BEFORE TRAVEL.
          </p>
        </section>

        {/* 1. ACCEPTANCE OF TERMS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Gavel size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Agreement</h2>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
            By accessing this Progressive Web App (PWA), you agree to be bound by these Terms. 
            If you do not agree to the "Field Data Verification" protocol, you are prohibited from 
            using the Survival Dashboard features.
          </div>
        </section>

        {/* 2. DATA ACCURACY PROTOCOL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <ShieldAlert size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">2. Intel Accuracy</h2>
          </div>
          <div className="bg-[#222222] text-white p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FFDD00] mb-4">Third-Party Data</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4 font-medium">
              We utilize RapidAPI and other third-party field data. While we strive for 99.9% 
              accuracy in our 2026 intelligence feeds, we do not warrant that the information 
              is error-free. Visa rules change without notice.
            </p>
          </div>
        </section>

        {/* 3. LIMITATION OF LIABILITY */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">
            3. Legal Boundaries
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <TermCard 
              icon={<Scale size={20} className="text-blue-500" />}
              title="Liability Cap"
              desc="To the maximum extent permitted by law, Travel Buddy Protocol is not liable for missed flights, visa denials, or security incidents occurring during travel."
            />
            <TermCard 
              icon={<FileText size={20} className="text-purple-500" />}
              title="User Responsibility"
              desc="Users are solely responsible for ensuring their passports have 6 months validity and meeting local entry requirements."
            />
          </div>
        </section>

        {/* 4. INTELLECTUAL PROPERTY */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">4. IP Rights</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            All code, design systems, and "Agentic UI" patterns are the exclusive property of 
            the project founders. Unauthorized scraping of field data via automated bots is strictly 
            prohibited and will result in a permanent IP protocol ban.
          </p>
        </section>

        <footer className="pt-10 border-t border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
            Governing Law: International Maritime & Digital Commerce Standards<br />
            <span className="text-[#222222]">Last Updated: February 2026</span>
          </p>
        </footer>
      </main>
    </div>
  );
}

function TermCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
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