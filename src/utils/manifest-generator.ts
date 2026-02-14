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

  // 1. Cleanup old manifests
  document.querySelectorAll('link[rel="manifest"]').forEach(el => {
    const href = el.getAttribute('href');
    if (href?.startsWith('blob:')) URL.revokeObjectURL(href);
    el.remove();
  });

  // 2. NEW: Update Meta Tags for iOS Share Sheet / Home Screen Name
  // This fixes the "TravelPacks V2" default name issue
  let metaAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!metaAppTitle) {
    metaAppTitle = document.createElement('meta');
    metaAppTitle.setAttribute('name', 'apple-mobile-web-app-title');
    document.head.appendChild(metaAppTitle);
  }
  metaAppTitle.setAttribute('content', cityName);

  // Update the Title tag (often used as fallback for the icon name)
  document.title = `${cityName} Travel Pack`;

  // 3. NEW: Update iOS Icon Link
  // iOS often looks for apple-touch-icon before the manifest
  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(appleIcon);
  }
  // Use the 512x512 icon from your manifest
  const iconSrc = manifest.icons.find(i => i.sizes === '512x512')?.src || manifest.icons[0].src;
  appleIcon.setAttribute('href', iconSrc);

  // 4. Create and Inject Blob Manifest (Your existing logic)
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestURL = URL.createObjectURL(blob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  link.setAttribute('data-identity', identity); 
  link.setAttribute('crossorigin', 'use-credentials'); 
  
  document.head.appendChild(link);
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