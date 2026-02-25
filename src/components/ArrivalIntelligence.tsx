import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronDown, Navigation, Plane, Wifi, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import SourceInfo from '@/components/SourceInfo';
import CityPulseBlock from '@/components/CityPulseBlock';
import type { AirportArrivalInfo } from '@/data/multiAirport';

// --- TYPES & HELPERS ---

type ArrivalStage =
  | 'pre-arrival'
  | 'entry-immigration'
  | 'airport-exit'
  | 'left-airport';

type ArrivalIntelligenceProps = {
  citySlug: string;
  cityName: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  hasLanded: boolean;
  arrivalStage: ArrivalStage;
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
  onConfirmArrival: () => void;
  onMarkLanded: () => void;
  onProceedToCity: () => void;
  onResetStatus: () => void;
  /** Multi-airport: selected code (e.g. MEX, TLC, NLU) */
  selectedAirportCode?: string;
  /** Multi-airport: dynamic arrival content for selected airport */
  airportArrivalInfo?: AirportArrivalInfo;
  /** Multi-airport: options for dropdown */
  airportOptions?: { code: string; name: string; distanceToCenter?: string }[];
  /** Multi-airport: called when user changes airport from dropdown */
  onAirportChange?: (code: string) => void;
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
  value: ReactNode; 
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 py-2 ${bordered ? 'border-b border-neutral-100' : ''}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        {/* font-normal base allows our nested bolds to stand out */}
        <div className="mt-0.5 text-sm md:text-[15px] tracking-[0.01em] font-normal text-[#222222] leading-relaxed">
          {typeof value === 'string' ? balanceText(value) : value}
        </div>
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
  onConfirmArrival,
  onMarkLanded,
  onProceedToCity,
  onResetStatus,
  selectedAirportCode,
  airportArrivalInfo,
  airportOptions,
  onAirportChange,
}: ArrivalIntelligenceProps) {
  const [airportDropdownOpen, setAirportDropdownOpen] = useState(false);
  const progressStageOrder: ArrivalStage[] = [
    'entry-immigration',
    'airport-exit',
    'left-airport',
  ];
  const currentStageIndex =
    arrivalStage === 'pre-arrival'
      ? 0
      : progressStageOrder.indexOf(arrivalStage) + 1;
  const totalStages = progressStageOrder.length;

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
            {/* Multi-airport: Arrival info for {code} + dropdown */}
            {selectedAirportCode && airportOptions && airportOptions.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-cyan-100/90">
                  Arrival info for 
                </p>
                {onAirportChange && airportOptions.length > 1 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAirportDropdownOpen((o) => !o)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-200/40 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-100"
                    >
                      {selectedAirportCode}
                      <ChevronDown size={12} className={airportDropdownOpen ? 'rotate-180' : ''} />
                    </button>
                    {airportDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          aria-hidden
                          onClick={() => setAirportDropdownOpen(false)}
                        />
                        <ul className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          {airportOptions.map((opt) => (
                            <li key={opt.code}>
                              <button
                                type="button"
                                onClick={() => {
                                  onAirportChange(opt.code);
                                  setAirportDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-medium ${
                                  opt.code === selectedAirportCode
                                    ? 'bg-cyan-50 text-cyan-800'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {opt.code} — {opt.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Airport-specific summary card when multi-airport */}
            {airportArrivalInfo && (
              <div className="rounded-xl border border-cyan-200/30 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/80 mb-2">
                  {selectedAirportCode} — Quick intel
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-cyan-100/90">
                  <p>
                    <span className="font-semibold">Transport:</span>{' '}
                    {airportArrivalInfo.transport.join(', ')}
                  </p>
                  <p>
                    <span className="font-semibold">Travel time to center:</span>{' '}
                    ~{airportArrivalInfo.travelTimeMinutes} min
                  </p>
                  {airportArrivalInfo.tips.length > 0 && (
                    <p>
                      <span className="font-semibold">Tips:</span>{' '}
                      {airportArrivalInfo.tips.join(' • ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4">
            {/* Header: headline + SourceInfo left (Pre-Arrival alignment); Refresh right; items-center for vertical alignment. */}
            <div className="flex items-center justify-between gap-3 mb-4">
              {/* Left: headline and SourceInfo in one row */}
              {/* Left: headline and SourceInfo in one row */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="font-black text-cyan-100 text-[12px] uppercase tracking-[0.15em] leading-snug break-words line-clamp-2 sm:text-sm">
                  {arrivalStage === 'pre-arrival'
                    ? 'Pre-Arrival'
                    : arrivalStage === 'entry-immigration'
                      ? 'Entry & Immigration'
                      : arrivalStage === 'airport-exit'
                        ? 'Airport Exit'
                        : `En Route to ${cityName}`}
                </span>
                <SourceInfo source={source} lastUpdated={lastUpdated} isLive={isLive} />
              </div>

              {/* Right: Refresh button only */}
              <div className="flex shrink-0 items-center">
                {arrivalStage !== 'pre-arrival' && (
                  <button
                    type="button"
                    onClick={onResetStatus}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-2 min-h-[44px] text-[10px] font-black uppercase tracking-wider text-cyan-100 transition-colors hover:bg-white/20 active:scale-95 sm:px-3 sm:py-1.5 sm:min-h-0"
                    aria-label="Refresh arrival status"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                )}
              </div>
            </div>
            </div>

            {arrivalStage !== 'pre-arrival' && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-cyan-100/70">
                <span className="uppercase tracking-[0.14em]">
                  Stage {currentStageIndex} of {totalStages}
                </span>
                <div className="flex items-center gap-1">
                  {progressStageOrder.map((_, index) => (
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
            )}

            <AnimatePresence mode="wait" initial={false}>
              {arrivalStage === 'pre-arrival' && (
                <motion.div key="pre-arrival" className="space-y-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                    <h2 className="text-md font-bold text-slate-800">Welcome to {cityName}</h2>
                    <p className="mt-2 text-xs text-slate-500">
                      Tap below once you&apos;ve landed to begin guided arrival.
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={onConfirmArrival}
                    whileTap={{ scale: 0.98 }}
                    className="h-12 w-full rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg"
                  >
                    Confirm Arrival
                  </motion.button>
                </motion.div>
              )}

              {arrivalStage === 'entry-immigration' && (
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
              )}

              {arrivalStage === 'airport-exit' && (
                <motion.div key="stage-2" className="space-y-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">GROUND ORIENTATION</p>
                    <div className="mt-3 space-y-1">
                      <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label={`WiFi: ${wifiSsidText}`} value={`Password: ${wifiPasswordText}`} />
                      <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Official Transport" value={officialTransportText} />
                      <InlineRow
  icon={<CheckCircle size={14} className="text-emerald-600" />}
  label="Transit Estimates"
  value={
    (() => {
      const pipe = ' | ';
      const taxiColon = taxiEstimateText.indexOf(':');
      const taxiValueRaw = taxiColon >= 0 ? taxiEstimateText.slice(taxiColon + 1).trim() : taxiEstimateText;
      const taxiBefore = taxiColon >= 0 ? taxiEstimateText.slice(0, taxiColon).trim() : '';
      const taxiMiddle = taxiBefore.replace(/^Taxi\s*\/?\s*/i, '').trim() || null;
      
      const trainColon = trainEstimateText.indexOf(':');
      const trainValueRaw = trainColon >= 0 ? trainEstimateText.slice(trainColon + 1).trim() : trainEstimateText;

      const formatValue = (val: string) => {
        const modes = val.split(pipe);
        return (
          <div className="flex flex-col gap-1"> 
            {modes.map((mode, idx) => {
              const parts = mode.trim().split(/(\(.*?\))/g);
              return (
                <div key={idx} className="flex flex-wrap items-center gap-x-1.5 justify-start">
                  {parts.map((part, i) => {
                    if (part.startsWith('(') && part.endsWith(')')) {
                      return (
                        <span key={i} className="text-orange-600 font-black text-[10px] uppercase tracking-tight">
                          {part}
                        </span>
                      );
                    }
                    return (
                      <span key={i} className="font-bold text-slate-900 tabular-nums">
                        {part}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      };

      return (
        /* grid-cols-1 on mobile, 2 columns on desktop with fixed label width */
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr] sm:gap-y-3 sm:gap-x-2">
          
          {/* Taxi Label */}
          <div className="flex items-center gap-1.5 self-start pt-0.5">
            <span className="font-black uppercase tracking-wider text-slate-900 text-[11px] sm:text-xs">
              Taxi
            </span>
            <span className="text-slate-500 italic text-[11px] whitespace-nowrap">
              {taxiMiddle ?? 'to center'}
            </span>
          </div>
          {/* Taxi Data */}
          <div className="text-sm">
            {formatValue(taxiValueRaw)}
          </div>

          {/* Rail Label */}
          <div className="flex items-center gap-1.5 self-start pt-0.5">
            <span className="font-black uppercase tracking-wider text-slate-900 text-[11px] sm:text-xs">
              Rail
            </span>
            <span className="text-slate-500 italic text-[11px] whitespace-nowrap">
              to zones
            </span>
          </div>
          {/* Rail Data */}
          <div className="text-sm">
            {formatValue(trainValueRaw)}
          </div>

        </div>
      );
    })()
  }
/>
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
                </motion.div>
              )}

              {arrivalStage === 'left-airport' && (
                <motion.div key="stage-3" className="space-y-3">
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