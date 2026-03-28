import { useEffect, useState, useCallback, useRef } from 'react'

import { fetchCityPack } from '../services/cityService'
import type { CityPack } from '../types/cityPack'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'complete'

export interface UseCityPackResult {
  cityData: CityPack | null
  isLoading: boolean
  isOffline: boolean
  isLocalData: boolean
  syncStatus: SyncStatus
  lastSynced: number | null
  error: Error | null
  refetch: () => Promise<void>
}

const PASSIVE_SYNC_INTERVAL_MS = 30 * 60 * 1000
const LAST_SYNC_KEY_PREFIX = 'sync_city_pack_'
const PERIODIC_SYNC_TAG = 'city-data-sync'

type PeriodicSyncManagerLike = {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>
}

type PeriodicSyncRegistrationLike = ServiceWorkerRegistration & {
  periodicSync?: PeriodicSyncManagerLike
}

function getLastSyncStorageKey(slug: string): string {
  return `${LAST_SYNC_KEY_PREFIX}${slug}`
}

export function useCityPack(slug: string | undefined): UseCityPackResult {
  const [cityData, setCityData] = useState<CityPack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocalData, setIsLocalData] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [networkOffline, setNetworkOffline] = useState(
    typeof navigator === 'undefined' ? false : !navigator.onLine
  )
  const [debugSimulateOffline, setDebugSimulateOffline] = useState(
    typeof import.meta !== 'undefined' && import.meta.env?.DEV && typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('debug_simulate_offline') === '1'
      : false
  )

  const isOffline =
    typeof import.meta !== 'undefined' && import.meta.env?.DEV && debugSimulateOffline
      ? true
      : networkOffline

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPassiveSyncAttemptRef = useRef<number | null>(null)
  const syncStorageKey = slug ? getLastSyncStorageKey(slug) : null

  const persistLastSynced = useCallback((timestamp: number) => {
    setLastSynced(timestamp)
    if (!syncStorageKey || typeof localStorage === 'undefined') return
    localStorage.setItem(syncStorageKey, String(timestamp))
  }, [syncStorageKey])

  useEffect(() => {
    if (!syncStorageKey || typeof localStorage === 'undefined') {
      setLastSynced(null)
      return
    }
    const raw = localStorage.getItem(syncStorageKey)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    setLastSynced(Number.isFinite(parsed) ? parsed : null)
  }, [syncStorageKey])

  // Real-time network listener
  useEffect(() => {
    const handleOnline = () => {
      if (typeof navigator === 'undefined') return
      setNetworkOffline(false)
      loadData({ manual: false, silent: true })
    }
    const handleOffline = () => {
      if (typeof navigator === 'undefined') return
      setNetworkOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadData])

  // DEV: listen for debug "simulate offline" toggle
  useEffect(() => {
    if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return
    const handler = (e: Event) => setDebugSimulateOffline((e as CustomEvent<boolean>).detail)
    window.addEventListener('debug-simulate-offline', handler)
    return () => window.removeEventListener('debug-simulate-offline', handler)
  }, [])

  // Register background periodic sync when supported
  useEffect(() => {
    if (!slug || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.ready
      .then(async (registration) => {
        const periodicSync = (registration as PeriodicSyncRegistrationLike).periodicSync
        if (!periodicSync) return

        try {
          await periodicSync.register(PERIODIC_SYNC_TAG, {
            minInterval: PASSIVE_SYNC_INTERVAL_MS,
          })
        } catch {
          // Not all browsers grant/use periodic sync; foreground passive sync still covers freshness.
        }
      })
      .catch(() => {})
  }, [slug])

  const loadData = useCallback(async (options: { manual?: boolean; silent?: boolean } = {}) => {
    const { manual = false, silent = false } = options

    if (!slug) {
      setCityData(null)
      setIsLoading(false)
      return
    }

    if (!silent) {
      if (manual) setSyncStatus('syncing')
      else setIsLoading(true)
    }

    setError(null)

    try {
      const { pack, isOffline: fromLocal } = await fetchCityPack(slug)

      setCityData(pack)
      setIsLocalData(fromLocal)

      if (!fromLocal) {
        persistLastSynced(Date.now())
      }

      if (manual) {
        if (fromLocal) {
          setSyncStatus('error')
        } else {
          setSyncStatus('success')
          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
          successTimeoutRef.current = setTimeout(() => {
            setSyncStatus('idle')
          }, 3000)
        }
      }
    } catch (err) {
      setSyncStatus('error')
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [persistLastSynced, slug])

  // Initial load
  useEffect(() => {
    void loadData({ manual: false, silent: false })
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [loadData])

  // Passive foreground sync (every 30+ minutes, only while online)
  useEffect(() => {
    if (!slug || isOffline || isLoading) return

    const now = Date.now()
    const lastAttempt = lastPassiveSyncAttemptRef.current ?? 0
    const lastKnownSuccess = lastSynced ?? 0
    const mostRecentSyncActivity = Math.max(lastAttempt, lastKnownSuccess)

    if (now - mostRecentSyncActivity < PASSIVE_SYNC_INTERVAL_MS) return

    lastPassiveSyncAttemptRef.current = now
    void loadData({ manual: false, silent: true })
  }, [isLoading, isOffline, lastSynced, loadData, slug])

  // Wrapper for explicit/manual sync trigger
  const refetch = useCallback(async () => {
    if (syncStatus === 'syncing') return
    await loadData({ manual: true, silent: false })
  }, [loadData, syncStatus])

  return {
    cityData,
    isLoading,
    isOffline,
    isLocalData,
    syncStatus,
    lastSynced,
    error,
    refetch,
  }
}
