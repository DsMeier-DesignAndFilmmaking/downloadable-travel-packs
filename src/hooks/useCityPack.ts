import { useEffect, useState, useCallback } from 'react'
import { fetchCityPack } from '../services/cityService'
import type { CityPack } from '../types/cityPack'

export interface UseCityPackResult {
  cityData: CityPack | null
  isLoading: boolean
  isOffline: boolean
  error: Error | null
  refetch: () => Promise<void> // Added this
}

export function useCityPack(slug: string | undefined): UseCityPackResult {
  const [cityData, setCityData] = useState<CityPack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (!slug) {
      setCityData(null)
      setIsLoading(false)
      setIsOffline(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { pack, isOffline: fromLocal } = await fetchCityPack(slug)
      setCityData(pack)
      setIsOffline(fromLocal)
    } catch (err) {
      setCityData(null)
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsOffline(false)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { 
    cityData, 
    isLoading, 
    isOffline, 
    error, 
    refetch: loadData // Exposing the loader as refetch
  }
}