/**
 * useArrivalLiveData — placeholder for future live arrival APIs.
 * No fetch or API calls yet. Structural only for later integration.
 */

export interface ArrivalLiveData {
  visaStatus: null;
  trafficStatus: null;
  systemHealthLive: null;
  isOnline: boolean;
}

export function useArrivalLiveData(): ArrivalLiveData {
  const isOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    visaStatus: null,
    trafficStatus: null,
    systemHealthLive: null,
    isOnline,
  };
}
