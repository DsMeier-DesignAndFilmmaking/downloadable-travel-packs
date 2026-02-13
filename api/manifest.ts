/**
 * Vercel Serverless Function: Dynamic PWA manifest.
 * GET /api/manifest?slug=:slug → application/manifest+json
 */

type VercelRequest = {
  query: Record<string, string | string[] | undefined>
  headers: Record<string, string | string[] | undefined>
}
type VercelResponse = {
  status(code: number): VercelResponse
  setHeader(name: string, value: string): VercelResponse
  end(body?: string): void
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined
  if (!slug) {
    res.status(400).setHeader('Content-Type', 'application/json').end(
      JSON.stringify({ error: 'Missing slug' })
    )
    return;
  }

  const cityName = slugToTitle(slug)
  const proto = req.headers['x-forwarded-proto']
  const host = req.headers['x-forwarded-host']
  const origin =
    proto && host
      ? `${Array.isArray(proto) ? proto[0] : proto}://${Array.isArray(host) ? host[0] : host}`
      : typeof process !== 'undefined' && process.env?.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://downloadable-travel-packs.vercel.app'

  const manifest = {
    // Unique ID is critical to prevent "Tokyo" showing "NYC"
    id: `tp-v2-${slug}`, 
    name: `${cityName} Travel Pack`,
    short_name: cityName,
    description: `Superior travel pack for ${cityName} — survival, emergency & arrival. Works offline.`,
    // The start_url must be within the scope
    start_url: `/guide/${slug}?utm_source=pwa`,
    // Trailing slash on scope is a "best practice" for sub-directory PWAs
    scope: `/guide/${slug}/`, 
    display: 'standalone',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    prefer_related_applications: false,
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
  }

  res
    .status(200)
    .setHeader('Content-Type', 'application/manifest+json')
    .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .end(JSON.stringify(manifest))
}