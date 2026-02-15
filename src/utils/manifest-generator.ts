// src/utils/manifest-generator.ts

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
  v?: number; // Internal versioning
}

export function generateCityGuideManifest(cityId: string, cityName: string): WebAppManifest {
  const origin = window.location.origin;
  
  // Absolute URLs prevent the browser from getting lost when manifest is a Blob
  const absoluteScope = `${origin}/guide/${cityId}`;
  const absoluteStartUrl = `${origin}/guide/${cityId}?utm_source=pwa`;

  return {
    id: `tp-v2-${cityId}`, 
    name: `${cityName} Travel Pack`,
    short_name: cityName,
    description: `Offline travel pack for ${cityName} — survival, emergency & arrival.`,
    start_url: absoluteStartUrl,
    scope: absoluteScope,
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { 
        src: `${origin}/pwa-192x192.png`, 
        sizes: '192x192', 
        type: 'image/png', 
        purpose: 'any' 
      },
      { 
        src: `${origin}/pwa-512x512.png`, 
        sizes: '512x512', 
        type: 'image/png', 
        purpose: 'any' 
      },
      { 
        src: `${origin}/pwa-pwa-maskable-512x512.png`, 
        sizes: '512x512', 
        type: 'image/png', 
        purpose: 'maskable' 
      },
    ],
    // Add a timestamp to the object so every generation is unique
    v: Date.now() 
  };
}

export function injectManifest(manifest: WebAppManifest): void {
  const identity = manifest.id || 'default';
  const cityName = manifest.short_name;
  const origin = window.location.origin;


  // 1. FORCE BROWSER & APPLE TITLES
  // document.title affects the "Name" field in many share sheets
  document.title = `${cityName} Pack`;
  
// 2. Force the Apple Home Screen Meta Tag
let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
if (appleTitle) {
  appleTitle.setAttribute('content', cityName);
} else {
  const meta = document.createElement('meta');
  meta.name = "apple-mobile-web-app-title";
  meta.content = cityName;
  document.head.appendChild(meta);
}

  // 2. FORCE UPDATE THE ICON FOR THE SHARE PANEL
  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(appleIcon);
  }
  // Add a tiny version query (?v=...) to force the browser to re-fetch the icon 
// from the public folder instead of using a cached generic one.
const iconPath = `${origin}/pwa-192x192.png?v=${Date.now()}`;
appleIcon.href = iconPath;

  // Ensuring the href is absolute helps iOS identify the resource immediately
  appleIcon.setAttribute('href', `${origin}/pwa-192x192.png`);

  // 3. CLEANUP AND INJECT MANIFEST BLOB
  // Remove any existing manifests to force the browser to re-read the new identity
  document.querySelectorAll('link[rel="manifest"]').forEach(el => {
    const href = el.getAttribute('href');
    if (href?.startsWith('blob:')) {
      URL.revokeObjectURL(href);
    }
    el.remove();
  });

  // Create the new manifest blob
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestURL = URL.createObjectURL(blob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  
  // Custom attributes to help with debugging and identity tracking
  link.setAttribute('data-identity', identity);
  link.setAttribute('data-city', cityName);
  link.setAttribute('crossorigin', 'use-credentials'); 
  
  document.head.appendChild(link);

  console.log(`✅ Identity Rotated: ${cityName} manifest injected.`);
}

export function updateThemeColor(color: string): void {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}