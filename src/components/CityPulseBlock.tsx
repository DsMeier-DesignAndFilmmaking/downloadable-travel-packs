import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3, RefreshCw } from 'lucide-react';
import { fetchCityPulse, type PulseIntelligence } from '@/services/pulseService';

type CityPulseBlockProps = {
  citySlug: string;
  cityName: string;
  hasLanded: boolean;
};

type CachedPulse = {
  timestamp: number;
  data: PulseIntelligence[];
};

const PULSE_TTL_MS = 6 * 60 * 60 * 1000;

function toTimeAgo(isoTime?: string): string {
  if (!isoTime) return 'Now';
  const published = new Date(isoTime).getTime();
  if (!Number.isFinite(published)) return 'Now';
  const diffMs = Date.now() - published;
  if (diffMs < 60_000) return 'Now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function trimHeadline(value: string, max = 92): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function isOfflineIntelDataset(items: PulseIntelligence[]): boolean {
  if (!items.length) return false;
  return items.every((item) => item.source === 'Offline Intel');
}

export default function CityPulseBlock({ citySlug, cityName, hasLanded }: CityPulseBlockProps) {
  const [pulseData, setPulseData] = useState<PulseIntelligence[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storageKey = useMemo(() => `pulse_data_${citySlug}`, [citySlug]);
  const noResultsMessage = useMemo(
    () => `All clear in ${cityName}. No major transit or safety alerts reported in the last 24 hours.`,
    [cityName],
  );

  const handleFetchPulse = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchCityPulse(cityName, citySlug);
      if (!result.length) {
        setPulseData([]);
        setErrorMessage(noResultsMessage);
        return;
      }

      setPulseData(result);
      setErrorMessage(isOfflineIntelDataset(result) ? noResultsMessage : null);

      if (typeof window !== 'undefined') {
        const payload: CachedPulse = {
          timestamp: Date.now(),
          data: result,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      }
    } catch {
      setPulseData([]);
      setErrorMessage(noResultsMessage);
    } finally {
      setIsLoading(false);
    }
  }, [cityName, citySlug, noResultsMessage, storageKey]);

  useEffect(() => {
    setPulseData(null);
    setErrorMessage(null);
    setIsLoading(false);

    if (!hasLanded) return;

    try {
      if (typeof window === 'undefined') {
        void handleFetchPulse();
        return;
      }

      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        void handleFetchPulse();
        return;
      }

      const cached = JSON.parse(raw) as CachedPulse;
      if (!cached?.timestamp || !Array.isArray(cached?.data)) {
        window.localStorage.removeItem(storageKey);
        void handleFetchPulse();
        return;
      }

      const isStale = Date.now() - cached.timestamp > PULSE_TTL_MS;
      if (isStale) {
        window.localStorage.removeItem(storageKey);
        void handleFetchPulse();
        return;
      }

      setPulseData(cached.data);
      setErrorMessage(isOfflineIntelDataset(cached.data) ? noResultsMessage : null);
    } catch {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey);
      }
      void handleFetchPulse();
    }
  }, [handleFetchPulse, hasLanded, noResultsMessage, storageKey]);

  if (!hasLanded) return null;

  return (
    <section className="space-y-3">
  {/* Level 1: Header */}
  <div className="flex items-center justify-between px-2">
    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-600">City Pulse</h2>
    {!isLoading && pulseData && pulseData.length > 0 && (
      <button
        type="button"
        onClick={handleFetchPulse}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
      >
        <RefreshCw size={13} />
      </button>
    )}
  </div>

  {/* Level 2: Content State (Flattened) */}
  <div className="space-y-2">
    {/* --- LOADING STATE --- */}
    {isLoading && (
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Live City Pulse</p>
          <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="mt-4 grid place-items-center">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-cyan-100 bg-slate-50">
            <span className="radar-ring absolute inset-0 rounded-full border border-cyan-300/55" />
            <span className="radar-sweep-arm absolute left-1/2 top-1/2 h-[40%] w-[2px] origin-bottom">
              <span className="radar-sweep-line block h-full w-full rounded-full bg-cyan-400" />
            </span>
            <span className="absolute inset-[36%] rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">Scanning local signals...</p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="decrypt-bar h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" />
        </div>
      </div>
    )}

    {/* --- ACTIVE FEED --- */}
    {!isLoading && pulseData && pulseData.length > 0 && (
      <>
        {pulseData.map((snippet, index) => {
          const headline = trimHeadline(snippet.title);
          const isSafety = snippet.urgency || snippet.type === 'safety';

          return (
            <motion.a
              key={`${snippet.title}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              href={snippet.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-xl border-l-4 bg-white p-4 shadow-sm border border-neutral-200 transition-all active:scale-[0.98] ${
                isSafety ? 'border-l-red-500' : 'border-l-cyan-500'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isSafety ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`} />
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {snippet.source || 'Local Intelligence'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  <Clock3 size={10} />
                  <span>{toTimeAgo(snippet.publishedAt)}</span>
                </div>
              </div>
              <p className="text-[14px] font-bold text-slate-900 leading-snug">
                {headline}
              </p>
            </motion.a>
          );
        })}
        {errorMessage && <p className="px-2 text-[10px] font-bold text-red-500 uppercase">{errorMessage}</p>}
      </>
    )}

    {/* --- EMPTY/NOMINAL STATE --- */}
    {!isLoading && (!pulseData || pulseData.length === 0) && (
      <div className="rounded-xl border border-neutral-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-600">
            System Status: Nominal
          </p>
        </div>
        <p className="mt-3 text-[14px] font-bold text-slate-900 leading-relaxed">
          {`No major transit or safety alerts for ${cityName}. Local signals are stable.`}
        </p>
      </div>
    )}
  </div>
</section>
  );
}
