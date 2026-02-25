import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Navigation, Plane, Wifi, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import SourceInfo from '@/components/SourceInfo';
import CityPulseBlock from '@/components/CityPulseBlock';

// --- TYPES & HELPERS ---

type ArrivalStage = 'immigration' | 'airport-exit' | 'left-airport';

type ArrivalIntelligenceProps = {
  citySlug: string;
  cityName: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  hasLanded: boolean;
  arrivalStage: ArrivalStage;
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
  onProceedToCity: () => void;
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

// --- MAIN COMPONENT ---

export default function ArrivalIntelligence({
  citySlug,
  cityName,
  source,
  lastUpdated,
  isLive,
  hasLanded,
  arrivalStage,
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
  onProceedToCity,
  onResetStatus,
}: ArrivalIntelligenceProps) {
  const immigrationRef = useRef<HTMLDivElement | null>(null);

  const stageOrder: ArrivalStage[] = [
    'immigration',
    'airport-exit',
    'left-airport',
  ];
  const currentStageIndex = stageOrder.indexOf(arrivalStage) + 1;
  const totalStages = stageOrder.length;

  useEffect(() => {
    if (arrivalStage !== 'immigration') return;

    const handleScroll = () => {
      if (!immigrationRef.current) return;
      const rect = immigrationRef.current.getBoundingClientRect();
      if (rect.bottom < window.innerHeight * 0.6) {
        onMarkLanded();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [arrivalStage, onMarkLanded]);

  const strategyText = preLandStrategy?.trim() || 'Confirm entry requirements and keep passport validity.';
  const laneText = laneSelection?.trim() || 'Use official airport lane signage.';
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required.';
  const wifiSsidText = wifiSsid?.trim() || 'Airport Free WiFi';
  const wifiPasswordText = wifiPassword?.trim() || 'Portal login';
  const officialTransportText = officialTransport?.trim() || 'Use official transport links.';
  const currencySimText = currencySimLocations?.trim() || 'Use official counters in arrivals.';
  const taxiEstimateText = taxiEstimate?.trim() || 'Varies by traffic.';
  const trainEstimateText = trainEstimate?.trim() || 'Varies by zone.';

  // Handling visa status for display
  const displayVisaStatus = visaLoading 
    ? "Checking entry protocols..." 
    : visaError 
    ? "Standard visa rules apply" 
    : visaStatus;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Arrival & Orientation</h2>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.94),rgba(30,41,59,0.82))] p-4 md:p-5 shadow-[0_24px_50px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,0.2),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.2),transparent_45%)]" />
        
        <div className="relative z-10">
          <div className="space-y-3">
            
            {/* Header: Headline + Source inline, Reset Button top-right */}
            <div className="mb-4 flex items-start justify-between gap-4 px-1">
              <div className="flex items-center gap-3 min-w-0">
                <Plane size={20} className="text-cyan-100 shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-cyan-100 text-xs uppercase tracking-widest whitespace-nowrap">
                    {arrivalStage === 'immigration'
                      ? 'Entry & Immigration'
                      : arrivalStage === 'airport-exit'
                        ? 'Airport Exit'
                        : `En Route to ${cityName}`}
                  </span>
                  <SourceInfo source={source} lastUpdated={lastUpdated} isLive={isLive} />
                </div>
              </div>

              {/* TOP RIGHT RESET BUTTON */}
              {arrivalStage !== 'immigration' && (
                <button
                  type="button"
                  onClick={onResetStatus}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-100 transition-colors hover:bg-white/20 active:scale-95 shrink-0"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-cyan-100/70">
              <span className="uppercase tracking-[0.14em]">
                Stage {currentStageIndex} of {totalStages}
              </span>
              <div className="flex items-center gap-1">
                {stageOrder.map((_, index) => (
                  <span
                    key={index}
                    className={
                      index + 1 <= currentStageIndex
                        ? 'h-1.5 w-6 rounded-full bg-cyan-300'
                        : 'h-1.5 w-6 rounded-full bg-cyan-300/30'
                    }
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {!isLandedHydrated && (
                <motion.div key="loading" className="rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-500 animate-pulse">Syncing arrival status...</p>
                </motion.div>
              )}

              {arrivalStage === 'immigration' && (
                <div ref={immigrationRef}>
                  <motion.div key="stage-1" className="space-y-3">
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                      <div className="mt-3 space-y-0.5">
                        <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="Visa Requirement" value={displayVisaStatus} />
                        <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Lane Advice" value={laneText} />
                        <InlineRow icon={<Plane size={14} className="text-slate-600" />} label="Entry Strategy" value={strategyText} />
                        <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label="Digital Entry" value={digitalEntryText} bordered={false} />
                      </div>
                    </div>
                    <motion.button
                      onClick={onMarkLanded}
                      whileTap={{ scale: 0.98 }}
                      className="h-12 w-full rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg"
                    >
                      I've Cleared Customs!
                    </motion.button>
                  </motion.div>
                </div>
              )}

              {(arrivalStage === 'airport-exit' || arrivalStage === 'left-airport') && (
                <motion.div key="stage-2-3" className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  {arrivalStage === 'airport-exit' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">GROUND ORIENTATION</p>
                        <div className="mt-3 space-y-1">
                          <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label={`WiFi: ${wifiSsidText}`} value={`Pass: ${wifiPasswordText}`} />
                          <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Official Transport" value={officialTransportText} />
                          <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="Transit Estimates" value={`Taxi: ${taxiEstimateText} • Train: ${trainEstimateText}`} />
                          <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="SIM / Currency" value={currencySimText} bordered={false} />
                        </div>
                      </div>
                      <motion.button
                        onClick={onProceedToCity}
                        whileTap={{ scale: 0.98 }}
                        className="h-12 w-full rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-[11px] font-black uppercase tracking-[0.14em] text-white"
                      >
                        I've Left the Airport
                      </motion.button>
                    </div>
                  )}

                  {arrivalStage === 'left-airport' && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        CITY DYNAMICS & NEIGHBORHOOD INTELLIGENCE
                      </p>
                      <p className="mt-1 text-xs text-slate-500 font-medium">
                        Understand the social layout before committing time or money.
                      </p>
                      <div className="mt-3 space-y-0.5">
                        <InlineRow
                          icon={<CheckCircle size={14} className="text-emerald-600" />}
                          label="Tourist Clusters"
                          value="High-traffic zones with elevated pricing."
                        />
                        <InlineRow
                          icon={<CheckCircle size={14} className="text-emerald-600" />}
                          label="Local Districts"
                          value="Primarily residential and culturally authentic."
                        />
                        <InlineRow
                          icon={<CheckCircle size={14} className="text-emerald-600" />}
                          label="Feels Unsafe vs Is Unsafe"
                          value="Differentiate perception from crime statistics."
                        />
                        <InlineRow
                          icon={<CheckCircle size={14} className="text-emerald-600" />}
                          label="Gentrified vs Historic"
                          value="Recently commercialized vs culturally rooted areas."
                          bordered={false}
                        />
                      </div>
                      <div className="mt-4 pt-3 border-t border-neutral-100">
                        <CityPulseBlock citySlug={citySlug} cityName={cityName} hasLanded={hasLanded} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BOTTOM LEFT RESET STATUS */}
          {(arrivalStage === 'airport-exit' || arrivalStage === 'left-airport') && (
            <div className="mt-3 border-t border-slate-100/10 px-1 pt-3">
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