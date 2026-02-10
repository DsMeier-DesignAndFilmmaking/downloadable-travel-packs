/**
 * pulseLogic — Logical engine for contextual pulse/alert output.
 * Prioritizes: Thermal Safety (temp > 32°C) > Safe Transport (hour > 21) > Overtourism (crowd High).
 */

export type CrowdLevel = 'Low' | 'Med' | 'High';

export interface PulseLogicInput {
  /** 0–23 (local hour). */
  currentHour: number;
  /** Temperature in Celsius. */
  temp: number;
  /** UV index (0–11+). */
  uvIndex: number;
  /** Crowd level. */
  crowdLevel: CrowdLevel;
}

export interface PulseLogicResult {
  title: string;
  subtext: string;
  iconName: string;
  actionType: string;
}

/**
 * Returns a single pulse result based on priority:
 * 1. temp > 32°C → Thermal Safety
 * 2. currentHour > 21 → Safe Transport
 * 3. crowdLevel === 'High' → Overtourism Alert
 * 4. Default → All Clear (optional fallback using uvIndex or neutral)
 */
export function pulseLogic(input: PulseLogicInput): PulseLogicResult {
  const { currentHour, temp, uvIndex, crowdLevel } = input;

  if (temp > 32) {
    return {
      title: 'Thermal Safety',
      subtext: 'High heat. Seek shade, hydrate, and limit outdoor exposure.',
      iconName: 'Thermometer',
      actionType: 'thermal_safety',
    };
  }

  if (currentHour > 21) {
    return {
      title: 'Safe Transport',
      subtext: 'Late hour. Use official taxis or ride‑hail; avoid unlicensed options.',
      iconName: 'Car',
      actionType: 'safe_transport',
    };
  }

  if (crowdLevel === 'High') {
    return {
      title: 'Overtourism Alert',
      subtext: 'Very busy area. Watch belongings and consider quieter alternatives.',
      iconName: 'Users',
      actionType: 'overtourism_alert',
    };
  }

  return {
    title: 'All Clear',
    subtext: uvIndex > 6 ? 'High UV. Use sunscreen and cover up.' : 'Conditions fine for exploring.',
    iconName: 'Sun',
    actionType: 'all_clear',
  };
}
