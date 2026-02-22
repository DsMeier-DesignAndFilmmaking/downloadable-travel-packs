const FALLBACK_ADVICE = 'Check live hydration windows and heat alerts before moving.';

type WeatherApiResponse = {
  current?: {
    feelslike_c?: number;
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
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY?.trim();
  const maskedApiKey = apiKey ? `${'*'.repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}` : '(missing)';
  console.log('🔑 WEATHER API KEY MASKED:', maskedApiKey);
  console.log('🔑 KEY LENGTH CHECK:', apiKey?.length);
  if (!apiKey) {
    throw new Error('Missing VITE_WEATHER_API_KEY');
  }

  const sanitized = cityName
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();
  console.log('🧪 CLEANED QUERY:', `|${sanitized}|`, 'Length:', sanitized.length);
  const q = encodeURIComponent(sanitized);
  console.log('🔍 SANITIZED CITY QUERY:', q);

  const e = apiKey;
  const url = `https://api.weatherapi.com/v1/current.json?key=${e}&q=${q}&aqi=no`;
  console.log('🔗 FINAL FETCH URL:', url);
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.json();
    console.error('❌ WEATHER API REJECTED REQUEST:', errorBody);
    throw new Error(`Weather API Error: ${errorBody.error.message}`);
  }

  const data = (await response.json()) as WeatherApiResponse;
  const temp = data.current?.feelslike_c;
  const condition = data.current?.condition?.text;
  const uv = data.current?.uv;

  if (typeof temp !== 'number' || !condition || typeof uv !== 'number') {
    throw new Error('Weather API returned incomplete climate payload');
  }

  return {
    city: sanitized,
    temp,
    condition,
    uv,
    advice: getClimateAdvice(temp, condition, uv),
  };
}

export const climateAdviceFallback = FALLBACK_ADVICE;
