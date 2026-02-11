import axios from 'axios';

const API_KEY = import.meta.env.VITE_TRAVEL_BUDDY_KEY;
const API_HOST = 'visa-requirement.p.rapidapi.com';

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

    // 1. Check Session Storage (Persists through refreshes)
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`📦 Serving cached visa data for ${cleanDestination}`);
      return JSON.parse(cachedData);
    }

    const params = new URLSearchParams();
    params.append('passport', cleanPassport);
    params.append('destination', cleanDestination);
  
    const options = {
      method: 'POST',
      url: `https://${API_HOST}/v2/visa/check`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
      },
      data: params
    };
  
    try {
      const response = await axios.request(options);
      const rawData = response.data?.data || response.data;
      
      if (!rawData) return null;

      const regSource = rawData.mandatory_registration || rawData.registration || rawData.requirement;

      const normalizedData: VisaCheckData = {
        ...rawData,
        mandatory_registration: regSource ? {
          text: regSource.text || regSource.label || regSource.name || regSource.description,
          link: regSource.link || regSource.url,
          color: regSource.color || 'amber'
        } : null
      };

      // 2. Save to Session Storage before returning
      sessionStorage.setItem(cacheKey, JSON.stringify(normalizedData));
    
      return normalizedData;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error("🚫 429 ERROR: RapidAPI Rate Limit Exceeded. Using fallback empty state.");
      } else {
        console.error("❌ API ERROR:", error);
      }
      return null;
    }
  };