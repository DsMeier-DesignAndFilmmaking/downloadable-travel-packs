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
  v?: number; 
}

/**
 * UPDATED: Per-city isolation logic.
 * @param slug - The clean city slug (e.g., 'seoul-south-korea')
 */
export function generateCityGuideManifest(cityId: string, cityName: string, slug: string): WebAppManifest {
  const origin = window.location.origin;

  // LOCK LOGIC: 
  // 1. scope: Limits the "App" context to just this city guide folder.
  // 2. start_url: Forces the home screen icon to open exactly this guide with a PWA flag.
  const scope = `/guide/${slug}/`;
  const start_url = `/guide/${slug}?source=pwa`;

  return {
    id: `tp-v2-${cityId}`, 
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

  // 1. UPDATE APPLE TAGS (Essential for iOS Home Screen Identity)
  let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitle) {
    appleTitle = document.createElement('meta');
    (appleTitle as HTMLMetaElement).name = 'apple-mobile-web-app-title';
    document.head.appendChild(appleTitle);
  }
  appleTitle.setAttribute('content', cityName);

  // Modern standard meta for mobile-web-app-capable
  let mobileCapable = document.querySelector('meta[name="mobile-web-app-capable"]');
  if (!mobileCapable) {
    mobileCapable = document.createElement('meta');
    (mobileCapable as HTMLMetaElement).name = 'mobile-web-app-capable';
    (mobileCapable as HTMLMetaElement).content = 'yes';
    document.head.appendChild(mobileCapable);
  }

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(appleIcon);
  }
  // Cache busting the icon ensures the correct city icon is grabbed by the OS
  appleIcon.setAttribute('href', `${origin}/pwa-192x192.png?v=${identity}`);

  // 2. Document title (Used by iOS as the default Home Screen name)
  document.title = `${cityName} Pack`;

  // 3. CLEANUP AND INJECT MANIFEST BLOB
  document.querySelectorAll('link[rel="manifest"]').forEach(el => {
    const href = el.getAttribute('href');
    if (href?.startsWith('blob:')) {
      URL.revokeObjectURL(href);
    }
    el.remove();
  });

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestURL = URL.createObjectURL(blob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  
  link.setAttribute('data-identity', identity);
  link.setAttribute('data-city', cityName);
  
  document.head.appendChild(link);

  console.log(`✅ Identity Rotated & Locked: ${cityName} (Scope: ${manifest.scope})`);
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