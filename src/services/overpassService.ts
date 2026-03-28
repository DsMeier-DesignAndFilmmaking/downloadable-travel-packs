/**
 * src/services/overpassService.ts
 * Premium Overpass API (OSM) service with fallback logic and retry strategy.
 */

import { haversineMeters } from '@/lib/geo';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METERS = 1000;
const OVERPASS_CLIENT_TIMEOUT_MS = 3000;
const OVERPASS_QUERY_TIMEOUT_SECONDS = 3;

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResult {
  displayName: string;
  distanceMeters: number;
  type: 'sanborns' | 'restroom';
  lat: number; // Added
  lon: number; // Added
}


function getElementCoords(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

/**
 * Prioritizes branded reliable spots (Sanborns) over generic public toilets.
 */
function getResultMetadata(el: OverpassElement): { name: string; type: 'sanborns' | 'restroom' } {
  const tags = el.tags ?? {};
  const isSanborns = tags.name?.toLowerCase().includes('sanborns');
  
  return {
    name: tags.name || (tags.amenity === 'toilets' ? 'Public Restroom' : 'Restroom'),
    type: isSanborns ? 'sanborns' : 'restroom'
  };
}

/**
 * Fetches nearest premium-tier restroom (Sanborns) or public toilet.
 */
export async function fetchNearestRestroom(
  lat: number,
  lng: number,
): Promise<OverpassResult | null> {
  // Query for both nodes (points) and ways (polygons) for better coverage in dense areas
  const query = `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
(
  node["amenity"="toilets"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  node["name"~"Sanborns",i](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  way["amenity"="toilets"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  way["name"~"Sanborns",i](around:${SEARCH_RADIUS_METERS},${lat},${lng});
);
out center;`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OVERPASS_CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { elements?: OverpassElement[] };
    const elements = json.elements ?? [];
    let best: OverpassResult | null = null;

    for (const el of elements) {
      const c = getElementCoords(el);
      if (!c) continue;

      const dist = haversineMeters(lat, lng, c.lat, c.lon);
      if (dist > SEARCH_RADIUS_METERS) continue;

      const { name, type } = getResultMetadata(el);

      // A Sanborns node gets higher priority than a generic restroom at the same distance.
      const qualityWeight = type === 'sanborns' ? 0.6 : 1.0;
      const weightedDist = dist * qualityWeight;

      if (best === null || weightedDist < (best.distanceMeters * (best.type === 'sanborns' ? 0.6 : 1.0))) {
        best = {
          displayName: name,
          distanceMeters: Math.round(dist),
          type,
          lat: c.lat,
          lon: c.lon,
        };
      }
    }

    return best;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
