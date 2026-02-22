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

  const e = apiKey;
  type WeatherApiErrorBody = { error?: { code?: number; message?: string } };

  const requestWeather = async (query: string): Promise<WeatherApiResponse> => {
    const o = encodeURIComponent(`${query.split('-')[0].trim()},`);
    console.log('🔍 SANITIZED CITY QUERY:', o);
    const url = `https://api.weatherapi.com/v1/current.json?key=${e}&q=${o}&aqi=no&_ts=${Date.now()}`;
    console.log('🔗 FINAL FETCH URL:', url);
    console.log('🌐 FETCHING FROM CLIENT IP:', url);

    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      throw new Error('Weather fetch must run in browser context');
    }

    const response = await window.fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
    });

    if (!response.ok) {
      let errorBody: WeatherApiErrorBody = {};
      try {
        errorBody = (await response.json()) as WeatherApiErrorBody;
      } catch {
        // Keep empty error object when parsing fails.
      }

      console.error('❌ WEATHER API REJECTED REQUEST:', errorBody);
      const message = errorBody.error?.message ?? `HTTP ${response.status}`;
      const error = new Error(`Weather API Error: ${message}`) as Error & { code?: number };
      error.code = errorBody.error?.code;
      throw error;
    }

    return (await response.json()) as WeatherApiResponse;
  };

  let data: WeatherApiResponse;
  try {
    data = await requestWeather(sanitized);
  } catch (primaryError) {
    const err = primaryError as Error & { code?: number };
    if (err.code !== 1006 || sanitized.length < 2) {
      throw primaryError;
    }

    const fallbackQuery = `${sanitized.slice(0, 2)} `;
    console.warn('↩️ WEATHER FALLBACK QUERY:', `|${fallbackQuery}|`);
    data = await requestWeather(fallbackQuery);
  }

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
