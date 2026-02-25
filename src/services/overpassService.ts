/**
 * src/services/overpassService.ts
 * Premium Overpass API (OSM) service with fallback logic and retry strategy.
 */

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METERS = 1000;

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

/**
 * Standard Haversine formula for distance calculation.
 */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  retries = 2
): Promise<OverpassResult | null> {
  // Query for both nodes (points) and ways (polygons) for better coverage in dense areas
  const query = `[out:json][timeout:15];
(
  node["amenity"="toilets"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  node["name"~"Sanborns",i](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  way["amenity"="toilets"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  way["name"~"Sanborns",i](around:${SEARCH_RADIUS_METERS},${lat},${lng});
);
out center;`;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        if (res.status === 429) { // Rate limit handling
          await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
          continue;
        }
        return null;
      }

      const json = (await res.json()) as { elements?: OverpassElement[] };
      const elements = json.elements ?? [];
      
      let best: OverpassResult | null = null;

      for (const el of elements) {
        const c = getElementCoords(el);
        if (!c) continue;
        
        const dist = haversineMeters(lat, lng, c.lat, c.lon);
        if (dist > SEARCH_RADIUS_METERS) continue;

        const { name, type } = getResultMetadata(el);
        
        // Elite Logic: A Sanborns that is 500m away is better than a public toilet 100m away.
        // We apply a "quality weight" to prioritize the premium option.
        const qualityWeight = type === 'sanborns' ? 0.6 : 1.0;
        const weightedDist = dist * qualityWeight;

        if (best === null || weightedDist < (best.distanceMeters * (best.type === 'sanborns' ? 0.6 : 1.0))) {
          best = { 
            displayName: name, 
            distanceMeters: Math.round(dist), 
            type,
            lat: c.lat, // Add this line
            lon: c.lon  // Add this line
          };
        }
      }
      return best;
    } catch (error) {
      if (i === retries) return null;
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 500));
    }
  }
  return null;
}