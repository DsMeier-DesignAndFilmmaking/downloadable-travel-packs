import axios, { AxiosError } from 'axios';

const VISA_CHECK_ENDPOINT = '/api/visa-check';
const RATE_LIMIT_UNTIL_KEY = 'visa_rate_limit_until';
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 30 * 60 * 1000;
const inflightVisaRequests = new Map<string, Promise<VisaCheckData | null>>();

export interface VisaCheckData {
  passport?: { currency_code?: string; [key: string]: unknown };
  destination?: { passport_validity?: string; exchange?: string; currency_code?: string; [key: string]: unknown };
  visa_rules?: {
    primary_rule?: { name?: string; duration?: string; link?: string; [key: string]: unknown };
    secondary_rule?: { link?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  mandatory_registration?: {
    color?: string;
    link?: string;
    text?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export const fetchVisaCheck = async (passport: string, destination: string): Promise<VisaCheckData | null> => {
  const cleanPassport = passport.toUpperCase().trim();
  const cleanDestination = destination.toUpperCase().trim();
  const cacheKey = `visa_${cleanPassport}_${cleanDestination}`;

  // 1. Check Session Storage (persists through refreshes)
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    console.log(`📦 Serving cached visa data for ${cleanDestination}`);
    return JSON.parse(cachedData) as VisaCheckData;
  }

  // 2. Avoid duplicate in-flight requests for the same route.
  const existingRequest = inflightVisaRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  // 3. Respect temporary cooldown when backend reports rate limiting.
  const now = Date.now();
  const cooldownUntilRaw = localStorage.getItem(RATE_LIMIT_UNTIL_KEY);
  const cooldownUntil = Number(cooldownUntilRaw || '0');
  if (Number.isFinite(cooldownUntil) && cooldownUntil > now) {
    return null;
  }
  if (cooldownUntilRaw && (!Number.isFinite(cooldownUntil) || cooldownUntil <= now)) {
    localStorage.removeItem(RATE_LIMIT_UNTIL_KEY);
  }

  const requestPromise = (async () => {
    try {
      const response = await axios.get<VisaCheckData>(VISA_CHECK_ENDPOINT, {
        params: {
          passport: cleanPassport,
          destination: cleanDestination,
        },
      });

      if (!response.data) return null;

      sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        const retryAfterRaw = axiosError.response.headers?.['retry-after'];
        const retryAfterSeconds = Number.parseInt(String(retryAfterRaw ?? ''), 10);
        const backoffMs =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : DEFAULT_RATE_LIMIT_BACKOFF_MS;
        localStorage.setItem(RATE_LIMIT_UNTIL_KEY, String(Date.now() + backoffMs));
        console.error('🚫 429 ERROR: Visa API rate-limited. Backing off temporarily.');
      } else {
        console.error('❌ API ERROR:', error);
      }
      return null;
    }
  })().finally(() => {
    inflightVisaRequests.delete(cacheKey);
  });

  inflightVisaRequests.set(cacheKey, requestPromise);
  return requestPromise;
};
