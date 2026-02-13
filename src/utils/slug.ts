/**
 * Strip query string and fragment from a URL path param so API calls and
 * manifest use a clean slug (e.g. avoid utm_source=pwa or other query garbage).
 */
// /src/utils/slug.ts
export function getCleanSlug(raw: string | undefined): string {
  if (!raw) return '';
  
  // 1. Standardize by decoding (handles %20, etc.)
  const decoded = decodeURIComponent(raw.trim());
  
  // 2. Use a Regex to capture everything before the first '?' or '#'
  // This is safer than multiple .split() calls
  const match = decoded.match(/^([^?#]+)/);
  const clean = match ? match[1] : decoded;

  // 3. Remove any trailing slashes that might confuse the API
  return clean.replace(/\/+$/, '');
}
