import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, EyeOff, Trash2, Globe, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function PrivacyPolicyView() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link to="/" className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
          Privacy Policy
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Effective Date: Feb 10, 2026
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-12">
        
        {/* SUMMARY SECTION */}
        <section className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-3 mb-4 text-emerald-700">
            <ShieldCheck size={24} />
            <h2 className="font-black text-xs tracking-widest uppercase">The "TL;DR" Summary</h2>
          </div>
          <p className="text-sm text-emerald-900 leading-relaxed font-medium">
            We don't sell your data. We don't track your live GPS position outside the app. 
            We store your passport origin locally on your device. When you delete the app, 
            your data dies with it.
          </p>
        </section>

        {/* 1. DATA COLLECTION */}
        <motion.section variants={itemVariants} initial="hidden" animate="visible" className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Globe size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Data Collection</h2>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              We collect minimal data necessary for protocol execution:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 text-xs font-bold text-[#222222]">
                <span className="text-emerald-500">•</span> Origin/Passport Country (User Provided)
              </li>
              <li className="flex gap-3 text-xs font-bold text-[#222222]">
                <span className="text-emerald-500">•</span> Destination Slugs (Used for API routing)
              </li>
              <li className="flex gap-3 text-xs font-bold text-[#222222]">
                <span className="text-emerald-500">•</span> Device Type & OS (For PWA optimization)
              </li>
            </ul>
          </div>
        </motion.section>

        {/* 2. LOCAL STORAGE SOVEREIGNTY */}
        <motion.section variants={itemVariants} initial="hidden" animate="visible" className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <EyeOff size={18} className="text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">2. Data Sovereignty</h2>
          </div>
          <div className="bg-[#222222] text-white p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FFDD00] mb-4">Client-Side Only</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Sensitive information, such as your citizenship and travel history, is stored in your browser's 
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#FFDD00]">localStorage</code>. 
              This data is never transmitted to our servers or stored in a centralized database.
            </p>
          </div>
        </motion.section>

        {/* 3. YOUR RIGHTS */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">
            3. Legal Compliance & Rights
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <RightCard 
              icon={<Trash2 size={20} className="text-rose-500" />}
              title="Right to Erasure"
              desc="You can wipe all data instantly by clearing your browser cache or using the 'Reset Protocol' button."
            />
            <RightCard 
              icon={<Scale size={20} className="text-blue-500" />}
              title="GDPR/CCPA Compliance"
              desc="We adhere to the highest global standards for data protection and user privacy rights."
            />
          </div>
        </section>

        {/* FOOTER CONTACT */}
        <footer className="pt-10 border-t border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 leading-relaxed">
            Privacy concerns? Contact the Data Protection Officer:<br />
            <span className="text-[#222222]">privacy@travelbuddy-v2.io</span>
          </p>
        </footer>
      </main>
    </div>
  );
}

function RightCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
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