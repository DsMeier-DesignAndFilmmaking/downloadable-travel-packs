import { Link } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';
import OfflineManager from '@/components/OfflineManager';

export default function SettingsView() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-20">
      <header className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Back to home"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2 flex items-center gap-3">
          <Settings size={32} className="text-slate-400" aria-hidden />
          Settings
        </h1>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
          Offline storage & preferences
        </p>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8">
        <OfflineManager />
      </main>
    </div>
  );
}
