import { AlertCircle, Clock3 } from 'lucide-react';

import type { SyncStatus } from '@/hooks/useCityPack';

interface SyncButtonProps {
  status: SyncStatus;
  lastSynced: number | null;
}

const STALE_SYNC_MS = 24 * 60 * 60 * 1000;

export default function SyncButton({ status, lastSynced }: SyncButtonProps) {
  const isStale = lastSynced == null || Date.now() - lastSynced > STALE_SYNC_MS;
  const shouldShow = status === 'error' || isStale;

  if (!shouldShow) return null;

  const timestampLabel = lastSynced
    ? new Date(lastSynced).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'never';

  const icon = status === 'error' ? <AlertCircle size={14} /> : <Clock3 size={14} />;
  const label = status === 'error'
    ? `Sync failed. Last updated ${timestampLabel}`
    : `Last updated ${timestampLabel}`;
  const classes = status === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${classes}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
