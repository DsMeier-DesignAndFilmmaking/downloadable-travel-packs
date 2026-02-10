import axios from 'axios';

// Get these from your .env file
const API_KEY = import.meta.env.VITE_TRAVEL_BUDDY_KEY;
const API_HOST = 'visa-requirement.p.rapidapi.com';

/** Loose type for visa check API response (2026 real-time data). */
export interface VisaCheckData {
  passport?: {
    currency_code?: string;
    [key: string]: unknown;
  };
  destination?: {
    passport_validity?: string;
    exchange?: string;
    currency_code?: string;
    [key: string]: unknown;
  };
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
  };
  exception_rule?: {
    full_text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const fetchVisaCheck = async (passport: string, destination: string) => {
    // 1. Force Uppercase and trim (API expects "IT", not "italy")
    const cleanPassport = passport.toUpperCase().trim();
    const cleanDestination = destination.toUpperCase().trim();
  
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
      
      // 2. DEBUG: This will show a nice table in your Chrome Console
      if (response.data && response.data.data) {
        console.log("✅ API SUCCESS:");
        console.table(response.data.data.destination);
      } else {
        console.warn("⚠️ API returned 200 but no data. Check if country code is valid:", cleanDestination);
      }
  
      // 3. Handle both possible nesting structures
      return response.data.data || response.data;
    } catch (error) {
      console.error("❌ API ERROR:", error);
      return null;
    }
  };