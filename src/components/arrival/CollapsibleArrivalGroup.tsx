/**
 * CollapsibleArrivalGroup — collapsible section with title, optional subtitle and status.
 * Local UI state only (isOpen). No persistence, no useEffect, no data logic.
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface CollapsibleArrivalGroupProps {
  title: string;
  subtitle?: string | null;
  /** Soft status indicator (e.g. "Live", "Updated") — display only */
  statusIndicator?: string | null;
  /** Initial open state; local state can toggle. Resets on remount. */
  defaultOpen?: boolean;
  children: ReactNode;
  /** Optional data attribute for testing / CSS */
  dataGroup?: string;
}

export default function CollapsibleArrivalGroup({
  title,
  subtitle,
  statusIndicator,
  defaultOpen = true,
  children,
  dataGroup,
}: CollapsibleArrivalGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl border border-neutral-200/80 bg-white/50 overflow-hidden"
      data-arrival-group={dataGroup}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-neutral-50/80 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 rounded-t-xl"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown size={18} className="text-slate-400 shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden />
        )}
        <span className="text-sm font-bold text-slate-700 flex-1 min-w-0">
          {title}
        </span>
        {statusIndicator?.trim() && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {statusIndicator.trim()}
          </span>
        )}
      </button>
      {(subtitle?.trim()) && (
        <p className="px-4 pb-2 text-xs text-slate-500 -mt-1">
          {subtitle.trim()}
        </p>
      )}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-neutral-100/80">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
