import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export type LiveCityPulseProps = {
  cityId: string;
  lat?: number | null;
  lng?: number | null;
};

type GooglePulseApiResponse = {
  title: string;
  context_id: string;
  current_conditions: string;
  action: string;
  impact: string;
  neighborhood_investment: string;
  is_live: boolean;
  source_ref: string;
};

type GooglePulseErrorResponse = {
  error?: string;
  status?: number;
  statusText?: string;
  body?: unknown;
  details?: unknown;
};

function normalizeCityId(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

export default function LiveCityPulse({ cityId, lat, lng }: LiveCityPulseProps) {
  const [data, setData] = useState<GooglePulseApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedCityId = useMemo(() => normalizeCityId(cityId), [cityId]);
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  useEffect(() => {
    if (!normalizedCityId || !hasCoordinates) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/vitals/google-pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cityId: normalizedCityId,
            lat,
            lng,
          }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | GooglePulseApiResponse
          | GooglePulseErrorResponse
          | null;

        if (!response.ok) {
          const errPayload = payload as GooglePulseErrorResponse | null;
          const message =
            errPayload?.error ||
            `Google Pulse API error ${errPayload?.status ?? response.status}`;
          if (!cancelled) {
            setError(message);
            setData(null);
          }
          return;
        }

        if (!payload || typeof (payload as GooglePulseApiResponse).title !== 'string') {
          if (!cancelled) {
            setError('Unexpected Google Pulse payload shape.');
            setData(null);
          }
          return;
        }

        if (!cancelled) {
          setData(payload as GooglePulseApiResponse);
          setError(null);
        }
      } catch (err) {
        if (cancelled || err instanceof DOMException) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [normalizedCityId, hasCoordinates, lat, lng]);

  const isLive = data?.is_live === true;

  if (!hasCoordinates) {
    return (
      <section className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-700">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          City Vitals
        </p>
        <p className="mt-2 font-semibold">
          Live air-quality vitals are unavailable for this city because coordinates are missing.
        </p>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-[#f9f8f2] px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative z-10 space-y-4 animate-pulse">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="grid gap-2">
            <div className="h-16 w-full rounded-xl bg-rose-100/80" />
            <div className="h-16 w-full rounded-xl bg-emerald-100/80" />
            <div className="h-16 w-full rounded-xl bg-amber-100/80" />
          </div>
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="relative overflow-hidden rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
              City Vitals
            </p>
            <p className="mt-2 font-semibold">Live Data Unavailable</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-rose-700">
            Live Data Unavailable
          </span>
        </div>
        <p className="mt-3 text-xs font-mono text-rose-700 break-all">{error}</p>
      </section>
    );
  }

  const title = data?.title ?? '';
  const currentConditions = data?.current_conditions ?? '';
  const action = data?.action ?? '';
  const impact = data?.impact ?? '';
  const neighborhoodInvestment = data?.neighborhood_investment ?? '';
  const sourceRef = data?.source_ref ?? '';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden border border-stone-300 border-l-2 border-l-rose-600 bg-stone-50/85 px-5 py-6 text-sm leading-relaxed text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur-sm"
      style={{ borderRadius: '22px 18px 26px 18px / 18px 24px 18px 24px' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative z-10 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span
              className={`mt-1 h-2.5 w-2.5 rounded-full border ${
                isLive
                  ? 'border-emerald-700/40 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                  : 'border-amber-700/30 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
              }`}
            />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
                City Vitals
              </p>
              <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 font-mono">
                {title || normalizeCityId(cityId)}
              </h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${
                isLive
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {isLive ? 'Live Google Signal' : 'Live Data Unavailable'}
            </span>
            {sourceRef && (
              <p className="max-w-[220px] text-right text-[10px] font-medium text-slate-500">
                {sourceRef}
              </p>
            )}
          </div>
        </header>

        <article className="rounded-lg border border-rose-200 border-l-2 border-l-rose-600 bg-rose-50/80 p-3">
          <p className="text-[11px] font-mono font-black uppercase tracking-[0.16em] text-rose-700">
            Current Conditions
          </p>
          <p className="mt-1 text-sm text-slate-700">{currentConditions}</p>
        </article>

        <article className="rounded-lg border border-emerald-200 border-l-2 border-l-emerald-600 bg-emerald-50/80 p-3">
          <p className="text-[11px] font-mono font-black uppercase tracking-[0.16em] text-emerald-700">
            What You Can Do
          </p>
          <p className="mt-1 text-sm text-slate-700">{action}</p>
        </article>

        <article className="rounded-lg border border-amber-200 border-l-2 border-l-amber-500 bg-amber-50/80 p-3">
          <p className="text-[11px] font-mono font-black uppercase tracking-[0.16em] text-amber-700">
            How It Helps
          </p>
          <p className="mt-1 text-sm text-slate-700">{impact}</p>
        </article>

        {neighborhoodInvestment && (
          <div className="border-t border-stone-200/80 pt-3">
            <div className="ml-auto inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-white shadow-md">
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-300">
                Neighborhood Investment
              </p>
              <span className="ml-2 text-sm font-black text-emerald-300">
                {neighborhoodInvestment}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}