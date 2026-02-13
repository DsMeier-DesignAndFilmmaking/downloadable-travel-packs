/**
 * Vercel Serverless Function: Dynamic PWA manifest.
 * GET /api/manifest?slug=:slug → application/manifest+json
 * Rewrite /api/manifest/:slug to this with slug in query.
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
    return
  }

  const cityName = slugToTitle(slug)
  const proto = req.headers['x-forwarded-proto']
  const host = req.headers['x-forwarded-host']
  const origin =
    proto && host
      ? `${Array.isArray(proto) ? proto[0] : proto}://${Array.isArray(host) ? host[0] : host}`
      : typeof process !== 'undefined' && process.env?.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://travelpacks.example.com'

  const manifest = {
    name: `${cityName} Travel Pack`,
    short_name: `${cityName} Pack`,
    description: `Superior travel pack for ${cityName} — survival, emergency & arrival. Works offline.`,
    start_url: `/guide/${slug}?utm_source=pwa`,
    display: 'standalone' as const,
    scope: `/guide/${slug}/`,
    theme_color: '#0f172a',
    background_color: '#0f172a',
    prefer_related_applications: false,
    icons: [
      { src: `${origin}/pwa-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${origin}/pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${origin}/pwa-pwa-maskable-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  res
    .status(200)
    .setHeader('Content-Type', 'application/manifest+json')
    .setHeader('Cache-Control', 's-maxage=0')
    .end(JSON.stringify(manifest))
}
