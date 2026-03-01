import { Fragment, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronDown, Navigation, Plane, Wifi, RotateCcw, ArrowUpRight, Train } from 'lucide-react';
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
  safetyIntelligence?: {
    crimeStatsUrl: string;
    crimeStatsSource: string;
  } | null;
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

const MONEY_VALUE_SOURCE = String.raw`(?:[~≈]?(?:US\$|C\$|A\$|CA\$|NZ\$|HK\$|S\$|\$|€|£|¥)\s*\d[\d,.]*(?:\s*-\s*\d[\d,.]*)?)|(?:[~≈]?\d[\d,.]*(?:\s*-\s*\d[\d,.]*)?\s*(?:USD|EUR|GBP|JPY|CNY|THB|AED|KRW|MXN|CAD|AUD|CHF|INR|SGD|HKD|NZD|BRL|TRY|ZAR|SEK|NOK|DKK|PLN|CZK|HUF|RON|ILS|IDR|MYR|PHP|VND|RUB|ARS|CLP|COP|PEN|SAR|QAR|KWD|BHD|OMR|MAD|EGP|TWD))`;
const TIME_VALUE_SOURCE = String.raw`(?:[~≈]?\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours))`;
const MONEY_VALUE_PATTERN = new RegExp(`^${MONEY_VALUE_SOURCE}$`, 'i');
const TRANSIT_VALUE_PATTERN = new RegExp(`${MONEY_VALUE_SOURCE}|${TIME_VALUE_SOURCE}`, 'gi');

function formatTransitSegment(part: string, keyPrefix: string): ReactNode {
  TRANSIT_VALUE_PATTERN.lastIndex = 0;
  const matches = Array.from(part.matchAll(TRANSIT_VALUE_PATTERN));

  if (matches.length === 0) {
    return part;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, matchIndex) => {
    const start = match.index ?? 0;
    const value = match[0];
    const end = start + value.length;

    if (start > cursor) {
      nodes.push(part.slice(cursor, start));
    }

    nodes.push(
      <span
        key={`${keyPrefix}-${matchIndex}`}
        className={MONEY_VALUE_PATTERN.test(value) ? 'font-bold text-emerald-700 tabular-nums' : 'text-slate-700'}
      >
        {value}
      </span>,
    );

    cursor = end;
  });

  if (cursor < part.length) {
    nodes.push(part.slice(cursor));
  }

  return nodes;
}

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
  safetyIntelligence,
}: ArrivalIntelligenceProps) {
  const [airportDropdownOpen, setAirportDropdownOpen] = useState(false);
  const stepIndicatorRef = useRef<HTMLDivElement | null>(null);
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
  const activeProtocolStep = arrivalStage === 'pre-arrival' ? 1 : currentStageIndex;

  const strategyText = preLandStrategy?.trim() || 'Confirm entry requirements and keep passport validity.';
  const laneText = laneSelection?.trim() || 'Use official airport lane signage.';
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required.';
  const wifiSsidText = wifiSsid?.trim() || 'Airport Free WiFi';
  const wifiPasswordText = wifiPassword?.trim() || 'Portal login';
  const officialTransportText = officialTransport?.trim() || 'Use official transport links.';
  const currencySimText = currencySimLocations?.trim() || 'Use official counters in arrivals.';
  const taxiEstimateText = taxiEstimate?.trim() || 'Varies by traffic.';
  const trainEstimateText = trainEstimate?.trim() || 'Varies by zone.';
  const transitEstimates = {
    taxi: taxiEstimateText,
    rail: trainEstimateText,
  };

  // Handling visa status for display
  const displayVisaStatus = visaLoading 
    ? "Checking entry protocols..." 
    : visaError 
    ? "Standard visa rules apply" 
    : visaStatus;
  const scrollToStepIndicator = () => {
    requestAnimationFrame(() => {
      stepIndicatorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleConfirmArrival = () => {
    onConfirmArrival();
    scrollToStepIndicator();
  };

  const handleMarkLanded = () => {
    onMarkLanded();
    scrollToStepIndicator();
  };

  const handleProceedToCity = () => {
    onProceedToCity();
    scrollToStepIndicator();
  };

  const handleResetStatus = () => {
    onResetStatus();
    scrollToStepIndicator();
  };

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
                
                <div className="grid grid-cols-1 gap-2 text-sm text-cyan-100/90">
                  <p>
                    <span className="font-semibold">Transport:</span>{' '}
                    {airportArrivalInfo.transport.join(', ')}
                  </p>
                  <p>
                    <span className="font-semibold">Travel time to city center:</span>{' '}
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

            <div
              ref={stepIndicatorRef}
              className="mb-6 scroll-mt-4"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-500">
                <span>Arrival Protocol</span>
                <span>Stage {activeProtocolStep} of {totalStages}</span>
              </div>
              <div className="mt-3 flex items-center">
                {[1, 2, 3].map((step) => {
                  const isCompleted = step < activeProtocolStep;
                  const isActive = step === activeProtocolStep;

                  return (
                    <Fragment key={step}>
                      <span
                        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted
                            ? 'bg-blue-600 text-white'
                            : isActive
                              ? 'border-2 border-blue-600 text-blue-600 bg-white'
                              : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                      {step < totalStages && (
                        <span
                          className={`mx-2 h-[2px] flex-1 ${
                            step < activeProtocolStep ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <motion.div
              layout
              className="relative min-h-[65vh] overflow-hidden"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {arrivalStage === 'pre-arrival' && (
                  <motion.div
                    key="pre-arrival"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                      <div className="space-y-4">
                        <h2 className="text-md font-bold text-slate-800">Welcome to {cityName}</h2>
                        <div>
                          <p className="text-sm text-slate-600 opacity-80 leading-relaxed">
                            Tap below once you&apos;ve landed to begin guided arrival.
                          </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-200">
                          <motion.button
                            type="button"
                            onClick={handleConfirmArrival}
                            whileTap={{ scale: 0.98 }}
                            className="w-full rounded-xl bg-blue-600 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg transition-all duration-150 ease-out hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Confirm Arrival
                          </motion.button>
                        </div>
                      </div>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="mt-5 py-2 text-xs text-slate-500 text-center leading-relaxed"
                    >
                      Tap "Confirm Arrival" to start your Arrival Support Flow
                    </motion.p>
                  </motion.div>
                )}

                {arrivalStage === 'entry-immigration' && (
                  <motion.div
                    key="stage-1"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">Immigration Checkpoint</p>
                          <p className="text-sm text-slate-600 opacity-80 leading-relaxed">
                            Confirm lane assignment and digital-entry readiness before moving to airport exit.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="Visa Requirement" value={displayVisaStatus} />
                          <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Lane Advice" value={laneText} />
                          <InlineRow icon={<Plane size={14} className="text-slate-600" />} label="Entry Strategy" value={strategyText} />
                          <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label="Digital Entry" value={digitalEntryText} bordered={false} />
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-200">
                          <motion.button
                            onClick={handleMarkLanded}
                            whileTap={{ scale: 0.98 }}
                            className="w-full rounded-xl bg-blue-600 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg transition-all duration-150 ease-out hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            I've Cleared Customs!
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {arrivalStage === 'airport-exit' && (
                  <motion.div
                    key="stage-2"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                      <div className="space-y-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Exit Strategy</p>
                        <ul className="space-y-4">
                          <li className="flex items-start gap-3">
                            <Plane size={14} className="mt-1 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Terminal</p>
                              <p className="text-sm text-slate-700 opacity-80 leading-relaxed text-balance break-words">
                                Verify your terminal: T1 (Inter) vs T2 (Aeromexico). The shuttle between them takes 15+ minutes.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <Wifi size={14} className="mt-1 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Handshake</p>
                              <p className="text-sm text-slate-700 opacity-80 leading-relaxed text-balance break-words">
                                Finalize your ride on airport Wi‑Fi before exiting. LTE/5G is unstable in the pickup lanes.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <Navigation size={14} className="mt-1 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Pickup</p>
                              <p className="text-sm text-slate-700 opacity-80 leading-relaxed text-balance break-words">
                                T1: Exit Gate 7, outer lane. T2: Ground Floor, follow &quot;Transporte por Aplicación&quot; signage.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle size={14} className="mt-1 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Resilience</p>
                              <p className="text-sm text-slate-700 opacity-80 leading-relaxed text-balance break-words">
                                Ignore solicitations in the hall. Use pre‑booked apps or &quot;Taxi Autorizado&quot; kiosks only.
                              </p>
                            </div>
                          </li>
                        </ul>
                      </div>
                      <div className="mt-4 space-y-1">
                      <InlineRow 
                        icon={<Wifi size={14} className="text-blue-600" />} 
                        label={`WiFi: ${wifiSsidText}`} 
                        value={`Password: ${wifiPasswordText}`} 
                      />
                                          <div className="flex flex-col gap-3">
                        <InlineRow 
                          icon={<Navigation size={14} className="text-amber-600" />} 
                          label="Official Transport" 
                          bordered={false} // This removes the bottom border
                          value={(
                            <div className="flex flex-col gap-3 w-full">
                              {/* The Text Description */}
                              <span className="text-sm text-slate-700 leading-relaxed">
                                {officialTransportText}
                              </span>

                              {/* The Nested Button Link */}
                              <a 
                                href={officialTransportText.includes('AIFA') 
                                  ? "https://www.google.com/maps/dir/AIFA,+Aeropuerto+Internacional+Felipe+%C3%81ngeles,+Zumpango+de+Ocampo,+Edo.+de+M%C3%A9xico/Buenavista,+CDMX" 
                                  : "https://www.google.com/maps/dir/AICM,+Aeropuerto+Internacional+Benito+Ju%C3%A1rez,+CDMX/Z%C3%B3calo,+Centro+Hist%C3%B3rico,+CDMX"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl transition-all active:scale-[0.98] group"
                              >
                                <div className="flex items-center gap-3 text-left">
                                  <div className="bg-amber-100 p-2 rounded-lg text-amber-700 shadow-sm">
                                    <Train size={16} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
                                      Transit Route
                                    </p>
                                    <p className="text-xs font-bold text-slate-700">
                                      {officialTransportText.includes('AIFA') ? 'Tren Suburbano to Center' : 'Metro Line 5 to Center'}
                                    </p>
                                  </div>
                                </div>
                                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                              </a>
                              </div>
                          )} 
                        />
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100"> {/* Added global top margin, padding, and border */}
                      <InlineRow
                        icon={<CheckCircle size={14} className="text-emerald-600" />}
                        label="Transit Estimates"
                        value={
                          (() => {
                            const pipe = ' | ';
                            const taxiEstimateRaw = transitEstimates.taxi;
                            const railEstimateRaw = transitEstimates.rail;
                            const taxiColon = taxiEstimateRaw.indexOf(':');
                            const taxiValueRaw = taxiColon >= 0 ? taxiEstimateRaw.slice(taxiColon + 1).trim() : taxiEstimateRaw;
                            const taxiBefore = taxiColon >= 0 ? taxiEstimateRaw.slice(0, taxiColon).trim() : '';
                            const taxiMiddle = taxiBefore.replace(/^Taxi\s*\/?\s*/i, '').trim() || null;
                            
                            const trainColon = railEstimateRaw.indexOf(':');
                            const trainValueRaw = trainColon >= 0 ? railEstimateRaw.slice(trainColon + 1).trim() : railEstimateRaw;

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
                                              <span key={i} className="text-sm text-slate-700">
                                                {part}
                                              </span>
                                            );
                                          }
                                          return (
                                            <span key={i} className="text-sm text-slate-700">
                                              {formatTransitSegment(part, `${idx}-${i}`)}
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
          <div className="mt-4 grid grid-cols-1 gap-y-5 sm:grid-cols-[140px_1fr] sm:gap-x-8 sm:gap-y-8">  
                        {/* --- TAXI GROUP --- */}
                        <div className="flex items-center gap-2 self-start pt-1 px-1 sm:pt-0 sm:flex-col sm:items-start sm:gap-0.5">                          <span className="font-black uppercase tracking-wider text-slate-900 text-[14px] sm:text-xs">
                            Taxi
                          </span>
                          <span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">
                            {taxiMiddle ?? 'to center'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Taxi Data */}
                          <div className="text-[14px] sm:text-sm text-slate-700 leading-relaxed pl-1 sm:pl-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap sm:mb-0">
                            cost
                          </span>
                            {formatValue(taxiValueRaw)}
                          </div>

                          {/* Primary Transit App Chips - Indented on mobile for hierarchy */}
                          <div className="flex flex-wrap gap-2 pt-1 ml-1 sm:ml-0">
                            <p className="w-full text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">
                              App Shortcuts
                            </p>
                            
                            <a 
                              href="uber://?action=setPickup&pickup=my_location" 
                              className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-slate-800 active:scale-95 shadow-sm"
                            >
                              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <span className="text-black text-[8px] font-black">U</span>
                              </div>
                              Uber
                            </a>

                            <a 
                              href="didi://" 
                              className="flex items-center gap-2 bg-[#ff8d00] text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-[#e67e00] active:scale-95 shadow-sm"
                            >
                              <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center font-black text-[10px]">D</div>
                              DiDi
                            </a>

                            <a 
                              href="citymapper://directions?endcoord=19.4326,-99.1332" 
                              className="flex items-center gap-2 bg-[#28d172] text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-[#22b361] active:scale-95 shadow-sm"
                            >
                              <Navigation size={12} fill="white" className="opacity-90" />
                              Citymapper
                            </a>
                          </div>
                        </div>

                        {/* --- DIVIDER (Visible on Mobile, hidden on SM Grid) --- */}
                        <div className="sm:hidden border-t border-slate-100 mx-1" />

                        {/* --- RAIL GROUP --- */}
                        <div className="flex items-center gap-2 self-start pt-1 px-1">
                          <span className="font-black uppercase tracking-wider text-slate-900 text-[14px] sm:text-xs">
                            Rail
                          </span>
                          <span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">
                            to zones
                          </span>
                        </div>

                        <div className="space-y-4 pb-6 sm:pb-8">
                          {/* Rail Data */}
                          <div className="text-[14px] sm:text-sm text-slate-700 leading-relaxed pl-1 sm:pl-0">
                          <span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">
                            cost
                          </span>
                            {formatValue(trainValueRaw)}
                          </div>
                          
                          {/* Note: The Transit Route button from previous step would go here */}
                        </div>
                      </div>
                              );
                            })()
                          }
                        />
                        </div>
                        <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="SIM / Currency" value={currencySimText} bordered={false} />
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <motion.button
                          onClick={handleProceedToCity}
                          whileTap={{ scale: 0.98 }}
                          className="w-full rounded-xl bg-blue-600 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg transition-all duration-150 ease-out hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          I've Left the Airport
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {arrivalStage === 'left-airport' && (
                  <motion.div
                    key="stage-3"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          CITY DYNAMICS & NEIGHBORHOOD INTELLIGENCE
                        </p>
                        <div>
                          
                          <p className="text-sm text-slate-600 opacity-80 leading-relaxed">
                            Understand the social layout before committing time or money.
                          </p>
                        </div>
                        <div className="space-y-1">
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
                          {/* Only render if the safety_intelligence data exists in your pack */}
                          {safetyIntelligence && (
  <div className="ml-5 mt-1.5 pb-3">
    <a 
      href={safetyIntelligence.crimeStatsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group shadow-sm"
    >
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 leading-none">
            Official Intelligence
          </span>
        </div>
        <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
          {cityName} Crime Data Portal
          <ArrowUpRight size={14} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
        </span>
      </div>
    </a>
    <p className="text-[10px] text-slate-400 italic mt-2 px-1 leading-tight">
      Source: {safetyIntelligence.crimeStatsSource}
    </p>
  </div>
)}
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* BOTTOM LEFT RESET STATUS */}
          {(arrivalStage === 'airport-exit' || arrivalStage === 'left-airport') && (
            <div className="mt-3 border-t border-slate-100/10 px-1 pt-3">
              <motion.button
                type="button"
                onClick={handleResetStatus}
                whileTap={{ scale: 0.98 }}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100/75 underline underline-offset-2 transition-colors duration-150 ease-out hover:text-cyan-100 active:text-cyan-200"
              >
                Reset Status
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
