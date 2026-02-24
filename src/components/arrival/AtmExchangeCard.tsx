/**
 * AtmExchangeCard — ATM and exchange info from props. Pure display.
 */

import { Banknote } from 'lucide-react';

export interface AtmExchangeCardProps {
  /** SIM / currency counter locations and tips (e.g. from tactical intel). */
  currencySimLocations?: string | null;
  /** Optional extra line (e.g. exchange tip). */
  exchangeTip?: string | null;
}

export default function AtmExchangeCard({
  currencySimLocations,
  exchangeTip,
}: AtmExchangeCardProps) {
  const locations = currencySimLocations?.trim();
  const tip = exchangeTip?.trim();
  const fallback = 'Use official SIM and currency counters in arrivals halls.';
  const text = locations || fallback;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2">
        <Banknote size={16} className="text-slate-500 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          ATM & Exchange
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-[#222222] leading-relaxed">
        {text}
      </p>
      {tip && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{tip}</p>
      )}
    </div>
  );
}
