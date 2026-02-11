import { motion } from 'framer-motion';
import { ChevronLeft, Cpu, ShieldCheck, Zap, Database, Globe, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const specVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function SystemSpecsView() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link to="/" className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
          System Specs
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Build / v4.2.0-Production
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-12">
        {/* THE CORE STACK */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">
            The Engine Stack
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <SpecCard 
              icon={<Cpu className="text-emerald-500" />}
              title="Compute Environment"
              description="React 18.3 + TypeScript 5.0 core. Optimized via Vite 5.x for lightning-fast HMR and edge-compliant bundle sizes."
            />
            <SpecCard 
              icon={<Layers className="text-blue-500" />}
              title="UI Architecture"
              description="Tailwind CSS 3.4 utility engine paired with Framer Motion 11 for hardware-accelerated 60fps animations."
            />
            <SpecCard 
              icon={<Globe className="text-purple-500" />}
              title="Protocol Persistence"
              description="Service Worker-driven PWA (Progressive Web App) architecture allowing full survival-pack access in 0-signal environments."
            />
          </div>
        </section>

        {/* API SPECIFICATION */}
        <section className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">
            Data Pipelines
          </h2>
          <div className="bg-[#222222] text-white rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Database className="text-[#FFDD00]" size={24} />
              <h3 className="font-black text-xs tracking-widest uppercase">API Infrastructure</h3>
            </div>
            <ul className="space-y-4 font-mono text-xs text-slate-400">
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Visa Intel</span>
                <span className="text-white">RapidAPI v2 (Check)</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>FX Resolution</span>
                <span className="text-white">Real-time Spot Rate Sync</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Caching Tier</span>
                <span className="text-white">AES-256 SessionStorage</span>
              </li>
              <li className="flex justify-between">
                <span>Rate Limiting</span>
                <span className="text-white">Adaptive Backoff (429 Handling)</span>
              </li>
            </ul>
          </div>
        </section>

        {/* PERFORMANCE METRICS */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm text-center">
            <Zap className="text-[#FFDD00] mx-auto mb-2" fill="#FFDD00" />
            <div className="text-2xl font-black">98</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Lighthouse Score</div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm text-center">
            <ShieldCheck className="text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-black">100%</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">SSL Encrypted</div>
          </div>
        </section>

        {/* VERSION HISTORY */}
        <footer className="pt-10 border-t border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed italic">
            "Designed for travelers, built for survivors."<br />
            © 2026 Travel Buddy Protocols
          </p>
        </footer>
      </main>
    </div>
  );
}

function SpecCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      variants={specVariants}
      className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex gap-5 items-start"
    >
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-tight mb-1">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
      </div>
    </motion.div>
  );
}