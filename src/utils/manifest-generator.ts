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

export function generateCityGuideManifest(cityId: string, cityName: string, slug: string): WebAppManifest {
  const origin = window.location.origin;

  // 1. SCOPE: Root '/' ensures the SW controls the whole app 
  // and Safari doesn't show a 'back to browser' bar.
  const scope = `${origin}/`;

  // 2. START_URL: This MUST be the specific city path.
  // This ensures the Bangkok icon opens Bangkok, not the Home Screen.
  const start_url = `${origin}/guide/${slug}?source=pwa`;

  return {
    // 3. ID: Crucial for Android/Chrome to treat these as separate apps
    id: `tp-v2-${slug}`, 
    name: `${cityName} Travel Pack`,
    short_name: cityName,
    description: `Offline travel pack for ${cityName} — survival, emergency & arrival.`,
    start_url,
    scope,
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
    v: Date.now() 
  };
}

export function injectManifest(manifest: WebAppManifest): void {
  const identity = manifest.id || 'default';
  const cityName = manifest.short_name;
  const origin = window.location.origin;

  // 1. UPDATE APPLE TAGS IMMEDIATELY — these affect the Share panel, so run first
  let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) {
    appleTitle.setAttribute('content', cityName);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    meta.content = cityName;
    document.head.appendChild(meta);
  }

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(appleIcon);
  }
  appleIcon.setAttribute('href', `${origin}/pwa-192x192.png?v=${Date.now()}`);

  // 2. Document title (affects share sheet)
  document.title = `${cityName} Pack`;

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