const WEATHER_API_BASE_URL = 'https://api.weatherapi.com/v1/current.json';

const FALLBACK_ADVICE = 'Check live hydration windows and heat alerts before moving.';

type WeatherApiResponse = {
  current?: {
    temp_c?: number;
    uv?: number;
    condition?: {
      text?: string;
    };
  };
};

export type CityWeather = {
  city: string;
  temp: number;
  condition: string;
  uv: number;
  advice: string;
};

export function getClimateAdvice(temp: number, condition: string, uv: number): string {
  let advice = '';
  if (temp > 35) {
    advice = 'EXTREME HEAT: Avoid walking. Use AC transit and hydrate immediately.';
  } else if (temp > 28) {
    advice = "HIGH HEAT: Limit sun exposure. Use malls or 'The Link' walkways.";
  } else if (/rain|storm/i.test(condition)) {
    advice = 'WET WEATHER: Surfaces slippery. Metro/Taxis recommended over walking.';
  } else if (temp < 10) {
    advice = 'CHILL FACTOR: Layer up. Indoor hubs recommended for navigation.';
  } else {
    advice = 'MILD CLIMATE: Ideal conditions for walking and exploration.';
  }

  if (uv >= 8) {
    advice = `${advice} ⚠️ VERY HIGH UV: Sunscreen/hat mandatory. Limit exposure.`;
  } else if (uv >= 6) {
    advice = `${advice} ☀️ HIGH UV: Seek shade during midday.`;
  }

  return advice;
}

export async function fetchCityWeather(cityName: string): Promise<CityWeather> {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_WEATHER_API_KEY');
  }

  const url = `${WEATHER_API_BASE_URL}?key=${apiKey}&q=${encodeURIComponent(cityName)}&aqi=no`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as WeatherApiResponse;
  const temp = data.current?.temp_c;
  const condition = data.current?.condition?.text;
  const uv = data.current?.uv;

  if (typeof temp !== 'number' || !condition || typeof uv !== 'number') {
    throw new Error('Weather API returned incomplete climate payload');
  }

  return {
    city: cityName,
    temp,
    condition,
    uv,
    advice: getClimateAdvice(temp, condition, uv),
  };
}

export const climateAdviceFallback = FALLBACK_ADVICE;
