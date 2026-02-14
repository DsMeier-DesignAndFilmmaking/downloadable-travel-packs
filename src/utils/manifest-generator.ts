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
}

export function generateCityGuideManifest(cityId: string, cityName: string): WebAppManifest {
  const origin = window.location.origin;
  
  // FIXED: Use absolute paths that strictly match for validation
  // start_url MUST start with the scope string.
  const scope = `/guide/${cityId}`; 
  const startUrl = `/guide/${cityId}?utm_source=pwa`;

  return {
    id: `tp-v2-${cityId}`, 
    name: `${cityName} Travel Pack`,
    short_name: cityName,
    description: `Offline travel pack for ${cityName} — survival, emergency & arrival.`,
    start_url: startUrl, 
    scope: scope, 
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
  };
}

export function injectManifest(manifest: WebAppManifest): void {
  // 1. Clean up
  document.querySelectorAll('link[rel="manifest"]').forEach(el => {
    const href = el.getAttribute('href');
    if (href?.startsWith('blob:')) URL.revokeObjectURL(href);
    el.remove();
  });

  // 2. Create Blob
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestURL = URL.createObjectURL(blob);

  // 3. Inject
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  // Crucial: some browsers need this to resolve the relative paths correctly 
  // if they weren't made absolute (though we made them absolute above for safety)
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