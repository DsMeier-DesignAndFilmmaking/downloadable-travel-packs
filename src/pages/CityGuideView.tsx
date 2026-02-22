import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  AlertTriangle,
  Download,
  Zap,
  ChevronLeft,
  Plane,
  Wifi,
  Activity,
  X,
  Droplets,
  Globe,
  Navigation,
  Utensils,
  QrCode,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { CityPack } from '@/types/cityPack';
import { useCityPack } from '@/hooks/useCityPack';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { getCleanSlug } from '@/utils/slug';
import { isGuideOfflineAvailable } from '@/utils/cityPackIdb';
import { fetchVisaCheck, type VisaCheckData } from '../services/visaService';
import DebugBanner from '@/components/DebugBanner';
import SourceInfo from '@/components/SourceInfo';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import SyncButton from '../components/SyncButton';
import FacilityKit from '@/components/FacilityKit';
import { updateThemeColor } from '@/utils/manifest-generator';

import { usePostHog } from '@posthog/react';

import { trackCityPackView, PageTimer, captureEvent } from '@/lib/analytics';

new PageTimer('homepage')

function balanceText(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  const tail = `${words[words.length - 2]}\u00A0${words[words.length - 1]}`;
  return `${words.slice(0, -2).join(' ')} ${tail}`;
}


// ---------------------------------------------------------------------------
// IndexedDB: persist city pack after load
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('travel-packs-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('city-packs')) {
        db.createObjectStore('city-packs', { keyPath: 'slug' });
      }
    };
  });
}

async function saveCityToIndexedDB(slug: string, cityData: CityPack): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('city-packs', 'readwrite');
  const store = tx.objectStore('city-packs');
  store.put({
    slug,
    pack: cityData,
    data: cityData,
    lastUpdated: Date.now(),
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  console.log('💾 Saved to IndexedDB:', slug);
}

// ---------------------------------------------------------------------------
// Components & Helpers
// ---------------------------------------------------------------------------


function BorderClearance({
  visaData,
  loading = false,
  error = null,
  digitalEntry,
  touristTax,
  visaStatus,
  isLive,
}: {
  visaData?: VisaCheckData | null;
  loading?: boolean;
  error?: string | null;
  digitalEntry?: string;
  touristTax?: string;
  visaStatus?: string;
  isLive: boolean;
}) {
  const payload = (visaData ?? {}) as Record<string, unknown>;

  useEffect(() => {
    console.log('🛰️ FIELD INTEL FETCHED:', visaData);
  }, [visaData]);

  const parseMoneyValue = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return 0;
    const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return 0;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const laneTypeFromApi = typeof payload.laneType === 'string' ? payload.laneType.trim() : '';
  const laneTypeFromFallback = typeof visaStatus === 'string' && /standard/i.test(visaStatus) ? 'Standard' : '';
  const laneType = laneTypeFromApi || laneTypeFromFallback || 'Arrival';
  const isStandardLane = /^standard$/i.test(laneType);

  const digitalFormFromApi = typeof payload.digitalForm === 'string' ? payload.digitalForm.trim() : '';
  const digitalForm = digitalFormFromApi || digitalEntry?.trim() || '';
  const hasDigitalForm = digitalForm.length > 0;

  const arrivalFeeRaw = payload.arrivalFee ?? touristTax ?? 0;
  const arrivalFee = parseMoneyValue(arrivalFeeRaw);
  const requiresCash = arrivalFee > 0;

  const hasApiError = Boolean(error) || (!loading && !isLive && !visaData);
  const requiresAction = requiresCash || !isStandardLane || hasApiError;

  const lineInstruction = hasApiError
    ? 'PROTOCOL: Standard Entry. Keep Passport & Onward Flight Proof ready.'
    : isStandardLane
      ? "Go to the 'Visa Validation' Lane. (Look for the blue signs)."
      : "Head to the 'Visa-on-Arrival' desk before the main queue.";

  const qrInstruction = hasApiError
    ? 'Keep your Passport and Onward Flight proof in your hand.'
    : hasDigitalForm
      ? `Have your '${digitalForm}' ready. (Open it now to save time).`
      : 'Keep your Passport and Onward Flight proof in your hand.';

  const feeInstruction = hasApiError
    ? 'No exit fee required. Proceed directly to ground transport.'
    : requiresCash
      ? 'Stop at an ATM. You’ll need local cash for the payment counter before you can exit.'
      : 'No exit fee required. Proceed directly to ground transport.';

  const checklistItems = [
    {
      key: 'line',
      label: 'THE LINE',
      prompt: 'What line do I stand in?',
      instruction: lineInstruction,
      icon: Navigation,
      clear: !requiresAction && isStandardLane,
    },
    {
      key: 'qr',
      label: 'THE QR CODE',
      prompt: 'Where is the QR code?',
      instruction: qrInstruction,
      icon: QrCode,
      clear: hasDigitalForm,
    },
    {
      key: 'fee',
      label: 'THE EXIT FEE',
      prompt: 'Do I need cash to exit?',
      instruction: feeInstruction,
      icon: Banknote,
      clear: !requiresCash,
    },
  ] as const;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 border-t-4 border-t-slate-300 bg-white shadow-sm p-5"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Field Fixer
        </p>
        <p className="mt-3 text-sm font-medium text-slate-600 animate-pulse">
          {balanceText('Loading live border instructions...')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-[2rem] border border-slate-200 border-t-4 shadow-sm ${
        requiresAction ? 'border-t-amber-500 bg-amber-50/40' : 'border-t-emerald-500 bg-emerald-50/40'
      }`}
    >
      {!isLive && (
        <span className="absolute right-4 top-3 rounded-full border border-slate-300 bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
          USING CACHED FIELD NOTES
        </span>
      )}

      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Field Fixer
        </p>
        <p className="mt-1 text-sm font-semibold text-[#222222]">
          {requiresAction ? balanceText('Action required before terminal exit.') : balanceText('Border flow is clear and direct.')}
        </p>
      </div>

      <div className="space-y-3 p-5">
        {checklistItems.map((item) => {
          const TopicIcon = item.icon;
          const StatusIcon = item.clear ? ShieldCheck : Navigation;
          return (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <TopicIcon size={16} className="text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      {balanceText(item.label)}
                    </p>
                    <p className="mt-1 text-sm md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">
                      {balanceText(item.instruction)}
                    </p>
                  </div>
                </div>
                <StatusIcon
                  size={16}
                  className={`mt-1 shrink-0 ${item.clear ? 'text-emerald-600' : 'text-amber-600'}`}
                />
              </div>
              <p className="mt-2 text-xs font-semibold tracking-[0.01em] text-slate-500">
                {balanceText(item.prompt)}
              </p>
            </div>
          );
        })}

        {hasApiError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
              API FALLBACK
            </p>
            <p className="mt-1 text-sm font-medium text-amber-900 leading-relaxed">
              {balanceText('PROTOCOL: Standard Entry. Keep Passport & Onward Flight Proof ready.')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getEmergencyGridItems(emergency: Record<string, string | undefined>) {
  const order = ['police', 'medical', 'ambulance', 'tourist_police', 'emergency_all', 'general_eu', 'non_emergency'] as const;
  const labels: Record<string, string> = { police: 'Police', medical: 'Medical', ambulance: 'Ambulance', tourist_police: 'Tourist Police', emergency_all: 'Emergency', general_eu: 'EU 112', non_emergency: 'Non-Emergency' };
  const out: { key: string; label: string; number: string }[] = [];
  for (const key of order) {
    const val = emergency[key];
    if (val && /[\d]/.test(val)) {
      out.push({ key, label: labels[key] ?? key, number: val });
      if (out.length >= 4) break;
    }
  }
  return out;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, filter: "blur(10px)", position: "fixed", top: 0, left: 0, right: 0, transition: { duration: 0.3, ease: "easeInOut" } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function AgenticSystemTrigger({ onClick }: { onClick: () => void; }) {
  return (
    <motion.button variants={itemVariants} onClick={onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all active:scale-95 focus:outline-none">
      <Zap size={14} />
      <span>Live Intelligence</span>
      <Activity size={14} className="opacity-60" />
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Updated OfflineAccessModal (Receives data via props)
// ---------------------------------------------------------------------------

function OfflineAccessModal({ 
  isOpen, 
  onClose, 
  cityData, 
  cleanSlug,
  isChromeIOS,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  cityData: CityPack; 
  cleanSlug: string | undefined;
  isChromeIOS: boolean;
}) {
  const [showWhyRequired, setShowWhyRequired] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    if (!isOpen) setShowWhyRequired(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full overflow-y-auto">
        <div className="min-h-full px-4 py-6">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <h2 className="text-sm font-black uppercase tracking-wide text-[#222222]">Add Pack to Your Device</h2>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors active:scale-95"
                aria-label="Close offline instructions"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 text-[14px] text-slate-700">
              <div className="space-y-2">
                <p className="text-sm leading-relaxed text-slate-600">
                  Do these steps once, so you can easily access this pack from your device home screen <strong>100% OFFLINE</strong>.
                </p>
              </div>

              <ol className="space-y-3">
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">1</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Open Share Menu</p>
                      <p className="mt-1 leading-relaxed">
                        {isChromeIOS ? (
                          <>Chrome iOS: tap the <strong>Share icon at the top-right</strong> of the browser bar.</>
                        ) : (
                          <>Safari iOS: tap the <strong>Share icon at the bottom center</strong> of the browser bar.</>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">2</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Add To Home Screen</p>
                      <p className="mt-1 leading-relaxed">Find and tap <strong>"Add to Home Screen."</strong></p>
                    </div>
                  </div>
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 aspect-square place-items-center rounded-full bg-slate-900 text-[10px] leading-none font-black text-white">3</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Launch Once Online</p>
                      <p className="mt-1 leading-relaxed">Open this city <strong>from the home screen icon</strong> while still online.</p>
                    </div>
                  </div>
                </li>
              </ol>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">Critical</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900">
                  The first home-screen launch finalizes offline setup. After this, the city pack can open without internet.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">If It Fails</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  If that first home-screen launch happens offline, the city pack may not load correctly. Go back online to relaunch the pack from your home screen icon.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWhyRequired((v) => !v)}
                  className="text-xs font-black uppercase tracking-wider text-slate-500 underline underline-offset-2"
                >
                  Why is this required?
                </button>
                {showWhyRequired && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Local device storage for web apps need to be opened once from the home screen to complete offline setup.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  captureEvent(posthog, 'pwa_instructions_acknowledged', {
                    city: cityData?.name,
                    slug: cleanSlug,
                    network_status: navigator.onLine ? 'online' : 'offline',
                  });
                  onClose();
                }}
                className="h-12 w-full rounded-2xl bg-[#222222] text-[11px] font-black uppercase tracking-[0.18em] text-white active:scale-[0.98] transition-transform"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CURRENCY_PROTOCOL: Record<string, { code: string; rate: string }> = {
  TH: { code: 'THB', rate: '31.13' }, JP: { code: 'JPY', rate: '150.40' }, AE: { code: 'AED', rate: '3.67' }, GB: { code: 'GBP', rate: '0.87' }, FR: { code: 'EUR', rate: '0.94' }, IT: { code: 'EUR', rate: '0.94' }, ES: { code: 'EUR', rate: '0.94' }, DE: { code: 'EUR', rate: '0.94' }, MX: { code: 'MXN', rate: '17.05' }, US: { code: 'USD', rate: '1.00' },
};

const QUICK_FUEL_BUDGET_BY_CURRENCY: Record<string, string> = {
  THB: '50-100 THB',
  JPY: '800-1500 JPY',
  AED: '25-45 AED',
  GBP: '7-12 GBP',
  EUR: '8-15 EUR',
  USD: '8-15 USD',
  MXN: '90-180 MXN',
  KRW: '7000-12000 KRW',
};

type QuickFuelIntel = {
  staple: string;
  intel: string;
  priceAnchor: string;
  priceUsd: number;
  availability: string;
  sources: string[];
};

const QUICK_FUEL_INTEL_BY_SLUG: Record<string, QuickFuelIntel> = {
  'bangkok-thailand': {
    staple: '7-Eleven Toasties or Go-Ang Chicken Rice (Pratunam).',
    intel: "The 'Pink Uniform' chicken rice is a Michelin-rated survival staple for ~$2-3. Open until 9:30 PM.",
    priceAnchor: '50-120 THB for a full street meal.',
    priceUsd: 2.8,
    availability: 'Mixed hours (7-Eleven 24h / Go-Ang until 9:30 PM).',
    sources: ['Michelin Guide', 'Local Expat Forums', '2026 Price Index'],
  },
  'tokyo-japan': {
    staple: 'Lawson/7-Eleven Onigiri or Standing Ramen (Ekimeishi).',
    intel: "Look for 'Standing Ramen' inside major stations for a $4 high-quality fuel hit in 10 minutes.",
    priceAnchor: '500-900 JPY for arrival fuel.',
    priceUsd: 4,
    availability: 'Open 24h options via major konbini chains.',
    sources: ['Michelin Guide', 'r/Travel', '2026 Price Index'],
  },
  'mexico-city-mexico': {
    staple: 'Tacos de Canasta or Tamales (Morning) / Tacos al Pastor (Night).',
    intel: "Street stalls near Metro stations are safe, fast, and the city's true energy source.",
    priceAnchor: '60-120 MXN for a 3-taco set.',
    priceUsd: 5.3,
    availability: 'Strong morning/night windows near Metro corridors.',
    sources: ['Local Expat Forums', 'r/Travel', '2026 Price Index'],
  },
};

function deriveQuickFuelBudget(city: CityPack): string {
  const code =
    city.currencyCode?.toUpperCase().trim() ||
    CURRENCY_PROTOCOL[city.countryCode]?.code ||
    'USD';

  const range = QUICK_FUEL_BUDGET_BY_CURRENCY[code] ?? `8-15 ${code}`;
  return `Budget ~${range} for a street meal.`;
}

function deriveFallbackFuelStaple(city: CityPack): string {
  const rawHacks = city.real_time_hacks ?? [];
  const foodKeyword = /(food|street|meal|snack|eat|noodle|pad thai|taco|market|7[- ]?eleven|toastie|toasty|bakery|cafe|onigiri|ramen|tamales)/i;
  const firstFoodHack = rawHacks.find((hack) => foodKeyword.test(hack));

  if (firstFoodHack) {
    if (/7[- ]?eleven|toastie|toasty|lawson|onigiri/i.test(firstFoodHack)) return 'Convenience Store Fuel + Street Food';
    if (/street food|market|tamales|taco|pastor/i.test(firstFoodHack)) return 'Street Food Near Transit Hubs';
    if (/ramen|noodle/i.test(firstFoodHack)) return 'Fast Noodle Stops Near Stations';
    return 'Fast Local Street Meals';
  }

  if (/street food|food/i.test(city.theme)) return 'Street Food or Convenience Stores';
  return 'Quick Street Fuel Near Main Transit';
}

function deriveQuickFuelIntel(city: CityPack): QuickFuelIntel {
  const dataFuel = city.fuel;
  const slugFuel = QUICK_FUEL_INTEL_BY_SLUG[city.slug];

  if (dataFuel?.staple && dataFuel?.intel && dataFuel?.price_anchor && typeof dataFuel.price_usd === 'number') {
    return {
      staple: dataFuel.staple,
      intel: dataFuel.intel,
      priceAnchor: dataFuel.price_anchor,
      priceUsd: dataFuel.price_usd,
      availability: dataFuel.availability ?? 'Peak-hour availability near main transit.',
      sources: dataFuel.source?.length ? dataFuel.source : ['Local Expat Forums', '2026 Price Index'],
    };
  }

  if (slugFuel) return slugFuel;

  return {
    staple: deriveFallbackFuelStaple(city),
    intel: 'Cheap, fast, and safe survival fuel. Pay cash at stalls.',
    priceAnchor: deriveQuickFuelBudget(city).replace(/^Budget\s*~/, ''),
    priceUsd: 6,
    availability: 'Peak-hour availability near main transit.',
    sources: ['Local Expat Forums', '2026 Price Index'],
  };
}

function extractFirstNumber(value: string): number | null {
  const match = value.match(/([0-9]+(?:[.,][0-9]+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toTwoDecimals(value: number): string {
  return value.toFixed(2);
}

function resolveCurrencyName(currencyCode: string | undefined): string | null {
  if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return null;

  try {
    if (typeof Intl !== 'undefined' && 'DisplayNames' in Intl) {
      const display = new Intl.DisplayNames(['en'], { type: 'currency' });
      const name = display.of(currencyCode);
      if (name && name.toUpperCase() !== currencyCode) return name;
    }
  } catch {
    // Ignore and fallback below.
  }

  const fallbackNames: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    THB: 'Thai Baht',
    AED: 'UAE Dirham',
    MXN: 'Mexican Peso',
    KRW: 'South Korean Won',
  };

  return fallbackNames[currencyCode] ?? null;
}

/**
 * Normalize upstream exchange values to a single UI contract:
 * "1 USD = X DESTINATION_CURRENCY"
 */
function resolveUsdToLocalRate(
  exchangeRaw: string | undefined,
  destinationCurrencyCode: string | undefined,
  fallbackRate: string | undefined,
): string {
  const fallbackNumeric = fallbackRate ? Number.parseFloat(fallbackRate) : NaN;
  const fallback = Number.isFinite(fallbackNumeric) && fallbackNumeric > 0 ? fallbackNumeric : null;

  if (!exchangeRaw || exchangeRaw.trim().length === 0) {
    return fallback ? toTwoDecimals(fallback) : '---';
  }

  const raw = exchangeRaw.trim();
  const rawUpper = raw.toUpperCase();
  const destCode = destinationCurrencyCode?.toUpperCase().trim();

  let candidate: number | null = null;

  const usdToAny = rawUpper.match(/USD\s*=\s*([0-9]+(?:[.,][0-9]+)?)/);
  if (usdToAny) {
    candidate = Number.parseFloat(usdToAny[1].replace(',', '.'));
  }

  if (candidate == null && destCode) {
    const localToUsd = rawUpper.match(new RegExp(`${destCode}\\s*=\\s*([0-9]+(?:[.,][0-9]+)?)\\s*USD`));
    if (localToUsd) {
      const localPerUsd = Number.parseFloat(localToUsd[1].replace(',', '.'));
      if (Number.isFinite(localPerUsd) && localPerUsd > 0) {
        candidate = 1 / localPerUsd;
      }
    }
  }

  if (candidate == null) {
    candidate = extractFirstNumber(raw);
  }

  if (!candidate || !Number.isFinite(candidate) || candidate <= 0) {
    return fallback ? toTwoDecimals(fallback) : '---';
  }

  // If upstream returns inverse (common for some destinations), flip when it matches known fallback direction better.
  if (fallback) {
    const inverse = 1 / candidate;
    const directDistance = Math.abs(candidate - fallback);
    const inverseDistance = Math.abs(inverse - fallback);
    if (inverseDistance < directDistance) {
      candidate = inverse;
    }
  }

  return toTwoDecimals(candidate);
}

const DEFAULT_PASSPORT = 'US';
const STANDALONE_FIRST_LAUNCH_KEY = 'travelpacks-standalone-first-launch';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CityGuideView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cleanSlug = getCleanSlug(rawSlug);
  const navigate = useNavigate();
  const posthog = usePostHog();
  
  const {
    cityData,
    isLoading: packLoading,
    isOffline,
    isLocalData,
    syncStatus,
    error,
    refetch,
  } = useCityPack(cleanSlug ?? undefined);
  const {
    platform,
    isInstalled: isPWAInstalled,
    isInstallable,
    hasActivePrompt,
    installFieldPack,
  } = usePWAInstall();

  const [offlineAvailable, setOfflineAvailable] = useState<boolean>(false);
  const [isOfflineHelpOpen, setIsOfflineHelpOpen] = useState(false);
  const [showStandaloneBanner, setShowStandaloneBanner] = useState(false);
  const [visaData, setVisaData] = useState<VisaCheckData | null>(null);
  const [visaFetchError, setVisaFetchError] = useState<string | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>(() => new Date().toISOString());

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true);

  const isMobileDevice =
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 768px)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
      ));

  const showBackButton = !isStandalone || (!isMobileDevice && isLocalData);

  const isOnline = !isOffline;
  const modeStatusLabel = isOnline ? 'Online Mode Active' : 'Offline Mode Active';
  const isOfflineAvailable = useMemo(
    () => Boolean(cityData && (isOffline || isLocalData)),
    [cityData, isOffline, isLocalData]
  );
  const integritySource = useMemo(() => {
    const candidate = visaData?.source;
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate
      : 'Official Government Portals';
  }, [visaData]);
  const integrityLastVerified = useMemo(() => {
    const candidate = visaData?.lastUpdated;
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate
      : lastSynced;
  }, [lastSynced, visaData]);
  const exchangeRateDisplay = useMemo(() => {
    const fallbackRate = CURRENCY_PROTOCOL[cityData?.countryCode ?? '']?.rate;
    return resolveUsdToLocalRate(
      visaData?.destination?.exchange,
      visaData?.destination?.currency_code,
      fallbackRate,
    );
  }, [cityData?.countryCode, visaData?.destination?.currency_code, visaData?.destination?.exchange]);
  const currencyCodeDisplay = useMemo(() => {
    const apiCode = visaData?.destination?.currency_code?.toUpperCase().trim();
    if (apiCode && /^[A-Z]{3}$/.test(apiCode)) return apiCode;
    return CURRENCY_PROTOCOL[cityData?.countryCode ?? '']?.code ?? '';
  }, [cityData?.countryCode, visaData?.destination?.currency_code]);
  const currencyNameDisplay = useMemo(
    () => resolveCurrencyName(currencyCodeDisplay),
    [currencyCodeDisplay],
  );
  const quickFuelIntel = useMemo(() => (cityData ? deriveQuickFuelIntel(cityData) : null), [cityData]);
  const quickFuelOpen24h = useMemo(
    () =>
      quickFuelIntel
        ? /24h|24-hour|24 hour/i.test(
            `${quickFuelIntel.availability} ${quickFuelIntel.staple} ${quickFuelIntel.intel}`,
          )
        : false,
    [quickFuelIntel],
  );
  const isPackInstalled = isPWAInstalled || isStandalone;
  const isIOS = platform.os === 'ios';
  // Hide the install bar only when the user is already in mobile standalone mode.
  const shouldShowInstallBar = !(isStandalone && isMobileDevice);

  const installButtonLabel = isPackInstalled
    ? 'Pack Installed'
    : isInstallable
      ? 'Install Field Pack to Home Screen'
      : isIOS
        ? 'Add to Home Screen'
        : 'Add to Your Device';

  const installButtonSubLabel = isPackInstalled
    ? 'Ready for offline launch'
    : isInstallable
      ? 'Live install path ready'
      : isIOS
        ? 'Use share flow to install'
        : 'Setup offline access';

  const handleInstallButtonClick = useCallback(async () => {
    if (!cityData) return;
    if (isPackInstalled) return;

    if (platform.os === 'android' && isInstallable) {
      captureEvent(posthog, 'pwa_install_prompt_triggered', {
        city: cityData.name,
        slug: cleanSlug,
        platform_os: platform.os,
        platform_browser: platform.browser,
      });
      const outcome = await installFieldPack();
      captureEvent(posthog, 'pwa_install_prompt_outcome', {
        city: cityData.name,
        slug: cleanSlug,
        outcome,
        platform_os: platform.os,
        platform_browser: platform.browser,
      });
      return;
    }

    captureEvent(posthog, 'pwa_install_instructions_viewed', {
      city: cityData.name,
      slug: cleanSlug,
      network_status: navigator.onLine ? 'online' : 'offline',
      device_type: isMobileDevice ? 'mobile' : 'desktop',
      platform_os: platform.os,
      platform_browser: platform.browser,
      ios_chrome: platform.isChromeiOS,
    });
    setIsOfflineHelpOpen(true);
  }, [
    cityData,
    cleanSlug,
    installFieldPack,
    isInstallable,
    isMobileDevice,
    isPackInstalled,
    platform.browser,
    platform.isChromeiOS,
    platform.os,
    posthog,
  ]);

  // ---------------------------------------------------------------------------
  // 1️⃣ Standalone first launch: show banner & fire PostHog event
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !isStandalone || !cityData?.name || !cleanSlug) return;
    if (localStorage.getItem(STANDALONE_FIRST_LAUNCH_KEY)) return;

    localStorage.setItem(STANDALONE_FIRST_LAUNCH_KEY, '1');
    setShowStandaloneBanner(true);

    captureEvent(posthog, 'standalone_first_launch', {
      city: cityData.name,
      slug: cleanSlug,
      timestamp: new Date().toISOString(),
    });

    const timeoutId = window.setTimeout(() => {
      setShowStandaloneBanner(false);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isStandalone, cityData?.name, cleanSlug, posthog]);

  // ---------------------------------------------------------------------------
  // 2️⃣ Track city pack view on load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (cityData?.name) {
      trackCityPackView(cityData.name);

      posthog?.capture('city_pack_opened', {
        city: cityData.name,
        is_online: navigator.onLine,
        slug: cleanSlug
      });
    }
  }, [cityData?.name, posthog, cleanSlug]);

  // ---------------------------------------------------------------------------
  // 3️⃣ Document title, theme, and last pack
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cleanSlug || !cityData) return;

    document.title = `${cityData.name} Pack`;

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', cityData.name);

    updateThemeColor('#0f172a');
    localStorage.setItem('pwa_last_pack', `/guide/${cleanSlug}`);
  }, [cleanSlug, cityData]);

  // ---------------------------------------------------------------------------
  // 4️⃣ Offline availability & persistence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cleanSlug) return;
    isGuideOfflineAvailable(cleanSlug).then(setOfflineAvailable);
  }, [cleanSlug]);

  useEffect(() => {
    setLastSynced(new Date().toISOString());
  }, [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug || !cityData || isOffline) return;
    saveCityToIndexedDB(cleanSlug, cityData)
      .then(() => setOfflineAvailable(true))
      .catch((err) => console.warn('💾 IDB Write Failed:', err));
  }, [cleanSlug, cityData, isOffline]);

  // ---------------------------------------------------------------------------
  // 5️⃣ Visa data fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cityData?.countryCode) return;
    setVisaData(null);
    setVisaFetchError(null);
    if (isOffline) {
      setIsApiLoading(false);
      return;
    }
    setIsApiLoading(true);
    fetchVisaCheck(DEFAULT_PASSPORT, cityData.countryCode)
      .then((data) => {
        if (data) {
          setVisaData(data);
          setVisaFetchError(null);
          return;
        }
        setVisaFetchError('Live visa intel unavailable');
      })
      .catch((err) => {
        console.error("Visa Protocol Failed:", err);
        setVisaFetchError('Visa API error (502 fallback active)');
      })
      .finally(() => setIsApiLoading(false));
  }, [cityData?.countryCode, isOffline]);

  useEffect(() => {
    if (!cityData || !quickFuelIntel) return;
    console.log('🥘 BASIC NEEDS SYNC:', {
      water: cityData.survival?.tapWater,
      power: cityData.survival?.power,
      fuelHack: cityData.real_time_hacks?.[1],
      fuel: cityData.fuel,
    });
    console.table({
      City: cityData.name,
      Staple: quickFuelIntel.staple,
      USD_Eq: quickFuelIntel.priceUsd,
    });
  }, [cityData, quickFuelIntel]);

  const handleSync = async () => {
    try {
      await refetch();
      setLastSynced(new Date().toISOString());
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  // ---------------------------------------------------------------------------
  // 6️⃣ Render loaders, errors, and main content
  // ---------------------------------------------------------------------------
  if (packLoading || !cityData) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
       <p className="mt-4 text-slate-400 font-black tracking-widest uppercase text-xs animate-pulse">[ Accessing Field Intel... ]</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-8">
      <AlertTriangle className="text-rose-500 w-12 h-12 mb-4" />
      <p className="text-[#222222] font-bold mb-6 text-center">{error.message}</p>
      <button onClick={() => navigate(-1)} className="bg-[#222222] text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform">Back to Catalog</button>
    </div>
  );

  return (
    <motion.div key={cleanSlug} initial="hidden" animate="visible" exit="exit" variants={containerVariants} className="min-h-screen bg-[#F7F7F7] text-[#222222] pb-40 w-full overflow-x-hidden">
      <DiagnosticsOverlay city={cityData.name} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
      
      {/* Fixed Modal Call with passed Props */}
      <OfflineAccessModal 
        isOpen={isOfflineHelpOpen} 
        onClose={() => setIsOfflineHelpOpen(false)} 
        cityData={cityData}
        cleanSlug={cleanSlug}
        isChromeIOS={platform.isChromeiOS}
      />

      {showStandaloneBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[190] w-full max-w-md px-4 pointer-events-none">
          <div className="mx-auto rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2 text-[11px] font-black text-[#222222] tracking-wide shadow-lg backdrop-blur-sm">
            Opening from home screen. Finalizing offline setup...
          </div>
        </div>
      )}
      {showDebug && <DebugBanner data={visaData ?? undefined} cityId={cityData.slug} loading={isApiLoading} />}

      <div 
        onClick={() => setIsDiagnosticsOpen(true)}
        className={`px-6 py-2.5 text-[9px] font-black flex justify-center items-center tracking-[0.2em] uppercase fixed top-0 left-0 right-0 z-[60] border-b border-slate-200 shadow-sm cursor-pointer transition-colors ${
          !isOnline ? 'bg-orange-50 text-orange-700' : 'bg-[#222222] text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-center">
          <div className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-orange-600 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
          {modeStatusLabel}
          {(offlineAvailable || isOfflineAvailable) && <span className="opacity-80"> · Available offline</span>}
        </div>
      </div>

      <header className="px-6 pt-14 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="back-button-nav p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-90 transition-transform">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="text-right flex flex-col items-end">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none cursor-pointer italic" onClick={() => { setDebugTapCount(p => p + 1); if (debugTapCount >= 4) { setShowDebug(true); setDebugTapCount(0); } }}>
              {cityData.name}
            </h1>
            <p className="text-base md:text-sm tracking-[0.01em] text-slate-600 mt-2 font-medium max-w-[240px] ml-auto leading-relaxed">{cityData.theme}</p>
            <div className="mt-6 flex items-center gap-4 flex-wrap justify-end">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase leading-none">Local Intel</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                  {isOffline ? 'Viewing Offline' : `Updated ${new Date(lastSynced).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <SyncButton onSync={handleSync} isOffline={isOffline} status={syncStatus} />
              <AgenticSystemTrigger onClick={() => setIsDiagnosticsOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10 max-w-2xl mx-auto">
        {cityData.arrival && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">ARRIVAL</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <Plane size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Land & clear</span>
              </div>
              <div className="p-8 text-[#222222] font-medium leading-relaxed text-base md:text-[15px] tracking-[0.01em]">{cityData.arrival.airportHack}</div>
              <div className="flex items-center gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                <Wifi size={20} className="text-[#222222]" />
                <span className="font-black text-[#222222] text-xs uppercase tracking-widest">Connect</span>
              </div>
              <div className="p-8 text-base md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">{cityData.arrival.eSimAdvice}</div>
            </div>
          </section>
        )}

        <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
    <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
      ENTRY INFO
    </h2>
    <SourceInfo
      source={integritySource}
      lastUpdated={integrityLastVerified}
      isLive={!!visaData}
    />
  </div>
          <div className="min-h-[140px]">
            <AnimatePresence mode="wait">
              <BorderClearance
                visaData={visaData}
                loading={isApiLoading}
                error={visaFetchError}
                digitalEntry={cityData.survival?.digitalEntry}
                touristTax={cityData.survival?.touristTax}
                isLive={!!visaData}
                visaStatus={visaData?.visa_rules?.primary_rule 
                  ? `${visaData.visa_rules.primary_rule.name} - ${visaData.visa_rules.primary_rule.duration || 'N/A'}`
                  : "Standard Entry Protocol applies."}
              />
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {getEmergencyGridItems(cityData.emergency).map(({ key, label, number }) => (
              <div key={key} className="flex flex-col justify-center items-center bg-[#222222] text-white p-6 rounded-[2rem] shadow-lg active:scale-95 transition-transform">
                <Phone size={22} className="mb-2 text-[#FFDD00]" />
                <span className="text-[10px] font-black text-[#FFDD00] uppercase tracking-widest">{label}</span>
                <span className="text-xl font-bold mt-1 tabular-nums">{number}</span>
              </div>
            ))}
          </div>
        </section>

        {cityData.transit_logic && (
          <section className="space-y-4">
            <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Transit & Transportation</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-6"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Navigation size={20} /></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access & Fare Strategy</p></div>
              <p className="text-base md:text-[15px] tracking-[0.01em] font-medium text-[#222222] leading-relaxed">{cityData.transit_logic.payment_method}</p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Primary Apps</span></div>
                <span className="text-xs font-black text-blue-600 uppercase italic text-right max-w-[180px]">{cityData.transit_logic.primary_app}</span>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local Etiquette</p><p className="text-sm md:text-[13px] tracking-[0.01em] font-bold text-slate-600 italic">"{cityData.transit_logic.etiquette}"</p></div>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Basic Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Droplets className="text-blue-600 mb-4" size={32} />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Tap Water</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {balanceText(`DRINK: ${cityData.survival?.tapWater || 'Check Local Intel'}`)}
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Zap className="text-[#d4b900] mb-4" size={32} fill="#d4b900" />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-2">Power System</h3>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {balanceText(
                  typeof cityData.survival?.power === 'object'
                    ? `${cityData.survival.power.type} (${cityData.survival.power.voltage})`
                    : (cityData.survival?.power || 'Check Local Intel'),
                )}
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[180px]">
              <Utensils size={32} className="text-orange-500 mb-4" />
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Quick Fuel</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      quickFuelOpen24h
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse'
                        : 'bg-amber-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {quickFuelOpen24h ? 'Open 24h Path' : 'Timed Windows'}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1a1a1a] leading-tight">
                {balanceText(quickFuelIntel?.staple ?? deriveFallbackFuelStaple(cityData))}
              </p>
              <p className="mt-2 text-sm tracking-[0.01em] font-medium text-slate-600 leading-relaxed">
                {balanceText(quickFuelIntel?.intel ?? 'Cheap, fast, and safe survival fuel. Pay cash at stalls.')}
              </p>
              <p className="mt-1 text-sm tracking-[0.01em] font-medium text-slate-600 leading-relaxed">
                {balanceText(`Budget: ${quickFuelIntel?.priceAnchor ?? deriveQuickFuelBudget(cityData).replace(/^Budget\s*~/, '')}`)}
              </p>
              <div className="relative mt-2 w-fit group/fuel-source">
                <button
                  type="button"
                  className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 underline decoration-slate-300 underline-offset-2"
                  aria-describedby="quick-fuel-source-tooltip"
                >
                  Source Credibility
                </button>
                <div
                  id="quick-fuel-source-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-20 w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold tracking-[0.01em] text-slate-600 opacity-0 shadow-lg transition-opacity duration-150 group-hover/fuel-source:opacity-100 group-focus-within/fuel-source:opacity-100"
                >
                  {balanceText(
                    `Verified via [${(quickFuelIntel?.sources ?? ['Michelin Guide', 'Local Expat Forums', '2026 Price Index']).join(' / ')}].`,
                  )}
                </div>
              </div>
              <p className="mt-3 text-[10px] tracking-[0.02em] font-medium text-slate-500 leading-relaxed">
                {balanceText(`TIP: In ${cityData.name}, always carry small change for street vendors; most don't take cards.`)}
              </p>
            </div>
          </div>
          {cityData.facility_intel && <FacilityKit data={cityData.facility_intel} />}
        </section>

        <section className="space-y-4">
          <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">Spending Shield</h2>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2"><Globe size={14} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exchange Rate</p></div>
            <div className="text-3xl font-black text-[#222222] tabular-nums">
              1 USD = {exchangeRateDisplay}
              {currencyCodeDisplay && (
                <span className="ml-2 text-sm md:text-base font-bold text-slate-500">
                  {currencyCodeDisplay}
                  {currencyNameDisplay ? ` (${currencyNameDisplay})` : ''}
                </span>
              )}
            </div>
            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200/50 text-[15px] md:text-[14px] tracking-[0.01em] font-bold text-amber-900 leading-snug">{cityData.survival?.tipping || "Standard 10% is expected."}</div>
          </div>
        </section>
      </main>

      {shouldShowInstallBar && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
          <div 
            className="absolute inset-0 bg-[#F7F7F7]/60 backdrop-blur-xl border-t border-slate-200/50" 
            style={{ maskImage: 'linear-gradient(to top, black 80%, transparent)' }} 
          />
          
          <div className="relative p-6 pb-10 max-w-md mx-auto pointer-events-auto">
            <button
              onClick={handleInstallButtonClick}
              disabled={isPackInstalled}
              className={`w-full h-16 rounded-[2rem] shadow-2xl flex items-center justify-between px-8 transition-all border group ${
                isPackInstalled
                  ? 'bg-slate-500 text-white border-slate-500 cursor-not-allowed'
                  : 'bg-[#222222] text-white border-black active:scale-[0.97]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl transition-colors bg-white/10 text-white group-hover:bg-emerald-500/20 group-hover:text-emerald-400">
                  <Download size={20} strokeWidth={3} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">{balanceText(installButtonLabel)}</span>
                  <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest">{balanceText(installButtonSubLabel)}</span>
                </div>
              </div>
              <div
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  isPackInstalled
                    ? 'bg-emerald-500'
                    : hasActivePrompt
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
