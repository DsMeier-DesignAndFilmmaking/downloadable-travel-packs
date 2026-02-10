/**
 * Suggest a City — Accepts city + pain points; logs for prioritizing next 10 cities.
 * Future: persist to DB or queue for AI content generation.
 */

type VercelRequest = { method?: string; body?: string }
type VercelResponse = {
  status(code: number): VercelResponse
  setHeader(name: string, value: string): VercelResponse
  end(body?: string): void
}

export const PAIN_POINT_OPTIONS = [
  'Transport',
  'Safety',
  'Food',
  'Money',
  'Language',
  'Scams',
  'Emergency',
] as const

export type PainPoint = (typeof PAIN_POINT_OPTIONS)[number]

export interface SuggestCityBody {
  cityName?: string
  notes?: string
  painPoints?: string[]
}

function isValidPainPoint(s: string): s is PainPoint {
  return (PAIN_POINT_OPTIONS as readonly string[]).includes(s)
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json').end(
      JSON.stringify({ error: 'Method not allowed' })
    )
    return
  }

  let body: SuggestCityBody = {}
  try {
    if (req.body) body = JSON.parse(req.body) as SuggestCityBody
  } catch {
    res.status(400).setHeader('Content-Type', 'application/json').end(
      JSON.stringify({ error: 'Invalid JSON' })
    )
    return
  }

  const cityName = typeof body.cityName === 'string' ? body.cityName.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const rawPainPoints = Array.isArray(body.painPoints) ? body.painPoints : []
  const painPoints = rawPainPoints.filter((p): p is PainPoint => typeof p === 'string' && isValidPainPoint(p))

  const payload = {
    cityName: cityName || null,
    notes: notes || null,
    painPoints,
    timestamp: new Date().toISOString(),
  }

  // Log for prioritization (Vercel serverless logs; or pipe to analytics/DB)
  console.log('[suggest-city]', JSON.stringify(payload))

  res
    .status(200)
    .setHeader('Content-Type', 'application/json')
    .end(
      JSON.stringify({
        ok: true,
        message: 'Suggestion received. We’ll use pain points to prioritize the next cities.',
        cityName: payload.cityName,
        painPoints: payload.painPoints,
      })
    )
}
