import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ImpactLedgerProps = {
  ActivityType: string;
  Location_ID: string;
  Duration: number;
  VendorType?: string;
  category?: string;
  distanceKm?: number;
  reusable?: boolean;
  civicEngagement?: boolean;
  offPeak?: boolean;
  vendorName?: string;
};

type VectorTriple = {
  mobility: number;
  locality: number;
  restoration: number;
};

const WEIGHTS = {
  mobility: 0.4,
  locality: 0.4,
  restoration: 0.2,
} as const;

const MOBILITY_SCORE: Record<string, number> = {
  walk: 1,
  walking: 1,
  bike: 1,
  biking: 1,
  bicycle: 1,
  skate: 1,
  skating: 1,
  train: 0.7,
  subway: 0.7,
  metro: 0.7,
  bus: 0.7,
  tram: 0.7,
  rideshare_ev: 0.3,
  ev_rideshare: 0.3,
  carpool: 0.3,
  private_ice: 0,
  solo_rideshare: 0,
};

const LOCALITY_SCORE: Record<string, number> = {
  indie: 1,
  direct_local: 1,
  local: 1,
  regional: 0.6,
  global: 0.1,
  chain: 0.1,
};

const RADIAL_AXES = [
  { key: 'mobility', label: 'Getting Around', angle: -90 },
  { key: 'locality', label: 'Supporting Local', angle: 30 },
  { key: 'restoration', label: 'Positive Actions', angle: 150 },
] as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function inferCategory(locationId: string, explicitCategory?: string): string {
  if (explicitCategory && explicitCategory.trim()) return explicitCategory.trim().toLowerCase();
  if (!locationId) return '';
  return locationId.split('_')[0]?.trim().toLowerCase() ?? '';
}

function deriveVectors(props: ImpactLedgerProps): VectorTriple {
  const activityKey = props.ActivityType.trim().toLowerCase();
  const vendorKey = (props.VendorType ?? '').trim().toLowerCase();
  const categoryKey = inferCategory(props.Location_ID, props.category);

  // Mobility base tier and shadow mapping.
  let mobility = MOBILITY_SCORE[activityKey] ?? 0.3;
  if (typeof props.distanceKm === 'number' && props.distanceKm < 1) {
    mobility = 1;
  }
  if (categoryKey === 'park') {
    mobility = 1;
  }

  // Locality base tier and shadow mapping.
  let locality = LOCALITY_SCORE[vendorKey] ?? 0.6;
  if (vendorKey === 'indie') {
    locality = 1;
  }

  // Restoration is bonus-driven and clamped to [0, 1].
  let restoration = 0;
  if (props.reusable) restoration += 0.2;
  if (props.civicEngagement) restoration += 0.3;
  if (props.offPeak) restoration += 0.2;

  // Shadow mapping: park contributes to restoration in addition to mobility.
  if (categoryKey === 'park') {
    restoration += 0.2;
  }

  // Duration-derived signal to keep Duration part of the internal computation.
  const durationSignal = clamp((props.Duration || 0) / 120) * 0.2;
  restoration += durationSignal;

  return {
    mobility: clamp(mobility),
    locality: clamp(locality),
    restoration: clamp(restoration),
  };
}

function toRadarPoint(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function toRadarPolygonPoints(values: number[], cx: number, cy: number, maxRadius: number): string {
  return values
    .map((value, index) => {
      const axis = RADIAL_AXES[index];
      const point = toRadarPoint(cx, cy, maxRadius * clamp(value), axis.angle);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

export default function ImpactLedger(props: ImpactLedgerProps) {
  const [confirmed, setConfirmed] = useState(false);
  const filterId = useId().replace(/:/g, '_');

  const vectors = useMemo(() => deriveVectors(props), [props]);
  const score = useMemo(() => {
    const rawScore =
      vectors.mobility * WEIGHTS.mobility +
      vectors.locality * WEIGHTS.locality +
      vectors.restoration * WEIGHTS.restoration;
    return Math.round(clamp(rawScore) * 100);
  }, [vectors]);

  const vectorPercentages = useMemo(
    () => [vectors.mobility, vectors.locality, vectors.restoration].map((value) => Math.round(value * 100)),
    [vectors],
  );

  const cx = 120;
  const cy = 120;
  const maxRadius = 78;
  const polygonPoints = toRadarPolygonPoints(
    [vectors.mobility, vectors.locality, vectors.restoration],
    cx,
    cy,
    maxRadius,
  );

  const estimatedWalkMiles =
    props.ActivityType.toLowerCase().includes('walk') || props.ActivityType.toLowerCase().includes('bike')
      ? ((props.Duration / 60) * 3).toFixed(1)
      : null;
  const isWalking = props.ActivityType.toLowerCase().includes('walk');
  const isBiking = props.ActivityType.toLowerCase().includes('bike');

  const vendorLabel = props.vendorName || (props.VendorType === 'indie' ? 'this independent vendor' : 'this venue');
  const isLocalSpend = ['indie', 'local', 'direct_local'].includes((props.VendorType ?? '').toLowerCase());

  const restorationMicrocopy = props.reusable
    ? 'Using your reusable cup or bag - small action, big impact.'
    : props.civicEngagement
      ? 'Visiting civic spaces like libraries or gardens - love that.'
      : props.offPeak
        ? 'Off-peak sightseeing - less crowd, more peace.'
        : 'Every eco-friendly choice adds up while you explore.';

  const pathWeighed = `${vectorPercentages[0]}/${vectorPercentages[1]}/${vectorPercentages[2]}`;
  const hasPerk = score > 80;
  const perkMask =
    'radial-gradient(circle at left center, transparent 0 7px, black 7px 100%) left / 14px 100% repeat-y, linear-gradient(black, black)';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative overflow-hidden border border-slate-300 bg-[#f9f8f2] px-5 py-6 font-sans text-sm font-normal leading-relaxed text-slate-800 shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
      style={{
        borderRadius: '26px 22px 30px 20px / 20px 30px 22px 28px',
        filter: `url(#${filterId})`,
      }}
      aria-labelledby="impact-ledger-title"
    >
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="0.5" />
          </filter>
        </defs>
      </svg>

      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <AnimatePresence>
        {confirmed && (
          <motion.div
            initial={{ opacity: 0, y: 8, rotate: -10, scale: 1.12 }}
            animate={{ opacity: 0.95, y: 0, rotate: -8, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none absolute right-4 top-4 z-20 rounded-md border-2 border-emerald-700 bg-emerald-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800"
            aria-hidden
          >
            Stamped! Great choice!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 space-y-5">
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Field Note / Today</p>
          <h3 id="impact-ledger-title" className="text-lg font-black tracking-tight text-slate-900">
            Your City Impact
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">See how your choices help the city today!</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
            <span className="uppercase tracking-[0.16em]">Path Weighed: {pathWeighed}</span>
            <span className="uppercase tracking-[0.16em]">City Impact Score: {score}/100</span>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-start">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-slate-700">
              Observation:{' '}
              {isWalking && estimatedWalkMiles
                ? `Nice! You walked about ${estimatedWalkMiles} miles today - helping the city breathe easier.`
                : isBiking && estimatedWalkMiles
                  ? `You biked about ${estimatedWalkMiles} miles today - less traffic, more fun.`
                  : `You logged ${props.Duration} minutes in this city zone - every choice shapes your impact.`}
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              {isLocalSpend
                ? `Good choice: spending at ${vendorLabel} keeps money in the neighborhood.`
                : `Quick note: spending at ${vendorLabel} still counts, and local stops can boost your score even more.`}
            </p>
            <ul className="space-y-2">
              <li className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Getting Around</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  Points for walking, biking, or public transit.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">Current route score: {vectorPercentages[0]}.</p>
              </li>
              <li className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Supporting Local</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  Points for shopping at local shops and cafes.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">Neighborhood support score: {vectorPercentages[1]}.</p>
              </li>
              <li className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Positive Actions</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  Extra points for eco-friendly or quiet-time visits.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{restorationMicrocopy}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">Bonus score: {vectorPercentages[2]}.</p>
              </li>
            </ul>
          </div>

          <div className="mx-auto w-full max-w-[260px]">
            <svg
              viewBox="0 0 240 240"
              className="h-auto w-full"
              role="img"
              aria-labelledby="impact-radar-title impact-radar-desc"
            >
              <title id="impact-radar-title">Your City Impact radial web</title>
              <desc id="impact-radar-desc">
                Getting Around {vectorPercentages[0]}, Supporting Local {vectorPercentages[1]}, Positive Actions {vectorPercentages[2]}.
              </desc>

              {[0.25, 0.5, 0.75, 1].map((step) => {
                const ring = toRadarPolygonPoints([step, step, step], cx, cy, maxRadius);
                return <polygon key={step} points={ring} fill="none" stroke="#cbd5e1" strokeWidth="1" />;
              })}

              {RADIAL_AXES.map((axis) => {
                const edge = toRadarPoint(cx, cy, maxRadius, axis.angle);
                return <line key={axis.key} x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke="#94a3b8" strokeWidth="1" />;
              })}

              <motion.polygon
                key={score}
                points={polygonPoints}
                fill="rgba(37, 99, 235, 0.24)"
                stroke="#2563eb"
                strokeWidth="2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />

              {RADIAL_AXES.map((axis, index) => {
                const point = toRadarPoint(cx, cy, maxRadius * (vectorPercentages[index] / 100), axis.angle);
                return (
                  <circle
                    key={axis.key}
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill="#1d4ed8"
                    tabIndex={0}
                    aria-label={`${axis.label} vector ${vectorPercentages[index]} out of 100`}
                  />
                );
              })}

              <circle cx={cx} cy={cy} r="22" fill="#0f172a" />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                className="fill-white text-[11px] font-bold"
                aria-hidden
              >
                {score}
              </text>
            </svg>

            <p className="mt-2 text-center text-xs text-slate-600 leading-relaxed">
              Path Weighed: Getting Around, Supporting Local, and Positive Actions are blended into your 100-point city impact score.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setConfirmed(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors duration-150 ease-out hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Confirm Field Note
          </motion.button>
          <span className="text-xs text-slate-600">
            Status: {confirmed ? 'Observation noted - nice work!' : 'Ready to log this travel choice.'}
          </span>
        </div>

        <AnimatePresence>
          {hasPerk && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="border border-dashed border-emerald-500 bg-emerald-50/80 px-4 py-3"
              style={{
                borderRadius: '14px 10px 15px 12px / 13px 15px 10px 14px',
                WebkitMaskImage: perkMask,
                maskImage: perkMask,
              }}
              aria-label="Special local perk visual coupon"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Special local perk unlocked!</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-900">
                You earned a little thank-you from the neighborhood! Just for fun - no need to redeem.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sr-only" aria-live="polite">
          Your city impact score is {score} out of 100. Getting Around {vectorPercentages[0]}, Supporting Local{' '}
          {vectorPercentages[1]}, Positive Actions {vectorPercentages[2]}.
        </div>
      </div>
    </motion.section>
  );
}
