import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Newspaper, RefreshCw } from 'lucide-react';
import { fetchCityPulse, type PulseIntelligence } from '@/services/pulseService';

type CityPulseBlockProps = {
  citySlug: string;
  cityName: string;
};

type CachedPulse = {
  timestamp: number;
  data: PulseIntelligence[];
};

const PULSE_TTL_MS = 6 * 60 * 60 * 1000;
const FALLBACK_TEXT = 'Pulse unavailable: Check local news for updates';
const PARSE_ERROR_TEXT = 'Current pulse unavailable. Please check local news.';

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

export default function CityPulseBlock({ citySlug, cityName }: CityPulseBlockProps) {
  const [pulseData, setPulseData] = useState<PulseIntelligence[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storageKey = useMemo(() => `pulse_data_${citySlug}`, [citySlug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setPulseData(null);
    setStatus('idle');
    setErrorMessage(null);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const cached = JSON.parse(raw) as CachedPulse;
      if (!cached?.timestamp || !Array.isArray(cached?.data)) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      const isStale = Date.now() - cached.timestamp > PULSE_TTL_MS;
      if (isStale) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      setPulseData(cached.data);
      setStatus('ready');
    } catch {
      window.localStorage.removeItem(storageKey);
      setStatus('error');
      setErrorMessage(PARSE_ERROR_TEXT);
    }
  }, [storageKey]);

  const handleFetchPulse = useCallback(async () => {
    setStatus('fetching');
    setErrorMessage(null);

    const previous = pulseData;

    try {
      const result = await fetchCityPulse(cityName);
      if (!result.length) {
        if (previous?.length) {
          setPulseData(previous);
          setStatus('ready');
          setErrorMessage(FALLBACK_TEXT);
          return;
        }
        setStatus('error');
        setErrorMessage(FALLBACK_TEXT);
        return;
      }

      setPulseData(result);
      setStatus('ready');

      if (typeof window !== 'undefined') {
        const payload: CachedPulse = {
          timestamp: Date.now(),
          data: result,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('CITY_PULSE_PARSE_ERROR')
          ? PARSE_ERROR_TEXT
          : FALLBACK_TEXT;

      if (previous?.length) {
        setPulseData(previous);
        setStatus('ready');
        setErrorMessage(message);
        return;
      }

      setStatus('error');
      setErrorMessage(message);
    }
  }, [cityName, pulseData, storageKey]);

  return (
    <section className="space-y-3">
      <h2 className="px-2 text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">City Pulse</h2>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        {status === 'idle' && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Live City Pulse</p>
              <p className="mt-1 text-sm md:text-[15px] font-medium tracking-[0.01em] text-slate-700 leading-relaxed">
                Synchronize with current events and safety alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFetchPulse}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#222222] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-transform active:scale-[0.98]"
            >
              [ ✦ Reveal Live Pulse ]
            </button>
          </div>
        )}

        {status === 'fetching' && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Live City Pulse</p>
            <p className="text-sm font-medium text-slate-600">Scanning city vitals...</p>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-9/12 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        )}

        {status === 'ready' && pulseData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Intelligence Snippets</p>
              <button
                type="button"
                onClick={handleFetchPulse}
                aria-label="Refresh city pulse"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {pulseData.map((snippet) => {
                const headline = trimHeadline(snippet.title);
                const isSafety = snippet.urgency || snippet.type === 'safety';
                const Icon = isSafety ? AlertTriangle : Newspaper;

                return (
                  <a
                    key={`${snippet.title}-${snippet.publishedAt ?? snippet.source}`}
                    href={snippet.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-slate-50 ${
                      isSafety ? 'border-l-2 border-l-red-400' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon size={14} className={`mt-0.5 shrink-0 ${isSafety ? 'text-red-600' : 'text-slate-500'}`} />
                      <p className={`min-w-0 text-sm font-bold leading-relaxed ${isSafety ? 'text-red-700' : 'text-slate-800'}`}>
                        {headline}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      <Clock3 size={11} />
                      <span>{toTimeAgo(snippet.publishedAt)}</span>
                    </div>
                  </a>
                );
              })}
            </div>
            {errorMessage && (
              <p className="text-xs font-medium tracking-[0.01em] text-slate-500 leading-relaxed">{errorMessage}</p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-sm tracking-[0.01em] font-medium text-slate-500 leading-relaxed">
              {errorMessage || FALLBACK_TEXT}
            </p>
            <button
              type="button"
              onClick={handleFetchPulse}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-50"
            >
              Retry Pulse
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
