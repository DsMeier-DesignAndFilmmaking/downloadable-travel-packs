/**
 * ArrivalSafetyNotesCard — static safety notes from existing data. Pure display.
 */

import { ShieldAlert } from 'lucide-react';

export interface ArrivalSafetyNotesCardProps {
  /** List of safety / scam / real-time hack notes. */
  notes?: string[] | null;
  /** Optional section title. */
  title?: string | null;
}

export default function ArrivalSafetyNotesCard({
  notes,
  title = 'Safety Notes',
}: ArrivalSafetyNotesCardProps) {
  const list = Array.isArray(notes)
    ? notes.filter((n): n is string => typeof n === 'string' && n.trim() !== '').map((n) => n.trim())
    : [];
  const label = title?.trim() || 'Safety Notes';

  if (list.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 md:p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-amber-700 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
          {label}
        </span>
      </div>
      <ul className="mt-3 space-y-2 list-none pl-0">
        {list.map((note, i) => (
          <li key={i} className="flex gap-2 text-sm text-amber-900/90 leading-relaxed">
            <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-600" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
