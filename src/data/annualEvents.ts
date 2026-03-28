/**
 * Static map of city slug → annual events relevant to traveler crowd planning.
 * `month` is 1-indexed (1 = January, 12 = December).
 *
 * Used on CityGuideView mount to pre-seed the HADE localEventFlag when the
 * current month matches a known high-impact event in the destination city.
 */

export interface AnnualEvent {
  month: number;
  name: string;
}

export const annualEvents: Record<string, AnnualEvent[]> = {
  'bangkok-thailand': [
    { month: 4,  name: 'Songkran Festival' },
    { month: 11, name: 'Loy Krathong' },
  ],
  'paris-france': [
    { month: 7,  name: 'Bastille Day' },
    { month: 9,  name: 'Paris Fashion Week' },
  ],
  'london-uk': [
    { month: 8,  name: 'Notting Hill Carnival' },
  ],
  'dubai-uae': [
    { month: 1,  name: 'Dubai Shopping Festival' },
    { month: 3,  name: 'Dubai World Cup' },
  ],
  'singapore': [
    { month: 2,  name: 'Chinese New Year' },
    { month: 9,  name: 'Formula 1 Singapore Grand Prix' },
  ],
  'istanbul-turkey': [
    { month: 4,  name: 'Istanbul Tulip Festival' },
    { month: 6,  name: 'Istanbul Music Festival' },
  ],
  'tokyo-japan': [
    { month: 3,  name: 'Cherry Blossom Season' },
    { month: 8,  name: 'Obon Festival' },
  ],
  'antalya-turkey': [
    { month: 10, name: 'Antalya Film Festival' },
  ],
  'seoul-south-korea': [
    { month: 4,  name: 'Yeouido Cherry Blossom Festival' },
    { month: 10, name: 'Busan International Film Festival' },
  ],
  'hong-kong': [
    { month: 1,  name: 'Lunar New Year' },
    { month: 6,  name: 'Dragon Boat Festival' },
  ],
};

/**
 * Returns the first annual event for `slug` whose month matches the
 * current calendar month, or `null` if none.
 */
export function getCurrentMonthEvent(slug: string): AnnualEvent | null {
  const events = annualEvents[slug];
  if (!events) return null;
  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
  return events.find((e) => e.month === currentMonth) ?? null;
}
