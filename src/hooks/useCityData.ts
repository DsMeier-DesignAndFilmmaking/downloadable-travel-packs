/**
 * useCityData — Decoupled city data layer for AI scaling.
 * Today: static list; later: swap to API/fetch for 1,000+ cities.
 */

import { useMemo } from 'react'
import { cities, getCityBySlug as getBySlug, type City } from '../data/cities'

export interface UseCityDataResult {
  cities: City[]
  getCityBySlug: (slug: string) => City | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for city data. Ready to replace with async fetch when moving to remote/AI-backed source.
 */
export function useCityData(): UseCityDataResult {
  const getCityBySlug = useMemo(() => getBySlug, [])
  return useMemo(
    () => ({
      cities,
      getCityBySlug,
      isLoading: false,
      error: null,
    }),
    [getCityBySlug]
  )
}
