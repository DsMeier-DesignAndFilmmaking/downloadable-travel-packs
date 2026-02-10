/**
 * Mock endpoint: Suggest a City.
 * Future: hook for AI to generate new packs on demand.
 */

type VercelRequest = { method?: string; body?: string }
type VercelResponse = {
  status(code: number): VercelResponse
  setHeader(name: string, value: string): VercelResponse
  end(body?: string): void
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json').end(
      JSON.stringify({ error: 'Method not allowed' })
    )
    return
  }

  // Mock: accept any body and return success. Future: validate, queue, or call AI.
  let body: { cityName?: string; notes?: string } = {}
  try {
    if (req.body) body = JSON.parse(req.body) as { cityName?: string; notes?: string }
  } catch {
    // ignore
  }

  res
    .status(200)
    .setHeader('Content-Type', 'application/json')
    .end(
      JSON.stringify({
        ok: true,
        message: 'Suggestion received (mock). AI pack generation coming soon.',
        cityName: body.cityName ?? null,
      })
    )
}
