import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchCityPack } from '../services/cityService'
import type { CityPack } from '../types/cityPack'

// src/hooks/useCityPack.ts (or wherever your types live)
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'complete';

export interface UseCityPackResult {
  cityData: CityPack | null
  isLoading: boolean
  isOffline: boolean      // Physical connection status
  isLocalData: boolean    // Data source pedigree (Cache vs Live)
  syncStatus: SyncStatus  // The "Handshake" state for the UI
  lastSynced: number | null // Unix timestamp of last successful sync
  error: Error | null
  refetch: () => Promise<void>
}

export function useCityPack(slug: string | undefined): UseCityPackResult {
  const [cityData, setCityData] = useState<CityPack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocalData, setIsLocalData] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Tactical States
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [networkOffline, setNetworkOffline] = useState(!navigator.onLine)
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

  // 1. Real-time Network Listener
  useEffect(() => {
    const handleStatus = () => setNetworkOffline(!navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  // DEV: listen for debug "simulate offline" toggle
  useEffect(() => {
    if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return
    const handler = (e: Event) => setDebugSimulateOffline((e as CustomEvent<boolean>).detail)
    window.addEventListener('debug-simulate-offline', handler)
    return () => window.removeEventListener('debug-simulate-offline', handler)
  }, [])

  // 2. Data Loading Logic
  const loadData = useCallback(async (isManualRefetch = false) => {
    if (!slug) {
      setCityData(null)
      setIsLoading(false)
      return
    }

    // If manual, trigger the 'syncing' UI state
    if (isManualRefetch) setSyncStatus('syncing')
    else setIsLoading(true)
    
    setError(null)

    try {
      const { pack, isOffline: fromLocal } = await fetchCityPack(slug)
      
      setCityData(pack)
      setIsLocalData(fromLocal)

      if (isManualRefetch || !fromLocal) {
        setLastSynced(Date.now())
        setSyncStatus('success')
        
        // Handshake Reset: Return to idle after 3 seconds
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
        successTimeoutRef.current = setTimeout(() => {
          setSyncStatus('idle')
        }, 3000)
      }
    } catch (err) {
      setSyncStatus('error')
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  // Initial Load
  useEffect(() => {
    loadData(false)
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [loadData])

  // Wrapper for manual sync trigger
  const refetch = useCallback(async () => {
    // Prevent double-syncing if already in progress
    if (syncStatus === 'syncing') return
    await loadData(true)
  }, [loadData, syncStatus])

  return { 
    cityData, 
    isLoading, 
    isOffline,     
    isLocalData,
    syncStatus,
    lastSynced,
    error, 
    refetch 
  }
}