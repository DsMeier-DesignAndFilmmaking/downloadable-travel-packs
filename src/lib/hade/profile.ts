/**
 * profile.ts
 *
 * Centralised access to the active TravelerProfile.
 * All reads and writes go through this module so the localStorage key is
 * never scattered across the codebase.
 */

import type { TravelerProfile } from '@/types/cityPack';

const PROFILE_KEY = 'hade_profile' as const;

/**
 * Returns the currently stored TravelerProfile, or undefined if none has
 * been set. Handles JSON parse errors and invalid values gracefully.
 */
export function getActiveProfile(): TravelerProfile | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return undefined;
    // Validate against known profile values at runtime
    const VALID: TravelerProfile[] = [
      'Regenerative', 'Foodie', 'Wellness', 'Adventure', 'SalvagedStay',
    ];
    return VALID.includes(raw as TravelerProfile)
      ? (raw as TravelerProfile)
      : undefined;
  } catch {
    // localStorage unavailable (SSR, private browsing restriction)
    return undefined;
  }
}

/**
 * Persists the selected TravelerProfile to localStorage.
 * Pass undefined to clear the active profile.
 */
export function setActiveProfile(profile: TravelerProfile | undefined): void {
  try {
    if (profile === undefined) {
      localStorage.removeItem(PROFILE_KEY);
    } else {
      localStorage.setItem(PROFILE_KEY, profile);
    }
  } catch {
    // Best-effort — silently swallow quota or permission errors.
  }
}
