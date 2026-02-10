/**
 * Environment-aware API config: DEV uses static mock manifests, PROD uses Vercel serverless.
 * Prevents "Syntax Error" when fetching HTML (SPA fallback) instead of JSON in local dev.
 */

const DEV = import.meta.env.DEV

/**
 * URL for the PWA manifest (used by the manifest <link> and by optional fetches).
 * - DEV: static JSON under public/mock/manifest/
 * - PROD: Vercel serverless /api/manifest?slug=
 */
export function MANIFEST_URL(slug: string): string {
  if (DEV) {
    return `/mock/manifest/${slug}.json`;
  }
  return `/api/manifest/${slug}`;
}

/**
 * URL for fetching city pack data (offline-first service).
 * - DEV: mock path returns manifest-shaped JSON, so fetch fails CityPack check and we fallback to local.
 * - PROD: serverless API (when returning CityPack) or same as manifest route.
 */
export function getCityPackUrl(slug: string): string {
  if (DEV) {
    return `/mock/manifest/${slug}.json`;
  }
  return `/api/manifest/${slug}`;
}
