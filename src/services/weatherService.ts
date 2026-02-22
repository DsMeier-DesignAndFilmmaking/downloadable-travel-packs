import { getClimateAdviceV8 } from '@/constants/weatherAdvice';

const FALLBACK_ADVICE = 'Check live hydration windows and heat alerts before moving.';

type OpenMeteoResponse = {
  current?: {
    apparent_temperature?: number;
    uv_index?: number;
    weather_code?: number;
  };
};

export type CityWeather = {
  temp: number;
  condition: string;
  uv: number;
  advice: string;
};

export function getClimateAdvice(temp: number, condition: string, uv: number): string {
  return getClimateAdviceV8(temp, condition, uv);
}

export function translateWeatherCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Variable';
}

export async function fetchCityWeather(lat: number, lng: number): Promise<CityWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=apparent_temperature,uv_index,weather_code&timezone=auto`;
  const response = await fetch(url, { method: 'GET', mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const temp = data.current?.apparent_temperature;
  const uv = data.current?.uv_index;
  const weatherCode = data.current?.weather_code;

  if (typeof temp !== 'number' || typeof uv !== 'number' || typeof weatherCode !== 'number') {
    throw new Error('Open-Meteo returned incomplete climate payload');
  }

  const condition = translateWeatherCode(weatherCode);
  return {
    temp,
    condition,
    uv,
    advice: getClimateAdviceV8(temp, condition, uv),
  };
}

export const climateAdviceFallback = FALLBACK_ADVICE;
