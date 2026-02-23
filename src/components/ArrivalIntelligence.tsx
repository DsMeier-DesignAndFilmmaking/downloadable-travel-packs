import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Navigation, Plane, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import SourceInfo from '@/components/SourceInfo';
import CityPulseBlock from '@/components/CityPulseBlock';

type ArrivalIntelligenceProps = {
  citySlug: string;
  cityName: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  hasLanded: boolean;
  isLandedHydrated: boolean;
  visaStatus: string;
  visaLoading: boolean;
  visaError?: string | null;
  digitalEntry?: string;
  preLandStrategy?: string;
  laneSelection?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  officialTransport?: string;
  currencySimLocations?: string;
  taxiEstimate?: string;
  trainEstimate?: string;
  onMarkLanded: () => void;
  onResetStatus: () => void;
};

function balanceText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  const tail = `${words[words.length - 2]}\u00A0${words[words.length - 1]}`;
  return `${words.slice(0, -2).join(' ')} ${tail}`;
}

function InlineRow({
  icon,
  label,
  value,
  bordered = true,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 py-2 ${bordered ? 'border-b border-neutral-100' : ''}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
          {balanceText(value)}
        </p>
      </div>
    </div>
  );
}

export default function ArrivalIntelligence({
  citySlug,
  cityName,
  source,
  lastUpdated,
  isLive,
  hasLanded,
  isLandedHydrated,
  visaStatus,
  visaLoading,
  visaError,
  digitalEntry,
  preLandStrategy,
  laneSelection,
  wifiSsid,
  wifiPassword,
  officialTransport,
  currencySimLocations,
  taxiEstimate,
  trainEstimate,
  onMarkLanded,
  onResetStatus,
}: ArrivalIntelligenceProps) {
  const strategyText =
    preLandStrategy?.trim() ||
    'Confirm entry requirements and keep passport validity, destination address, and onward proof ready before landing.';
  const laneText =
    laneSelection?.trim() ||
    'Use official airport lane signage: eGates only if eligible, otherwise staffed immigration desks.';
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required for this route.';

  const visaStatusText = visaLoading
    ? 'Syncing live visa status...'
    : visaError
      ? 'Live visa feed unavailable. Using cached entry notes.'
      : visaStatus;

  const wifiSsidText = wifiSsid?.trim() || 'Airport Free WiFi';
  const wifiPasswordText = wifiPassword?.trim() || 'Portal login';
  const officialTransportText =
    officialTransport?.trim() || 'Use official airport rail/bus links or licensed taxi queue only.';
  const currencySimText =
    currencySimLocations?.trim() || 'Use official SIM and currency counters in arrivals halls.';
  const taxiEstimateText = taxiEstimate?.trim() || 'Taxi cost varies by traffic and terminal queue.';
  const trainEstimateText = trainEstimate?.trim() || 'Rail/bus cost varies by destination zone.';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Arrival</h2>
        <SourceInfo source={source} lastUpdated={lastUpdated} isLive={isLive} />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.94),rgba(30,41,59,0.82))] p-4 md:p-5 shadow-[0_24px_50px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,0.2),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.2),transparent_45%)]" />
        <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3 px-1">
          <Plane size={20} className="text-cyan-100" />
          <span className="font-black text-cyan-100 text-xs uppercase tracking-widest">Protocols & Strategies</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="wait" initial={false}>
            {!isLandedHydrated ? (
              <motion.div
                key="arrival-loading"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-neutral-200 bg-white p-4"
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
                className="space-y-3"
              >
                <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                  
                  <div className="mt-3 space-y-0.5">
                    <InlineRow
                      icon={<CheckCircle size={14} className="text-emerald-600" />}
                      label="Visa Status"
                      value={visaStatusText}
                    />
                    <InlineRow
                      icon={<Navigation size={14} className="text-amber-600" />}
                      label="Lane Advice"
                      value={laneText}
                    />
                    <InlineRow
                      icon={<Plane size={14} className="text-slate-600" />}
                      label="Entry Strategy"
                      value={strategyText}
                    />
                    <InlineRow
                      icon={<Wifi size={14} className="text-blue-600" />}
                      label="Digital Entry"
                      value={digitalEntryText}
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="relative">
                  <span className="cyber-border-pulse pointer-events-none absolute -inset-1 rounded-2xl border border-cyan-300/55" />
                  <motion.button
                    type="button"
                    onClick={onMarkLanded}
                    whileTap={{ scale: 0.98 }}
                    className="relative inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] backdrop-blur-md"
                  >
                    {balanceText(`I've Landed in ${cityName}!`)}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="arrival-post-land"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Connectivity</p>
                  <div className="mt-3 space-y-0.5">
                    <InlineRow
                      icon={<Wifi size={14} className="text-blue-600" />}
                      label="WiFi SSID"
                      value={wifiSsidText}
                    />
                    <InlineRow
                      icon={<CheckCircle size={14} className="text-emerald-600" />}
                      label="Password"
                      value={wifiPasswordText}
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Transit from Airport</p>
                  <div className="mt-3 space-y-0.5">
                    <InlineRow
                      icon={<Navigation size={14} className="text-amber-600" />}
                      label="Official Route"
                      value={officialTransportText}
                    />
                    <InlineRow
                      icon={<CheckCircle size={14} className="text-emerald-600" />}
                      label="Taxi Estimate"
                      value={taxiEstimateText}
                    />
                    <InlineRow
                      icon={<CheckCircle size={14} className="text-emerald-600" />}
                      label="Train Estimate"
                      value={trainEstimateText}
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Next Steps</p>
                  <div className="mt-3 space-y-0.5">
                    <InlineRow
                      icon={<CheckCircle size={14} className="text-emerald-600" />}
                      label="SIM / ATM Locations"
                      value={currencySimText}
                      bordered={false}
                    />
                  </div>
                </div>

                <CityPulseBlock key={citySlug} citySlug={citySlug} cityName={cityName} hasLanded={hasLanded} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {hasLanded && (
          <div className="mt-3 border-t border-slate-100 px-1 pt-3">
            <button
              type="button"
              onClick={onResetStatus}
              className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100/75 underline underline-offset-2"
            >
              Reset Status
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
