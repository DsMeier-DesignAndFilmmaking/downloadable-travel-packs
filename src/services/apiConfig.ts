/**
 * Environment-aware API config: DEV uses static mock manifests, PROD uses Vercel serverless.
 * All returned URLs are absolute paths from origin (e.g. /api/manifest/:slug) so fetch never
 * hits a relative path that could resolve incorrectly. Callers must pass a clean slug (no query/fragment).
 */

const DEV = import.meta.env.DEV

/**
 * URL for the PWA manifest (used by the manifest <link> and by optional fetches).
 * Absolute path from origin. Slug must be clean (no utm_source or other query params).
 */
export function MANIFEST_URL(slug: string): string {
  if (DEV) {
    return `/mock/manifest/${slug}.json`;
  }
  return `/api/manifest/${slug}`;
}

/**
 * URL for fetching city pack data (offline-first service). Absolute path from origin.
 * - DEV: static JSON under public/mock/manifest/
 * - PROD: Vercel serverless /api/manifest/:slug (rewritten to ?slug=)
 */
export function getCityPackUrl(slug: string): string {
  if (DEV) {
    return `/mock/manifest/${slug}.json`;
  }
  return `/api/manifest/${slug}`;
}
