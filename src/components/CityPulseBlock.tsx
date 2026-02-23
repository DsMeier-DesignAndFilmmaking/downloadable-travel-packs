import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, Newspaper, RefreshCw, ShieldCheck } from 'lucide-react';
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
      <h2 className="px-2 text-[12px] font-black text-cyan-100 uppercase tracking-[0.3em]">City Pulse</h2>

      <div className="relative overflow-hidden rounded-2xl border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.78))] p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.2),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.2),transparent_45%)]" />
        <div className="relative z-10">
        {isLoading && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Live City Pulse</p>
            <div className="grid place-items-center py-2">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-cyan-300/35 bg-slate-900/40">
                <span className="radar-ring absolute inset-0 rounded-full border border-cyan-300/55" />
                <span className="radar-ring radar-ring-delay absolute inset-2 rounded-full border border-purple-300/45" />
                <span className="radar-sweep-arm absolute left-1/2 top-1/2 h-[44%] w-[2px]">
                  <span className="radar-sweep-line block h-full w-full rounded-full bg-gradient-to-t from-cyan-300/0 via-cyan-200 to-cyan-300" />
                </span>
                <span className="absolute inset-[34%] rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
              </div>
            </div>
            <p className="text-sm font-semibold tracking-[0.02em] text-cyan-50">Scanning local signals...</p>
            <div className="h-2.5 overflow-hidden rounded-full border border-cyan-200/25 bg-white/10">
              <div className="decrypt-bar h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-400" />
            </div>
          </div>
        )}

        {!isLoading && pulseData && pulseData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Intelligence Snippets</p>
              <button
                type="button"
                onClick={handleFetchPulse}
                aria-label="Refresh city pulse"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-200/30 bg-white/10 text-cyan-100 transition-colors hover:bg-white/20"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="space-y-2">
              {pulseData.map((snippet, index) => {
                const headline = trimHeadline(snippet.title);
                const isSafety = snippet.urgency || snippet.type === 'safety';
                const Icon = isSafety ? AlertTriangle : Newspaper;

                return (
                  <motion.a
                    key={`${snippet.title}-${snippet.publishedAt ?? snippet.source}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
                    href={snippet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start justify-between gap-3 rounded-xl border border-white/20 border-l-4 px-3 py-3 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20 ${
                      isSafety
                        ? 'border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-l-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon size={14} className={`mt-0.5 shrink-0 ${isSafety ? 'text-red-300' : 'text-cyan-200'}`} />
                      <div className="min-w-0">
                        <p className={`min-w-0 text-sm font-black leading-relaxed ${isSafety ? 'text-red-100' : 'text-white'}`}>
                          {headline}
                        </p>
                        <span className="mt-2 inline-flex rounded border border-cyan-200/25 bg-slate-950/50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/75">
                          {`src:${(snippet.source || 'feed').slice(0, 18)}`}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100/70">
                      <Clock3 size={11} />
                      <span>{toTimeAgo(snippet.publishedAt)}</span>
                    </div>
                  </motion.a>
                );
              })}
            </div>
            {errorMessage && (
              <p className="text-xs font-medium tracking-[0.01em] text-cyan-100/70 leading-relaxed">{errorMessage}</p>
            )}
          </div>
        )}

        {!isLoading && (!pulseData || pulseData.length === 0) && (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-400/20">
                  <span className="cyber-border-pulse absolute inset-0 rounded-full border border-emerald-200/50" />
                  <ShieldCheck size={18} className="text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/90">SYSTEM STATUS: NOMINAL</p>
                  <p className="mt-1 text-sm tracking-[0.01em] font-medium text-emerald-50 leading-relaxed">
                    {errorMessage || noResultsMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFetchPulse}
                aria-label="Refresh city pulse"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-200/40 bg-emerald-400/10 text-emerald-100 transition-colors hover:bg-emerald-300/20"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
