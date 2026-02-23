import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Navigation, Plane, Wifi } from 'lucide-react';
import SourceInfo from '@/components/SourceInfo';

type ArrivalIntelligenceProps = {
  cityName: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  hasLanded: boolean;
  isLandedHydrated: boolean;
  digitalEntry?: string;
  preLandStrategy?: string;
  laneSelection?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  officialTransport?: string;
  currencySimLocations?: string;
  taxiEstimate?: string;
  trainEstimate?: string;
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

export default function ArrivalIntelligence({
  cityName,
  source,
  lastUpdated,
  isLive,
  hasLanded,
  isLandedHydrated,
  digitalEntry,
  preLandStrategy,
  laneSelection,
  wifiSsid,
  wifiPassword,
  officialTransport,
  currencySimLocations,
  taxiEstimate,
  trainEstimate,
  visaEntryNode,
  onMarkLanded,
  onResetStatus,
}: ArrivalIntelligenceProps) {
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required for this route.';
  const strategyText =
    preLandStrategy?.trim() ||
    'Confirm entry requirements and keep passport, address, and onward proof ready before immigration.';
  const laneText =
    laneSelection?.trim() ||
    'Follow official airport signage: eGate only if eligible, otherwise use staffed immigration lanes.';

  const wifiSsidText = wifiSsid?.trim() || 'Airport Free WiFi';
  const wifiPasswordText = wifiPassword?.trim() || 'Portal login';
  const officialTransportText =
    officialTransport?.trim() || 'Use official airport rail/bus links or licensed taxi queue only.';
  const currencySimText =
    currencySimLocations?.trim() || 'Use official SIM and currency counters in arrivals halls.';
  const taxiEstimateText = taxiEstimate?.trim() || 'Taxi cost varies by traffic and terminal queue.';
  const trainEstimateText = trainEstimate?.trim() || 'Rail/bus cost varies by destination zone.';

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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Entry Strategy & Visa Confirmation</p>
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
                key="arrival-pre-land"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Pre-Land Strategy</p>
                  <p className="mt-2 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
                    {balanceText(strategyText)}
                  </p>
                  <p className="mt-2 text-xs md:text-sm tracking-[0.01em] font-semibold text-slate-600 leading-relaxed">
                    {balanceText(`Lane Selection: ${laneText}`)}
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={onMarkLanded}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg"
                >
                  {balanceText(`🛬 I've Landed in ${cityName}!`)}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="arrival-post-land"
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Post-Land Tactical Path
                </p>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Wifi size={16} className="text-blue-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Immediate Survival: Connectivity</p>
                  </div>
                  <p className="mt-2 text-base md:text-lg tracking-[0.01em] font-black text-[#222222]">
                    {balanceText(`SSID: ${wifiSsidText}`)}
                  </p>
                  <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-semibold text-slate-700">
                    {balanceText(`Password: ${wifiPasswordText}`)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-amber-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Immediate Survival: Official Transport</p>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
                    {balanceText(officialTransportText)}
                  </p>
                  <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-semibold text-slate-700 leading-relaxed">
                    {balanceText(taxiEstimateText)}
                  </p>
                  <p className="mt-1 text-xs md:text-sm tracking-[0.01em] font-semibold text-slate-600 leading-relaxed">
                    {balanceText(trainEstimateText)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Currency / SIM Locations</p>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
                    {balanceText(currencySimText)}
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
