import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Navigation, Plane, Wifi } from 'lucide-react';
import SourceInfo from '@/components/SourceInfo';
import type { CityPackArrivalTacticalPath } from '@/types/cityPack';

type ArrivalSectionProps = {
  cityName: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  hasLanded: boolean;
  isLandedHydrated: boolean;
  digitalEntry?: string;
  tacticalPath: CityPackArrivalTacticalPath;
  visaEntryNode: ReactNode;
  onMarkLanded: () => void;
  onResetStatus: () => void;
};

function balanceText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  const tail = `${words[words.length - 2]}\u00A0${words[words.length - 1]}`;
  return `${words.slice(0, -2).join(' ')} ${tail}`;
}

export default function ArrivalSection({
  cityName,
  source,
  lastUpdated,
  isLive,
  hasLanded,
  isLandedHydrated,
  digitalEntry,
  tacticalPath,
  visaEntryNode,
  onMarkLanded,
  onResetStatus,
}: ArrivalSectionProps) {
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required for this route.';

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Arrival Intelligence</h2>
        <SourceInfo source={source} lastUpdated={lastUpdated} isLive={isLive} />
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <Plane size={20} className="text-[#222222]" />
          <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Arrival Intelligence</span>
        </div>

        <div className="px-8 py-6 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Visa & Entry Intelligence</p>
          <div className="mt-4 min-h-[140px]">{visaEntryNode}</div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Digital Entry</p>
            <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
              {balanceText(digitalEntryText)}
            </p>
          </div>
        </div>

        <div className="px-8 py-6">
          <AnimatePresence mode="wait" initial={false}>
            {!isLandedHydrated ? (
              <motion.div
                key="arrival-loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-medium text-slate-500 animate-pulse">
                  {balanceText('Syncing arrival status for this city pack...')}
                </p>
              </motion.div>
            ) : !hasLanded ? (
              <motion.div
                key="arrival-pre-landing"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  type="button"
                  onClick={onMarkLanded}
                  whileTap={{ scale: 0.98 }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(16, 185, 129, 0.35)',
                      '0 0 0 10px rgba(16, 185, 129, 0)',
                      '0 0 0 0 rgba(16, 185, 129, 0)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg"
                >
                  {balanceText(`🛬 I've Landed in ${cityName}!`)}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="arrival-tactical-path"
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Tactical Path
                </p>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Wifi size={16} className="text-blue-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Step 1: Connectivity</p>
                  </div>
                  <p className="mt-2 text-base md:text-lg tracking-[0.01em] font-black text-[#222222]">
                    {balanceText(`SSID: ${tacticalPath.connectivity.wifiSsid}`)}
                  </p>
                  <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-semibold text-slate-700">
                    {balanceText(`Password: ${tacticalPath.connectivity.wifiPassword}`)}
                  </p>
                  <p className="mt-1 text-xs md:text-sm tracking-[0.01em] font-medium text-slate-600 leading-relaxed">
                    {balanceText(tacticalPath.connectivity.note)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Step 2: Immigration Strategy</p>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
                    {balanceText(tacticalPath.immigration.strategy)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-amber-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Step 3: Transport Intel</p>
                  </div>
                  <p className="mt-2 text-base md:text-lg tracking-[0.01em] font-black text-[#222222] leading-relaxed">
                    {balanceText(tacticalPath.transport.taxiEstimate)}
                  </p>
                  <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-semibold text-slate-700 leading-relaxed">
                    {balanceText(tacticalPath.transport.trainEstimate)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-slate-100 px-8 py-4">
          <button
            type="button"
            onClick={onResetStatus}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 underline underline-offset-2"
          >
            Reset Status
          </button>
        </div>
      </div>
    </section>
  );
}
