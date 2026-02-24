/**
 * First60ProtocolCard — checklist of first-60-minutes arrival steps.
 * Renders only when first60Protocol is a non-empty array.
 */

import { Check } from 'lucide-react';

export interface First60ProtocolCardProps {
  first60Protocol?: string[] | null;
}

export default function First60ProtocolCard({ first60Protocol }: First60ProtocolCardProps) {
  if (first60Protocol == null || !Array.isArray(first60Protocol)) {
    return null;
  }

  const items = first60Protocol.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        First 60 Minutes
      </p>
      <ul className="mt-3 space-y-2 list-none pl-0">
        {items.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded-full bg-emerald-100 p-0.5" aria-hidden>
              <Check size={12} className="text-emerald-600" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium text-[#222222] leading-relaxed tracking-[0.01em]">
              {text.trim()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
