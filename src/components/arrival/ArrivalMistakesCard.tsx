/**
 * ArrivalMistakesCard — list of common arrival mistakes to avoid.
 * Renders only when arrivalMistakes is a non-empty array. Warning styling.
 */

import { AlertTriangle } from 'lucide-react';

export interface ArrivalMistakesCardProps {
  arrivalMistakes?: string[] | null;
}

export default function ArrivalMistakesCard({ arrivalMistakes }: ArrivalMistakesCardProps) {
  if (arrivalMistakes == null || !Array.isArray(arrivalMistakes)) {
    return null;
  }

  const items = arrivalMistakes.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 md:p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
        Avoid These
      </p>
      <ul className="mt-3 space-y-2 list-none pl-0">
        {items.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded-full bg-amber-200/80 p-0.5" aria-hidden>
              <AlertTriangle size={12} className="text-amber-700" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-medium text-amber-900/90 leading-relaxed tracking-[0.01em]">
              {text.trim()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
