export interface HadeContext {
  arrivalStage: 'pre-arrival' | 'landed' | 'airport-exit' | 'exploring' | 'departing';
  aqiLevel: 'good' | 'moderate' | 'unhealthy' | 'hazardous';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  crowdLevel: 'light' | 'moderate' | 'heavy';
  accommodationStatus: 'on-track' | 'delayed' | 'checked-in';
  localEventFlag: string | null;
  userDisplaced: boolean;
  timeWindow: number;
  currentLocation: {
    lat: number;
    lng: number;
  } | null;
  updateContext: (updates: Partial<HadeContext>) => void;
}

export const initialHadeContext: HadeContext = {
  arrivalStage: 'pre-arrival',
  aqiLevel: 'good',
  timeOfDay: 'morning',
  crowdLevel: 'light',
  accommodationStatus: 'on-track',
  localEventFlag: null,
  userDisplaced: false,
  timeWindow: 60,
  currentLocation: null,
  updateContext: () => {},
};
