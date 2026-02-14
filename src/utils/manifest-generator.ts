/**
 * Dynamic manifest generation for per-guide PWA installs.
 * Generates manifest.json with start_url and scope scoped to /guide/{cityId} to isolate each guide.
 */

import { useEffect } from 'react';
import { MANIFEST_URL } from '@/services/apiConfig';

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface WebAppManifest {
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  scope: string;
  id?: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  background_color: string;
  theme_color: string;
  orientation?: 'any' | 'natural' | 'landscape' | 'portrait';
  icons: ManifestIcon[];
}

const DEFAULT_THEME_COLOR = '#0f172a';
const DEFAULT_BACKGROUND_COLOR = '#0f172a';

/** Shared PWA icon paths (project uses single set; no per-city icons by default). */
const DEFAULT_ICONS: ManifestIcon[] = [
  { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/pwa-pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/**
 * Generates a Web App Manifest for a single city guide.
 * start_url and scope are set to /guide/{cityId} so the OS treats each guide as an isolated install.
 */
export function generateCityGuideManifest(
  cityId: string,
  cityName: string,
  themeColor: string = DEFAULT_THEME_COLOR,
  options?: { description?: string; icons?: ManifestIcon[] }
): WebAppManifest {
  const scope = `/guide/${cityId}`;
  return {
    name: `${cityName} Travel Pack`,
    short_name: cityName,
    description: options?.description ?? `Offline travel pack for ${cityName} — survival, emergency & arrival.`,
    start_url: scope,
    scope,
    id: `tp-guide-${cityId}`,
    display: 'standalone',
    background_color: DEFAULT_BACKGROUND_COLOR,
    theme_color: themeColor,
    orientation: 'any',
    icons: options?.icons ?? DEFAULT_ICONS,
  };
}

/**
 * Injects a manifest into the document head via a blob URL.
 * Replaces any existing manifest link so only one is active.
 */
export function injectManifest(manifest: WebAppManifest): void {
  const existingLink = document.querySelector('link[rel="manifest"]');
  if (existingLink) {
    const href = existingLink.getAttribute('href');
    if (href?.startsWith('blob:')) {
      URL.revokeObjectURL(href);
    }
    existingLink.remove();
  }

  const manifestBlob = new Blob([JSON.stringify(manifest)], {
    type: 'application/json',
  });
  const manifestURL = URL.createObjectURL(manifestBlob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  document.head.appendChild(link);
}

/**
 * Updates the theme-color meta tag (e.g. for browser chrome / standalone).
 */
export function updateThemeColor(color: string): void {
  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = color;
}

/**
 * Fetches a dynamic manifest from the API (DEV: mock JSON, PROD: /api/manifest/:slug).
 * Falls back to client-side generation if the request fails.
 */
export async function fetchDynamicManifest(
  cityId: string,
  cityName: string,
  themeColor: string = DEFAULT_THEME_COLOR
): Promise<WebAppManifest> {
  try {
    const url = MANIFEST_URL(cityId);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Manifest fetch failed: ${response.status}`);
    }
    const data = await response.json();
    if (data && typeof data.name === 'string' && data.start_url && data.scope) {
      return data as WebAppManifest;
    }
    throw new Error('Invalid manifest shape');
  } catch (error) {
    console.warn('[Manifest] API manifest failed, using client-generated manifest:', error);
    return generateCityGuideManifest(cityId, cityName, themeColor);
  }
}

/**
 * React hook: injects a per-guide manifest when the user is viewing a city guide.
 * Cleans up the blob URL and (optionally) restores default theme on unmount.
 */
export function useManifest(
  cityId: string,
  cityName: string,
  themeColor?: string
): void {
  useEffect(() => {
    if (!cityId || !cityName) return;

    const manifest = generateCityGuideManifest(
      cityId,
      cityName,
      themeColor ?? DEFAULT_THEME_COLOR
    );
    injectManifest(manifest);

    if (themeColor) {
      updateThemeColor(themeColor);
    }

    return () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href?.startsWith('blob:')) {
          link.remove();
          URL.revokeObjectURL(href);
        }
      }
    };
  }, [cityId, cityName, themeColor]);
}
