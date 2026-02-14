/**
 * OfflineManager: list cached guides, show sizes, delete one or clear all.
 * Updates in real-time after mutations. For use on a settings/profile page.
 */

import { useState, useCallback, useEffect } from 'react';
import { Trash2, RefreshCw, Database, HardDrive } from 'lucide-react';
import {
  getAllGuides,
  getCacheSizeInfo,
  getStorageEstimate,
  deleteGuide,
  estimateGuideSizeBytes,
  type StoredGuide,
  type CacheSizeInfo,
  type StorageEstimate,
} from '@/utils/offline-storage';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/** Tell the service worker to clear its cache for a guide. */
function clearSwCacheForGuide(slug: string): void {
  try {
    navigator.serviceWorker?.controller?.postMessage?.({ type: 'CLEAR_GUIDE', slug });
  } catch {
    // ignore
  }
}

export default function OfflineManager() {
  const [guides, setGuides] = useState<StoredGuide[]>([]);
  const [cacheInfo, setCacheInfo] = useState<CacheSizeInfo | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [guidesList, sizeInfo, estimate] = await Promise.all([
        getAllGuides(),
        getCacheSizeInfo(),
        getStorageEstimate(),
      ]);
      setGuides(guidesList);
      setCacheInfo(sizeInfo);
      setStorageEstimate(estimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGuides([]);
      setCacheInfo(null);
      setStorageEstimate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    async (slug: string) => {
      setDeletingSlug(slug);
      setError(null);
      try {
        await deleteGuide(slug);
        clearSwCacheForGuide(slug);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingSlug(null);
      }
    },
    [load]
  );

  const handleClearAll = useCallback(async () => {
    if (guides.length === 0) return;
    setClearingAll(true);
    setError(null);
    try {
      await Promise.all(
        guides.map((g) => deleteGuide(g.slug).then(() => clearSwCacheForGuide(g.slug)))
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearingAll(false);
    }
  }, [guides, load]);

  if (loading && guides.length === 0) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-label="Offline guides"
      >
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw size={20} className="animate-spin" aria-hidden />
          <span className="text-sm font-medium">Loading cached guides…</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      aria-labelledby="offline-manager-title"
    >
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <h2
          id="offline-manager-title"
          className="text-base font-bold text-[#222222] flex items-center gap-2"
        >
          <Database size={20} className="text-slate-500" aria-hidden />
          Offline guides
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
          aria-label="Refresh list"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Total storage */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-4 text-sm text-slate-600 border-b border-slate-100">
        {cacheInfo && (
          <span className="flex items-center gap-1.5">
            <HardDrive size={16} aria-hidden />
            <strong className="text-[#222222]">{cacheInfo.count}</strong> guide{cacheInfo.count !== 1 ? 's' : ''} · {formatBytes(cacheInfo.bytes)} total
          </span>
        )}
        {storageEstimate && (
          <span>
            Storage: {formatBytes(storageEstimate.usage)} used
            {storageEstimate.quota > 0 && (
              <> ({storageEstimate.usagePercent}% of quota)</>
            )}
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {guides.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">
            No guides saved for offline use. Open a city guide and use “Download Pack” or “Add to Home Screen” to save it here.
          </div>
        ) : (
          guides.map((g) => {
            const sizeBytes = estimateGuideSizeBytes(g);
            const isDeleting = deletingSlug === g.slug;
            return (
              <div
                key={g.slug}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#222222] truncate">
                    {g.pack?.name ?? slugToName(g.slug)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatBytes(sizeBytes)} · saved {new Date(g.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(g.slug)}
                  disabled={isDeleting || clearingAll}
                  className="shrink-0 p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
                  aria-label={`Remove ${g.pack?.name ?? g.slug} from offline`}
                  title="Remove from offline"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
            );
          })
        )}
      </div>

      {guides.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
          >
            {clearingAll ? 'Clearing…' : 'Clear all offline guides'}
          </button>
        </div>
      )}
    </section>
  );
}
