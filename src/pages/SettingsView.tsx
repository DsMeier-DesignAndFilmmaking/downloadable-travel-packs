import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';
import OfflineManager from '@/components/OfflineManager';
import { getActiveProfile, setActiveProfile } from '@/lib/hade/profile';
import type { TravelerProfile } from '@/types/cityPack';

const PROFILES: TravelerProfile[] = [
  'Regenerative', 'Foodie', 'Wellness', 'Adventure', 'SalvagedStay',
];

export default function SettingsView() {
  const [activeProfile, setActiveProfileState] = useState<TravelerProfile | undefined>(
    getActiveProfile,
  );

  function handleProfileSelect(profile: TravelerProfile) {
    const next = activeProfile === profile ? undefined : profile;
    setActiveProfile(next);
    setActiveProfileState(next);
  }

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
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mb-4">
            Traveler Profile
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFILES.map((profile) => {
              const isSelected = activeProfile === profile;
              return (
                <button
                  key={profile}
                  onClick={() => handleProfileSelect(profile)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors active:scale-95 ${
                    isSelected
                      ? 'bg-[#222222] text-white border-[#222222]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {profile}
                </button>
              );
            })}
          </div>
          {activeProfile && (
            <p className="mt-3 text-xs text-slate-500">
              Active: <span className="font-bold text-slate-700">{activeProfile}</span>
            </p>
          )}
        </section>

        <OfflineManager />
      </main>
    </div>
  );
}
