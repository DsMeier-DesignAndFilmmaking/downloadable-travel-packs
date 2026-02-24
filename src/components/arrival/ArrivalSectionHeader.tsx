/**
 * ArrivalSectionHeader — section title with icon and optional subtitle.
 * Pure presentational; no state, no side effects.
 */

import type { ReactNode } from 'react';

export interface ArrivalSectionHeaderProps {
  title: string;
  subtitle?: string | null;
  icon?: ReactNode;
}

export default function ArrivalSectionHeader({
  title,
  subtitle,
  icon,
}: ArrivalSectionHeaderProps) {
  return (
    <header className="px-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.3em]">
          {title}
        </h2>
      </div>
      {subtitle?.trim() && (
        <p className="mt-1 text-xs text-slate-500 font-medium max-w-xl">
          {subtitle.trim()}
        </p>
      )}
    </header>
  );
}
