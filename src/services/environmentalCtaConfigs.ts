/**
 * environmentalCtaConfigs.ts
 *
 * Per-city CTA configs for EnvironmentalImpactBlock's `actionCtaOverrides` prop.
 *
 * Each array maps 1:1 to the city's `report.whatYouCanDo` action items (by index).
 * Leave an index as `undefined` to render that row without a CTA button.
 *
 * CTA kinds:
 *   'weather'        → fires weather_adaptive_cta_clicked   (air quality / conditions)
 *   'sustainability' → fires sustainability_action_clicked  (behaviour / local impact)
 *
 * Usage in CityGuideView (or wherever EnvironmentalImpactBlock is rendered):
 *
 *   import { getEnvCtasForCity } from '@/data/environmentalCtaConfigs'
 *
 *   <EnvironmentalImpactBlock
 *     cityId={citySlug}
 *     lat={coordinates.lat}
 *     lng={coordinates.lng}
 *     cityName={cityName}
 *     actionCtaOverrides={getEnvCtasForCity(citySlug)}
 *   />
 */

import type { EnvironmentalCta } from '@/components/EnvironmentalImpactBlock';

// ─── Bangkok ─────────────────────────────────────────────────────────────────
//
// report.whatYouCanDo (expected order from environmentalImpactService):
//   [0] Use BTS Skytrain or MRT — one tuk-tuk trip emits ~8× more PM2.5 than rail.
//   [1] Shop at Or Tor Kor Market or Chatuchak instead of Asiatique.
//   [2] Stay in Ari, Thonglor, or Lad Phrao to spread tourism revenue.

const bangkokCtaOverrides: (EnvironmentalCta | undefined)[] = [
  // [0] Transit → weather kind (AQI-adaptive: reduces personal PM2.5 exposure)
  {
    label: 'View BTS / MRT Rail Map',
    url: 'https://www.google.com/maps/search/BTS+MRT+Bangkok+station/@13.7563,100.5018,14z',
    kind: 'weather',
    icon: 'transit',
  },
  // [1] Market → sustainability kind (local economic retention)
  {
    label: 'Shop Or Tor Kor Market',
    url: 'https://www.google.com/maps/place/Or+Tor+Kor+Market/@13.7998,100.5501,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  // [2] Neighbourhood → sustainability kind (geographic revenue distribution)
  {
    label: 'Explore Thonglor & Ari',
    url: 'https://www.google.com/maps/search/Thonglor+Bangkok/@13.7270,100.5832,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Paris ────────────────────────────────────────────────────────────────────

const parisCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'Plan a Vélib\' Bike Route',
    url: 'https://www.google.com/maps/search/velib+station+paris/@48.8566,2.3522,14z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Find a Local Marché',
    url: 'https://www.google.com/maps/search/marché+alimentaire+paris/@48.8566,2.3522,14z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Belleville & Oberkampf',
    url: 'https://www.google.com/maps/search/Belleville+Paris/@48.8676,2.3820,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── London ───────────────────────────────────────────────────────────────────

const londonCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'Plan a TfL Elizabeth Line Route',
    url: 'https://www.google.com/maps/search/elizabeth+line+station+london/@51.5072,-0.1276,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Visit Borough Market',
    url: 'https://www.google.com/maps/place/Borough+Market/@51.5055,-0.0910,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Hackney & Peckham',
    url: 'https://www.google.com/maps/search/Hackney+London/@51.5449,-0.0553,14z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Tokyo ────────────────────────────────────────────────────────────────────

const tokyoCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'View Tokyo Metro Map',
    url: 'https://www.google.com/maps/search/tokyo+metro+station/@35.6762,139.6503,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Find a Shotengai (Local Shopping Street)',
    url: 'https://www.google.com/maps/search/shotengai+tokyo/@35.6762,139.6503,13z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Shimokitazawa & Yanaka',
    url: 'https://www.google.com/maps/search/Shimokitazawa+Tokyo/@35.6618,139.6681,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── New York ─────────────────────────────────────────────────────────────────

const newYorkCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'Plan a Subway Route',
    url: 'https://www.google.com/maps/search/NYC+subway+station/@40.7128,-74.0060,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Visit Essex Market or Smorgasburg',
    url: 'https://www.google.com/maps/place/Essex+Market/@40.7220,-73.9875,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Jackson Heights & Astoria',
    url: 'https://www.google.com/maps/search/Jackson+Heights+Queens+NYC/@40.7475,-73.8853,14z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Rome ─────────────────────────────────────────────────────────────────────

const romeCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'View ATAC Metro Routes',
    url: 'https://www.google.com/maps/search/metro+station+rome/@41.9028,12.4964,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Shop at Testaccio Market',
    url: 'https://www.google.com/maps/place/Mercato+di+Testaccio/@41.8811,12.4756,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Pigneto & Ostiense',
    url: 'https://www.google.com/maps/search/Pigneto+Rome/@41.8876,12.5311,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Barcelona ────────────────────────────────────────────────────────────────

const barcelonaCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'Plan a TMB Metro Route',
    url: 'https://www.google.com/maps/search/metro+station+barcelona/@41.3874,2.1686,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Visit Mercat de l\'Abaceria',
    url: 'https://www.google.com/maps/place/Mercat+de+l\'Abaceria/@41.4046,2.1763,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Poblenou & Horta',
    url: 'https://www.google.com/maps/search/Poblenou+Barcelona/@41.4034,2.1982,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Dubai ────────────────────────────────────────────────────────────────────

const dubaiCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'View Dubai Metro Map',
    url: 'https://www.google.com/maps/search/dubai+metro+station/@25.2048,55.2708,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Explore the Gold & Spice Souks',
    url: 'https://www.google.com/maps/place/Gold+Souk/@25.2854,55.2966,16z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Discover Al Quoz & Deira',
    url: 'https://www.google.com/maps/search/Al+Quoz+Dubai/@25.1454,55.2213,14z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Seoul ────────────────────────────────────────────────────────────────────

const seoulCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'Plan a Seoul Metro Route',
    url: 'https://www.google.com/maps/search/seoul+metro+station/@37.5665,126.9780,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Visit Gwangjang or Mangwon Market',
    url: 'https://www.google.com/maps/place/Gwangjang+Market/@37.5700,126.9994,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Seongsu-dong & Mangwon',
    url: 'https://www.google.com/maps/search/Seongsu-dong+Seoul/@37.5445,127.0556,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Mexico City ──────────────────────────────────────────────────────────────

const mexicoCityCtaOverrides: (EnvironmentalCta | undefined)[] = [
  {
    label: 'View Metro & Metrobús Map',
    url: 'https://www.google.com/maps/search/metro+CDMX/@19.4326,-99.1332,13z',
    kind: 'weather',
    icon: 'transit',
  },
  {
    label: 'Shop Mercado de Medellín',
    url: 'https://www.google.com/maps/place/Mercado+de+Medellin/@19.4141,-99.1724,17z',
    kind: 'sustainability',
    icon: 'market',
  },
  {
    label: 'Explore Santa María la Ribera',
    url: 'https://www.google.com/maps/search/Santa+María+la+Ribera+CDMX/@19.4437,-99.1565,15z',
    kind: 'sustainability',
    icon: 'neighborhood',
  },
];

// ─── Registry & Lookup ────────────────────────────────────────────────────────

const ENV_CTA_CONFIGS: Record<string, (EnvironmentalCta | undefined)[]> = {
  'bangkok-thailand':    bangkokCtaOverrides,
  'paris-france':        parisCtaOverrides,
  'london-uk':           londonCtaOverrides,
  'tokyo-japan':         tokyoCtaOverrides,
  'new-york-us':         newYorkCtaOverrides,
  'rome-italy':          romeCtaOverrides,
  'barcelona-spain':     barcelonaCtaOverrides,
  'dubai-uae':           dubaiCtaOverrides,
  'seoul-south-korea':   seoulCtaOverrides,
  'mexico-city-mexico':  mexicoCityCtaOverrides,
};

/**
 * Returns the CTA override array for a given city slug,
 * or an empty array if the city has no config yet.
 */
export function getEnvCtasForCity(citySlug: string): (EnvironmentalCta | undefined)[] {
  return ENV_CTA_CONFIGS[citySlug] ?? [];
}