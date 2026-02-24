/**
 * TransportOptionsGrid — transport options as card grid.
 * Highlights cheapest and fastest visually only. No state-affecting calculations.
 */

import { Car, Train, Zap } from 'lucide-react';

export interface TransportOption {
  key: string;
  label: string;
  value: string;
  highlight?: 'cheapest' | 'fastest' | null;
}

export interface TransportOptionsGridProps {
  options?: TransportOption[];
  /** Legacy shape: if provided, options are derived for grid + cheapest/fastest highlight */
  transportMatrix?: {
    cheapest?: string;
    fastest_traffic?: string;
    door_to_door?: string;
    comfort_luggage?: string;
  } | null;
}

function OptionCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'cheapest' | 'fastest' | null;
}) {
  const isCheapest = highlight === 'cheapest';
  const isFastest = highlight === 'fastest';
  const Icon = isCheapest ? Zap : isFastest ? Train : Car;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isCheapest || isFastest
          ? 'border-amber-200 bg-amber-50/70'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={14} className="text-slate-500 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        {isCheapest && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Cheapest
          </span>
        )}
        {isFastest && (
          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Fastest
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-[#222222] leading-relaxed">
        {value}
      </p>
    </div>
  );
}

export default function TransportOptionsGrid({
  options: optionsProp,
  transportMatrix,
}: TransportOptionsGridProps) {
  const options: TransportOption[] =
    optionsProp?.length
      ? optionsProp
      : transportMatrix
        ? [
            {
              key: 'cheapest',
              label: 'Cheapest',
              value: transportMatrix.cheapest?.trim() ?? '',
              highlight: 'cheapest' as const,
            },
            {
              key: 'fastest_traffic',
              label: 'Fastest (Traffic)',
              value: transportMatrix.fastest_traffic?.trim() ?? '',
              highlight: 'fastest' as const,
            },
            {
              key: 'door_to_door',
              label: 'Door-to-door',
              value: transportMatrix.door_to_door?.trim() ?? '',
            },
            {
              key: 'comfort_luggage',
              label: 'Comfort (Luggage)',
              value: transportMatrix.comfort_luggage?.trim() ?? '',
            },
          ].filter((o) => o.value !== '') as TransportOption[]
        : [];

  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 px-0.5">
        Transport Options
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <OptionCard
            key={opt.key}
            label={opt.label}
            value={opt.value}
            highlight={opt.highlight}
          />
        ))}
      </div>
    </div>
  );
}
