import { Fragment, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronDown, Navigation, Plane, Wifi, ArrowUpRight, Train, RotateCcw, Map, Clock, Utensils } from 'lucide-react';
import type { ReactNode } from 'react';
import CityPulseBlock from '@/components/CityPulseBlock';
import type { AirportArrivalInfo } from '@/data/multiAirport';
import { trackTouristZoneMapOpened, trackLocalAlternativeClicked } from '@/lib/analytics';

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
  selectedAirportCode?: string;
  airportArrivalInfo?: AirportArrivalInfo;
  airportOptions?: { code: string; name: string; distanceToCenter?: string }[];
  onAirportChange?: (code: string) => void;
  coordinates?: { lat: number; lng: number };
};

const MONEY_VALUE_SOURCE = String.raw`(?:[~≈]?(?:US\$|C\$|A\$|CA\$|NZ\$|HK\$|S\$|\$|€|£|¥)\s*\d[\d,.]*(?:\s*-\s*\d[\d,.]*)?)|(?:[~≈]?\d[\d,.]*(?:\s*-\s*\d[\d,.]*)?\s*(?:USD|EUR|GBP|JPY|CNY|THB|AED|KRW|MXN|CAD|AUD|CHF|INR|SGD|HKD|NZD|BRL|TRY|ZAR|SEK|NOK|DKK|PLN|CZK|HUF|RON|ILS|IDR|MYR|PHP|VND|RUB|ARS|CLP|COP|PEN|SAR|QAR|KWD|BHD|OMR|MAD|EGP|TWD))`;
const TIME_VALUE_SOURCE = String.raw`(?:[~≈]?\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours))`;
const MONEY_VALUE_PATTERN = new RegExp(`^${MONEY_VALUE_SOURCE}$`, 'i');
const TRANSIT_VALUE_PATTERN = new RegExp(`${MONEY_VALUE_SOURCE}|${TIME_VALUE_SOURCE}`, 'gi');

function formatTransitSegment(part: string, keyPrefix: string): ReactNode {
  TRANSIT_VALUE_PATTERN.lastIndex = 0;
  const matches = Array.from(part.matchAll(TRANSIT_VALUE_PATTERN));
  if (matches.length === 0) return part;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, matchIndex) => {
    const start = match.index ?? 0;
    const value = match[0];
    const end = start + value.length;
    if (start > cursor) nodes.push(part.slice(cursor, start));
    nodes.push(
      <span key={`${keyPrefix}-${matchIndex}`} className={MONEY_VALUE_PATTERN.test(value) ? 'font-bold text-emerald-700 tabular-nums' : 'text-slate-700'}>
        {value}
      </span>,
    );
    cursor = end;
  });
  if (cursor < part.length) nodes.push(part.slice(cursor));
  return nodes;
}

function balanceText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  return `${words.slice(0, -2).join(' ')} ${words[words.length - 2]}\u00A0${words[words.length - 1]}`;
}

function InlineRow({ icon, label, value, bordered = true }: { icon: ReactNode; label: string; value: ReactNode; bordered?: boolean; }) {
  return (
    <div className={`flex items-start gap-2 py-2 ${bordered ? 'border-b border-neutral-100' : ''}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div className="mt-0.5 text-sm md:text-[15px] tracking-[0.01em] font-normal text-[#222222] leading-relaxed">
          {typeof value === 'string' ? balanceText(value) : value}
        </div>
      </div>
    </div>
  );
}

// --- TOURIST CLUSTER ACTION BUTTONS ---

function TouristClusterActions({ cityName, coordinates }: { cityName: string; coordinates?: { lat: number; lng: number } }) {
  const lat = coordinates?.lat ?? 0;
  const lng = coordinates?.lng ?? 0;

  // Google Maps tourist areas search centered on city
  const touristMapUrl = `https://www.google.com/maps/search/tourist+attractions/@${lat},${lng},14z`;

  // Google Maps search for local/authentic restaurants away from tourist zones
  const localAlternativesUrl = `https://www.google.com/maps/search/local+restaurants+authentic/@${lat},${lng},15z`;

  // Google Maps popular times — links to the city center to surface peak hour data
  const peakHoursUrl = `https://www.google.com/maps/place/${encodeURIComponent(cityName)}/@${lat},${lng},14z`;

  return (
    <div className="ml-5 mt-2 mb-1 flex flex-col gap-2">
      {/* Row 1: Tourist Zone Map + Peak Hours */}
      <div className="flex flex-wrap gap-2">
        <a
          href={touristMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTouristZoneMapOpened(cityName)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all group"
        >
          <Map size={13} className="text-blue-500 shrink-0" />
          See Tourist Zone Map
          <ArrowUpRight size={11} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </a>

        <a
          href={peakHoursUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all group"
        >
          <Clock size={13} className="text-amber-500 shrink-0" />
          Avoid Peak Hours
          <ArrowUpRight size={11} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
        </a>
      </div>

      {/* Row 2: Find Local Alternatives */}
      <a
        href={localAlternativesUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackLocalAlternativeClicked(cityName)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 active:scale-95 transition-all group w-fit"
      >
        <Utensils size={13} className="text-emerald-600 shrink-0" />
        Find Local Alternatives
        <ArrowUpRight size={11} className="text-emerald-400 group-hover:text-emerald-600 transition-colors" />
      </a>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ArrivalIntelligence({
  citySlug, cityName, arrivalStage, visaStatus, visaLoading, visaError, digitalEntry,
  preLandStrategy, laneSelection, wifiSsid, wifiPassword, officialTransport,
  taxiEstimate, trainEstimate, onConfirmArrival, onMarkLanded, onProceedToCity, onResetStatus,
  selectedAirportCode, airportOptions, onAirportChange, safetyIntelligence, coordinates,
}: ArrivalIntelligenceProps) {
  const [airportDropdownOpen, setAirportDropdownOpen] = useState(false);
  const stepIndicatorRef = useRef<HTMLDivElement | null>(null);

  const strategyText = preLandStrategy?.trim() || 'Confirm entry requirements.';
  const laneText = laneSelection?.trim() || 'Use official airport lane signage.';
  const digitalEntryText = digitalEntry?.trim() || 'No digital arrival card required.';
  const wifiSsidText = wifiSsid?.trim() || 'Airport Free WiFi';
  const wifiPasswordText = wifiPassword?.trim() || 'Portal login';
  const officialTransportText = officialTransport?.trim() || 'Use official transport links.';
  const transitEstimates = { taxi: taxiEstimate?.trim() || 'Varies.', rail: trainEstimate?.trim() || 'Varies.' };

  const displayVisaStatus = visaLoading ? "Checking protocols..." : visaError ? "Standard rules apply" : visaStatus;

  const handleConfirmArrival = () => {
    onConfirmArrival();
    requestAnimationFrame(() => stepIndicatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleMarkLanded = () => {
    onMarkLanded();
    requestAnimationFrame(() => stepIndicatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleProceedToCity = () => {
    onProceedToCity();
    requestAnimationFrame(() => stepIndicatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleReset = () => {
    onResetStatus();
    requestAnimationFrame(() => stepIndicatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const progressStageOrder: ArrivalStage[] = ['entry-immigration', 'airport-exit', 'left-airport'];
  const activeProtocolStep = arrivalStage === 'pre-arrival' ? 1 : progressStageOrder.indexOf(arrivalStage) + 1;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Arrival & Orientation</h2>
        {arrivalStage !== 'pre-arrival' && (
          <button onClick={handleReset} className="p-2 -mr-2 text-slate-400 hover:text-blue-500 transition-colors" title="Reset Status">
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.94),rgba(30,41,59,0.82))] p-4 md:p-5 shadow-[0_24px_50px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,0.2),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.2),transparent_45%)]" />
        
        <div className="relative z-10">
          <div className="space-y-3">
            {selectedAirportCode && airportOptions && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-cyan-100/90">Arrival info for</p>
                <div className="relative">
                  <button onClick={() => setAirportDropdownOpen(!airportDropdownOpen)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-200/40 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-cyan-100">
                    {selectedAirportCode} <ChevronDown size={12} />
                  </button>
                  {airportDropdownOpen && (
                    <ul className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {airportOptions.map((opt) => (
                        <li key={opt.code}>
                          <button onClick={() => { onAirportChange?.(opt.code); setAirportDropdownOpen(false); }} className={`w-full px-3 py-2 text-left text-xs ${opt.code === selectedAirportCode ? 'bg-cyan-50 text-cyan-800' : 'text-slate-700'}`}>
                            {opt.code} — {opt.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div ref={stepIndicatorRef} className="mb-6 mt-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                <span>Arrival Protocol</span>
                <span>Stage {activeProtocolStep} of 3</span>
              </div>
              <div className="mt-3 flex items-center">
                {[1, 2, 3].map((step) => (
                  <Fragment key={step}>
                    <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${step < activeProtocolStep ? 'bg-blue-600 text-white' : step === activeProtocolStep ? 'border-2 border-blue-600 text-blue-600 bg-white' : 'bg-slate-700 text-slate-500'}`}>{step}</span>
                    {step < 3 && <span className={`mx-2 h-[2px] flex-1 ${step < activeProtocolStep ? 'bg-blue-600' : 'bg-slate-700'}`} />}
                  </Fragment>
                ))}
              </div>
            </div>

            <motion.div layout className="relative min-h-[50vh]">
              <AnimatePresence mode="wait">

                {/* ── STAGE 0: PRE-ARRIVAL ── */}
                {arrivalStage === 'pre-arrival' && (
                  <motion.div key="pre" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                    <h2 className="text-md font-bold text-slate-800 mb-2">Have you arrived in {cityName}?</h2>
                    <p className="text-sm text-slate-600 mb-6">Tap below once you've landed to begin guided arrival.</p>
                    <button onClick={handleConfirmArrival} className="w-full rounded-xl bg-blue-600 py-4 text-[11px] font-black uppercase text-white shadow-lg">Confirm Arrival</button>
                  </motion.div>
                )}

                {/* ── STAGE 1: ENTRY & IMMIGRATION ── */}
                {arrivalStage === 'entry-immigration' && (
                  <motion.div key="stage1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-xl border border-neutral-200 bg-white px-5 py-6 space-y-4">
                    <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="Visa Requirement" value={displayVisaStatus} />
                    <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Lane Advice" value={laneText} />
                    <InlineRow icon={<Plane size={14} className="text-slate-600" />} label="Entry Strategy" value={strategyText} />
                    <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label="Digital Entry" value={digitalEntryText} bordered={false} />
                    <button onClick={handleMarkLanded} className="w-full mt-4 rounded-xl bg-blue-600 py-4 text-[11px] font-black uppercase text-white shadow-lg">I've Cleared Customs!</button>
                  </motion.div>
                )}

                {/* ── STAGE 2: AIRPORT EXIT ── */}
                {arrivalStage === 'airport-exit' && (
                  <motion.div key="stage2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                    <div className="space-y-4 mb-6">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Exit Strategy</p>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <Plane size={14} className="mt-1 shrink-0 text-slate-500" />
                          <div><p className="text-sm font-medium text-slate-800">Terminal</p><p className="text-sm text-slate-700 opacity-80 leading-relaxed">Verify terminal: T1 (Inter) vs T2 (Aeromexico). Shuttle takes 15+ mins.</p></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <Wifi size={14} className="mt-1 shrink-0 text-slate-500" />
                          <div><p className="text-sm font-medium text-slate-800">Handshake</p><p className="text-sm text-slate-700 opacity-80 leading-relaxed">Finalize ride on Wi-Fi before exiting. Cellular is unstable in lanes.</p></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <Navigation size={14} className="mt-1 shrink-0 text-slate-500" />
                          <div><p className="text-sm font-medium text-slate-800">Pickup</p><p className="text-sm text-slate-700 opacity-80 leading-relaxed">T1: Exit Gate 7, outer lane. T2: Ground Floor, follow app signage.</p></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle size={14} className="mt-1 shrink-0 text-slate-500" />
                          <div><p className="text-sm font-medium text-slate-800">Resilience</p><p className="text-sm text-slate-700 opacity-80 leading-relaxed">Ignore solicitations. Use pre-booked apps or "Taxi Autorizado" only.</p></div>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <InlineRow icon={<Wifi size={14} className="text-blue-600" />} label={`WiFi: ${wifiSsidText}`} value={`Password: ${wifiPasswordText}`} />
                      <div className="flex flex-col gap-3">
                        <InlineRow icon={<Navigation size={14} className="text-amber-600" />} label="Official Transport" bordered={false} value={(
                          <div className="flex flex-col gap-3 w-full">
                            <span className="text-sm text-slate-700 leading-relaxed">{officialTransportText}</span>
                            <a href={`https://google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}&travelmode=transit`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl active:scale-[0.98] group">
                              <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-lg text-amber-700"><Train size={16} strokeWidth={2.5} /></div>
                                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Transit Route</p><p className="text-xs font-bold text-slate-700">Metro/Rail to Center</p></div>
                              </div>
                              <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                            </a>
                          </div>
                        )} />
                      </div>
                      <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="SIM / Currency" value="SIM desks and exchange booths are in arrivals before public exit doors." bordered={false} />
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <InlineRow icon={<CheckCircle size={14} className="text-emerald-600" />} label="Transit Estimates" value={(() => {
                        const taxiVal = transitEstimates.taxi.includes(':') ? transitEstimates.taxi.split(':')[1].trim() : transitEstimates.taxi;
                        const railVal = transitEstimates.rail.includes(':') ? transitEstimates.rail.split(':')[1].trim() : transitEstimates.rail;
                        const formatValue = (val: string) => (<div className="flex flex-col gap-1">{val.split('|').map((m, i) => (<div key={i} className="flex flex-wrap items-center gap-x-1.5">{formatTransitSegment(m, `t-${i}`)}</div>))}</div>);
                        return (
                          <div className="mt-4 grid grid-cols-1 gap-y-5 sm:grid-cols-[140px_1fr] sm:gap-x-8 sm:gap-y-8">
                            <div className="flex items-center gap-2 self-start pt-1 px-1 sm:pt-0 sm:flex-col sm:items-start sm:gap-0.5"><span className="font-black uppercase tracking-wider text-slate-900 text-[14px] sm:text-xs">Taxi</span><span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">to center</span></div>
                            <div className="space-y-4">
                              <div className="text-[14px] sm:text-sm text-slate-700 leading-relaxed pl-1 sm:pl-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2"><span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">time/cost</span>{formatValue(taxiVal)}</div>
                              <div className="flex flex-wrap gap-2 pt-1 ml-1 sm:ml-0">
                                <p className="w-full text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">App Shortcuts</p>
                                <a href="https://m.uber.com/ul/?action=setPickup&pickup=my_location" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-xl text-[11px] font-bold active:scale-95 shadow-sm"><div className="w-4 h-4 bg-white rounded-full flex items-center justify-center"><span className="text-black text-[8px] font-black">U</span></div>Uber</a>
                                <a href="https://s.didiglobal.com/p/global-download" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#ff8d00] text-white px-3 py-2 rounded-xl text-[11px] font-bold active:scale-95 shadow-sm"><div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center font-black text-[10px]">D</div>DiDi</a>
                                <a href={`https://citymapper.com/directions?endcoord=${coordinates?.lat},${coordinates?.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#28d172] text-white px-3 py-2 rounded-xl text-[11px] font-bold active:scale-95 shadow-sm"><Navigation size={12} fill="white" />Citymapper</a>
                              </div>
                            </div>
                            <div className="sm:hidden border-t border-slate-100 mx-1" />
                            <div className="flex items-center gap-2 self-start pt-1 px-1 sm:pt-0 sm:flex-col sm:items-start sm:gap-0.5"><span className="font-black uppercase tracking-wider text-slate-900 text-[14px] sm:text-xs">Rail</span><span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">to zones</span></div>
                            <div className="space-y-4">
                              <div className="text-[14px] sm:text-sm text-slate-700 leading-relaxed pl-1 sm:pl-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2"><span className="text-slate-400 italic text-[10px] sm:text-[11px] whitespace-nowrap">cost</span>{formatValue(railVal)}</div>
                              <div className="pt-1 ml-1 sm:ml-0"><a href={`https://google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}&travelmode=transit`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold active:scale-95 shadow-md"><Train size={14} className="text-cyan-400" />View Rail Route<ArrowUpRight size={14} className="opacity-50" /></a></div>
                            </div>
                          </div>
                        );
                      })()} />
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-slate-200">
                      <motion.button 
                        whileTap={{ scale: 0.98 }}
                        onClick={handleProceedToCity} 
                        className="w-full rounded-xl bg-blue-600 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg transition-colors hover:bg-blue-700"
                      >
                        I've Left the Airport
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 3: LEFT AIRPORT / CITY DYNAMICS ── */}
                {arrivalStage === 'left-airport' && (
                  <motion.div key="stage3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-4">
                        CITY DYNAMICS & NEIGHBORHOOD INTELLIGENCE
                      </p>

                      <div className="space-y-1">

                        {/* Tourist Clusters + action buttons */}
                        <div className="border-b border-neutral-100">
                          <InlineRow
                            icon={<CheckCircle size={14} className="text-emerald-600" />}
                            label="Tourist Clusters"
                            value="High-traffic zones with elevated pricing — know before you go."
                            bordered={false}
                          />
                          <TouristClusterActions cityName={cityName} coordinates={coordinates} />
                        </div>

                        {/* Feels Unsafe vs Is Unsafe + optional crime data portal */}
                        <div className="flex flex-col">
                          <InlineRow
                            icon={<CheckCircle size={14} className="text-emerald-600" />}
                            label="Feels Unsafe vs Is Unsafe"
                            value="Differentiate perception from statistics."
                          />
                          {safetyIntelligence && (
                            <div className="ml-5 mt-1.5 pb-3">
                              <a
                                href={safetyIntelligence.crimeStatsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl active:scale-95 group"
                              >
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Official Intelligence</span>
                                  </div>
                                  <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
                                    {cityName} Crime Data Portal
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                  </span>
                                </div>
                              </a>
                              <p className="text-[10px] text-slate-400 italic mt-1.5 px-1 leading-tight">
                                {safetyIntelligence.crimeStatsSource}
                              </p>
                            </div>
                          )}
                        </div>

                        <InlineRow
                          icon={<CheckCircle size={14} className="text-emerald-600" />}
                          label="Gentrified vs Historic"
                          value="Recently commercialized vs rooted areas."
                          bordered={false}
                        />
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100">
                        <CityPulseBlock citySlug={citySlug} cityName={cityName} hasLanded={true} />
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>

            {/* BOTTOM RESET BUTTON */}
            {arrivalStage !== 'pre-arrival' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex justify-center pb-2">
                <button 
                  onClick={handleReset} 
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/60 hover:text-cyan-100 transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset Arrival Status
                </button>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}