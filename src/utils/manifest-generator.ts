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

  // 1. FORCE UPDATE META TAGS FOR SHARE SHEET
  document.title = `${cityName} Pack`;

  const metaTags = [
    { name: 'apple-mobile-web-app-title', content: cityName },
    { name: 'application-name', content: cityName },
    { name: 'og:title', content: `${cityName} Travel Pack` }
  ];

  metaTags.forEach(tag => {
    let element = document.querySelector(`meta[name="${tag.name}"], meta[property="${tag.name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(tag.name.includes('og:') ? 'property' : 'name', tag.name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', tag.content);
  });

  // 2. Cleanup old manifest links
  document.querySelectorAll('link[rel="manifest"]').forEach(el => {
    const href = el.getAttribute('href');
    if (href?.startsWith('blob:')) URL.revokeObjectURL(href);
    el.remove();
  });

  // 3. Create and Inject Blob Manifest
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