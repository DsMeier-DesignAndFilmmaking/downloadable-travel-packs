/**
 * SystemHealthCard — transit, security, weather, air quality and offline message.
 * Pure presentational; no live API calls. Renders nothing if systemHealth is missing.
 */

import type { ArrivalLiveData } from '@/hooks/useArrivalLiveData';

export interface SystemHealth {
  transit?: string;
  security?: string;
  weather?: string;
  air_quality_note?: string;
  dynamic_ready?: boolean;
  offline_message?: string;
}

export interface SystemHealthCardProps {
  systemHealth?: SystemHealth | null;
  liveData?: ArrivalLiveData | null;
}

const ROWS: { key: keyof Pick<SystemHealth, 'transit' | 'security' | 'weather' | 'air_quality_note'>; label: string }[] = [
  { key: 'transit', label: 'Transit' },
  { key: 'security', label: 'Security' },
  { key: 'weather', label: 'Weather' },
  { key: 'air_quality_note', label: 'Air Quality Note' },
];

export default function SystemHealthCard({ systemHealth, liveData }: SystemHealthCardProps) {
  if (systemHealth == null || typeof systemHealth !== 'object') {
    return null;
  }
  void liveData; // Reserved for future live API integration

  const hasRows = ROWS.some(
    ({ key }) => typeof systemHealth[key] === 'string' && (systemHealth[key] as string).trim() !== ''
  );
  const offlineMessage = typeof systemHealth.offline_message === 'string' ? systemHealth.offline_message.trim() : '';
  const hasContent = hasRows || systemHealth.dynamic_ready === true || offlineMessage !== '';

  if (!hasContent) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          System Health
        </p>
        {systemHealth.dynamic_ready === true ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            API Ready
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-0.5">
        {ROWS.map(({ key, label }) => {
          const value = systemHealth[key];
          const text = typeof value === 'string' ? value.trim() : '';
          if (text === '') return null;
          return (
            <div
              key={key}
              className="border-b border-neutral-100 py-2 last:border-b-0 last:pb-0"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#222222] leading-relaxed tracking-[0.01em]">
                {text}
              </p>
            </div>
          );
        })}
      </div>
      {offlineMessage !== '' ? (
        <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-slate-500 italic">
          {offlineMessage}
        </p>
      ) : null}
    </div>
  );
}
