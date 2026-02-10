/**
 * ComplianceEngine — Schengen 90/180-day rule and ETIAS status as a "background process."
 * UI stays green (Silent Mode) until a threshold is crossed; then Active (Orange/Red).
 */

/** ISO Alpha-2 codes of Schengen / ETIAS-required countries (EU Schengen + EFTA). */
export const SCHENGEN_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
]);

const ROLLING_DAYS = 180;
const MAX_STAY_DAYS = 90;

export interface TravelSegment {
  /** ISO date string (YYYY-MM-DD) of entry into Schengen. */
  entryDate: string;
  /** ISO date string (YYYY-MM-DD) of exit from Schengen. */
  exitDate: string;
}

export interface ComplianceInput {
  /** User's passport country (ISO Alpha-2). */
  passportCountry: string;
  /** User's current location country (ISO Alpha-2). */
  currentLocation: string;
  /** Past stays in Schengen for 90/180 calculation. */
  travelHistory?: TravelSegment[];
  /** ETIAS authorization expiry (ISO date string). Omit if not in ETIAS regime. */
  etiasExpiryDate?: string | null;
}

export type ComplianceStatus = 'clear' | 'warning' | 'action_required';

export interface ComplianceResult {
  /** Whether current location is in an ETIAS-required (Schengen) region. */
  inEtiasRegion: boolean;
  /** Days remaining in Schengen under 90/180 rule (0 if not in region or no history). */
  daysRemainingInSchengen: number;
  /** Days until ETIAS expires (null if not applicable or no expiry). */
  daysUntilEtiasExpiry: number | null;
  /** Resolved status for UI: clear (green), warning (orange), action_required (red). */
  status: ComplianceStatus;
  /** True if ETIAS renewal link should be shown (expiry within 30 days). */
  showEtiasRenewalLink: boolean;
}

/**
 * Returns true if the country is in the Schengen/ETIAS-required area.
 */
export function isEtiasRequiredRegion(countryCode: string): boolean {
  return SCHENGEN_COUNTRY_CODES.has(countryCode.toUpperCase().trim());
}

/**
 * Counts days spent in Schengen within the rolling 180-day window ending on referenceDate.
 */
export function getSchengenDaysUsedInRollingWindow(
  travelHistory: TravelSegment[],
  referenceDate: Date
): number {
  const refTime = referenceDate.getTime();
  const windowStart = new Date(refTime - (ROLLING_DAYS - 1) * 24 * 60 * 60 * 1000);
  let total = 0;
  for (const seg of travelHistory) {
    const entry = new Date(seg.entryDate);
    const exit = new Date(seg.exitDate);
    if (exit < windowStart || entry > referenceDate) continue;
    const overlapStart = entry < windowStart ? windowStart : entry;
    const overlapEnd = exit > referenceDate ? referenceDate : exit;
    const days = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    total += days;
  }
  return total;
}

/**
 * Days remaining in Schengen under 90/180 rule (0 if over limit or not in region).
 */
export function getSchengenDaysRemaining(
  travelHistory: TravelSegment[],
  referenceDate: Date = new Date()
): number {
  const used = getSchengenDaysUsedInRollingWindow(travelHistory, referenceDate);
  return Math.max(0, MAX_STAY_DAYS - used);
}

/**
 * Days until a given expiry date (ISO string). Returns null if invalid or past.
 */
export function getDaysUntilExpiry(expiryDateIso: string | null | undefined, fromDate: Date = new Date()): number | null {
  if (!expiryDateIso) return null;
  const expiry = new Date(expiryDateIso);
  if (Number.isNaN(expiry.getTime())) return null;
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return days < 0 ? null : days;
}

/**
 * ComplianceEngine: computes status from location, travel history, and ETIAS expiry.
 * Silent Mode (green) until threshold crossed; then warning (orange) or action_required (red).
 */
export function computeCompliance(input: ComplianceInput, referenceDate: Date = new Date()): ComplianceResult {
  const locationNorm = input.currentLocation?.toUpperCase().trim() ?? '';
  const inEtiasRegion = isEtiasRequiredRegion(locationNorm);

  const travelHistory = input.travelHistory ?? [];
  const daysRemainingInSchengen = inEtiasRegion ? getSchengenDaysRemaining(travelHistory, referenceDate) : 0;
  const daysUntilEtiasExpiry = getDaysUntilExpiry(input.etiasExpiryDate ?? null, referenceDate);

  const etiasExpiringWithin30 = daysUntilEtiasExpiry != null && daysUntilEtiasExpiry <= 30 && daysUntilEtiasExpiry >= 0;
  const etiasExpired = daysUntilEtiasExpiry != null && daysUntilEtiasExpiry < 0;
  const stayLimitReached = inEtiasRegion && daysRemainingInSchengen <= 0;
  const stayWarning = inEtiasRegion && daysRemainingInSchengen > 0 && daysRemainingInSchengen < 10;

  let status: ComplianceStatus = 'clear';
  if (!inEtiasRegion) {
    status = 'clear';
  } else if (stayLimitReached || etiasExpired || (etiasExpiringWithin30 && daysUntilEtiasExpiry <= 7)) {
    status = 'action_required';
  } else if (stayWarning || etiasExpiringWithin30) {
    status = 'warning';
  }

  const showEtiasRenewalLink = (etiasExpiringWithin30 || etiasExpired) && inEtiasRegion;

  return {
    inEtiasRegion,
    daysRemainingInSchengen,
    daysUntilEtiasExpiry: daysUntilEtiasExpiry ?? null,
    status,
    showEtiasRenewalLink,
  };
}

/** Official ETIAS application / renewal URL (EU). */
export const ETIAS_OFFICIAL_URL = 'https://travel-europe.europa.eu/en/etias';
