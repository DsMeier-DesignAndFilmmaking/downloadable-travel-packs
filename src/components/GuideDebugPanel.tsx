/**
 * Dev-only debug panel for the city guide: manifest, SW, cache, IndexedDB,
 * simulate-offline toggle, and manual cache trigger.
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Wifi, WifiOff, Database, HardDrive, RefreshCw, Bug } from 'lucide-react';

const DEBUG_STORAGE_KEY = 'debug_simulate_offline';
const CACHE_PREFIX = 'travel-guide';
const CACHE_VERSION = 'v1';
const IDB_NAME = 'travel-packs-db';
const IDB_STORE = 'city-packs';

export interface GuideDebugPanelProps {
  slug: string;
}

function getGuideCacheName(slug: string): string {
  return `${CACHE_PREFIX}-${slug}-${CACHE_VERSION}`;
}

export default function GuideDebugPanel({ slug }: GuideDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [swRegistrations, setSwRegistrations] = useState<string[]>([]);
  const [cacheKeys, setCacheKeys] = useState<string[]>([]);
  const [idbEntry, setIdbEntry] = useState<unknown>(null);
  const [networkOnline, setNetworkOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulateOffline, setSimulateOffline] = useState(
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DEBUG_STORAGE_KEY) === '1' : false
  );
  const [cachingInProgress, setCachingInProgress] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const link = document.querySelector('link[rel="manifest"]');
      if (link?.getAttribute('href')) {
        try {
          const res = await fetch(link.getAttribute('href')!);
          const data = await res.json();
          setManifest(data);
        } catch {
          setManifest({ _error: 'Failed to fetch manifest' });
        }
      } else {
        setManifest(null);
      }

      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        setSwRegistrations(regs.map((r) => r.scope));
      } else {
        setSwRegistrations([]);
      }

      if ('caches' in window) {
        const name = getGuideCacheName(slug);
        try {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          setCacheKeys(keys.map((r) => r.url));
        } catch {
          setCacheKeys([]);
        }
      } else {
        setCacheKeys([]);
      }

      if ('indexedDB' in window) {
        return new Promise<void>((resolve) => {
          const req = indexedDB.open(IDB_NAME);
          req.onerror = () => {
            setIdbEntry(null);
            resolve();
          };
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
              db.close();
              resolve();
              return;
            }
            const tx = db.transaction(IDB_STORE, 'readonly');
            const getReq = tx.objectStore(IDB_STORE).get(slug);
            getReq.onsuccess = () => {
              setIdbEntry(getReq.result ?? null);
              db.close();
              resolve();
            };
            getReq.onerror = () => {
              db.close();
              resolve();
            };
          };
        });
      } else {
        setIdbEntry(null);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const onOnline = () => setNetworkOnline(true);
    const onOffline = () => setNetworkOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, slug, load]);

  const handleSimulateOffline = useCallback((on: boolean) => {
    if (typeof sessionStorage === 'undefined') return;
    if (on) sessionStorage.setItem(DEBUG_STORAGE_KEY, '1');
    else sessionStorage.removeItem(DEBUG_STORAGE_KEY);
    setSimulateOffline(on);
    window.dispatchEvent(new CustomEvent('debug-simulate-offline', { detail: on }));
  }, []);

  const handleTriggerCache = useCallback(async () => {
    if (!slug || !navigator.serviceWorker?.controller) return;
    setCachingInProgress(true);
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_GUIDE', slug });
      await new Promise((r) => setTimeout(r, 1500));
      await load();
    } finally {
      setCachingInProgress(false);
    }
  }, [slug, load]);

  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 flex items-center justify-between gap-2 text-left text-xs font-bold text-amber-900 hover:bg-amber-100"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Bug size={14} aria-hidden />
          PWA Debug (dev only)
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200/80 pt-3">
          {loading && (
            <p className="text-[10px] text-amber-700">Loading…</p>
          )}

          {/* Online / Offline + Simulate */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
              {networkOnline ? <Wifi size={12} className="text-emerald-600" /> : <WifiOff size={12} className="text-rose-600" />}
              {networkOnline ? 'Online' : 'Offline'}
            </span>
            <label className="flex items-center gap-2 text-[10px] font-medium text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateOffline}
                onChange={(e) => handleSimulateOffline(e.target.checked)}
                className="rounded border-amber-300"
              />
              Simulate offline
            </label>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:opacity-50"
            >
              <RefreshCw size={10} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleTriggerCache}
              disabled={cachingInProgress || !navigator.serviceWorker?.controller}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-[#222222] text-white hover:bg-black disabled:opacity-50"
            >
              {cachingInProgress ? 'Caching…' : 'Cache this guide'}
            </button>
          </div>

          {/* Manifest */}
          <div>
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Database size={10} /> Manifest
            </p>
            <pre className="text-[10px] bg-white/80 rounded p-2 overflow-auto max-h-24 border border-amber-200">
              {manifest == null ? '—' : JSON.stringify({ start_url: manifest.start_url, scope: manifest.scope, id: manifest.id, name: manifest.name }, null, 0)}
            </pre>
          </div>

          {/* Service worker */}
          <div>
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Service worker</p>
            <ul className="text-[10px] text-amber-900 list-disc list-inside space-y-0.5">
              {swRegistrations.length === 0 ? <li>No registrations</li> : swRegistrations.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>

          {/* Cache contents */}
          <div>
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              <HardDrive size={10} /> Cache: {getGuideCacheName(slug)}
            </p>
            <ul className="text-[10px] text-amber-900 list-disc list-inside space-y-0.5 max-h-20 overflow-auto">
              {cacheKeys.length === 0 ? <li>Empty</li> : cacheKeys.map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>

          {/* IndexedDB */}
          <div>
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">IndexedDB ({IDB_NAME}/{IDB_STORE})</p>
            <p className="text-[10px] text-amber-900">
              {idbEntry == null ? 'No entry for this slug' : `Has data (savedAt: ${(idbEntry as { savedAt?: number })?.savedAt != null ? new Date((idbEntry as { savedAt: number }).savedAt).toISOString() : '—'})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
