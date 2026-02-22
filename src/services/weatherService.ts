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

  const sanitizedCity = cityName.split('-')[0].split(',')[0].replace(/[^a-zA-Z]/g, '').trim();
  console.log('🎯 TARGET CITY:', sanitizedCity);

  const e = apiKey;
  type WeatherApiErrorBody = { error?: { code?: number; message?: string } };
  type WeatherApiRequestError = Error & { status?: number; code?: number; cfRay?: string };

  const requestWeather = async (query: string): Promise<WeatherApiResponse> => {
    const o = encodeURIComponent(query);
    console.log('🔍 SANITIZED CITY QUERY:', o);
    const url = `https://api.weatherapi.com/v1/current.json?key=${e}&q=${o}&aqi=no`;
    console.log('🔗 FINAL FETCH URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });

    if (!response.ok) {
      const cfRay = response.headers.get('cf-ray');
      let errorBody: WeatherApiErrorBody = {};
      try {
        errorBody = (await response.json()) as WeatherApiErrorBody;
      } catch {
        // Keep empty error object when parsing fails.
      }

      console.error('❌ WEATHER API REJECTED REQUEST:', errorBody);
      if (cfRay) console.error('🛰️ WEATHER CF-RAY:', cfRay);
      const message = errorBody.error?.message ?? `HTTP ${response.status}`;
      const err = new Error(`Weather API Error: ${message}`) as WeatherApiRequestError;
      err.status = response.status;
      err.code = errorBody.error?.code;
      err.cfRay = cfRay ?? undefined;
      throw err;
    }

    return (await response.json()) as WeatherApiResponse;
  };

  let data: WeatherApiResponse;
  try {
    data = await requestWeather(sanitizedCity);
  } catch (err) {
    const weatherErr = err as WeatherApiRequestError;
    if (weatherErr.status === 400 && sanitizedCity.toLowerCase() === 'barcelona') {
      console.warn('↩️ WEATHER RETRY WITH COUNTRY CONTEXT:', 'Barcelona, Spain');
      data = await requestWeather('Barcelona, Spain');
    } else {
      throw err;
    }
  }

  const temp = data.current?.feelslike_c;
  const condition = data.current?.condition?.text;
  const uv = data.current?.uv;

  if (typeof temp !== 'number' || !condition || typeof uv !== 'number') {
    throw new Error('Weather API returned incomplete climate payload');
  }

  return {
    city: sanitizedCity,
    temp,
    condition,
    uv,
    advice: getClimateAdvice(temp, condition, uv),
  };
}

export const climateAdviceFallback = FALLBACK_ADVICE;
