/**
 * Vercel Serverless Function: Visa check proxy with centralized cache + 429 backoff.
 * GET /api/visa-check?passport=US&destination=FR
 */

type VercelRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status(code: number): VercelResponse
  setHeader(name: string, value: string): VercelResponse
  end(body?: string): void
}

interface VisaCheckData {
  passport?: { currency_code?: string; [key: string]: unknown }
  destination?: { passport_validity?: string; exchange?: string; currency_code?: string; [key: string]: unknown }
  visa_rules?: {
    primary_rule?: { name?: string; duration?: string; link?: string; [key: string]: unknown }
    secondary_rule?: { link?: string; [key: string]: unknown }
    [key: string]: unknown
  }
  mandatory_registration?: {
    color?: string
    link?: string
    text?: string
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

interface CacheEntry {
  data: VisaCheckData
  expiresAt: number
  staleUntil: number
}

type UpstreamResult =
  | { ok: true; data: VisaCheckData }
  | { ok: false; status: number; message: string; retryAfterMs?: number }

interface VisaProxyState {
  cache: Map<string, CacheEntry>
  inflight: Map<string, Promise<UpstreamResult>>
  globalRateLimitedUntil: number
}

const API_HOST = process.env.TRAVEL_BUDDY_HOST || process.env.VITE_TRAVEL_BUDDY_HOST || 'visa-requirement.p.rapidapi.com'
const API_KEY = process.env.TRAVEL_BUDDY_KEY || process.env.VITE_TRAVEL_BUDDY_KEY
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000
const STALE_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 30 * 60 * 1000

function getState(): VisaProxyState {
  const globalWithState = globalThis as typeof globalThis & { __visaProxyState__?: VisaProxyState }
  if (!globalWithState.__visaProxyState__) {
    globalWithState.__visaProxyState__ = {
      cache: new Map<string, CacheEntry>(),
      inflight: new Map<string, Promise<UpstreamResult>>(),
      globalRateLimitedUntil: 0,
    }
  }
  return globalWithState.__visaProxyState__
}

function getQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function normalizeCountryCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function isCodeValid(code: string): boolean {
  return /^[A-Z]{2,3}$/.test(code)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value != null ? (value as Record<string, unknown>) : null
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseRetryAfterMs(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) return DEFAULT_RATE_LIMIT_BACKOFF_MS
  const seconds = Number.parseInt(retryAfterHeader, 10)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  return DEFAULT_RATE_LIMIT_BACKOFF_MS
}

function normalizeVisaPayload(rawData: Record<string, unknown>): VisaCheckData {
  const regSource =
    asRecord(rawData['mandatory_registration']) ||
    asRecord(rawData['registration']) ||
    asRecord(rawData['requirement'])

  return {
    ...rawData,
    mandatory_registration: regSource
      ? {
          text:
            asNonEmptyString(regSource['text']) ||
            asNonEmptyString(regSource['label']) ||
            asNonEmptyString(regSource['name']) ||
            asNonEmptyString(regSource['description']),
          link: asNonEmptyString(regSource['link']) || asNonEmptyString(regSource['url']),
          color: asNonEmptyString(regSource['color']) || 'amber',
        }
      : null,
  }
}

async function fetchUpstream(passport: string, destination: string): Promise<UpstreamResult> {
  if (!API_KEY) {
    return {
      ok: false,
      status: 500,
      message: 'Missing TRAVEL_BUDDY_KEY server environment variable',
    }
  }

  const params = new URLSearchParams()
  params.append('passport', passport)
  params.append('destination', destination)

  try {
    const response = await fetch(`https://${API_HOST}/v2/visa/check`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
      },
      body: params.toString(),
    })

    if (response.status === 429) {
      return {
        ok: false,
        status: 429,
        message: 'RapidAPI rate limit exceeded',
        retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `RapidAPI request failed (${response.status})`,
      }
    }

    const payload = (await response.json()) as unknown
    const payloadRecord = asRecord(payload)
    if (!payloadRecord) {
      return {
        ok: false,
        status: 502,
        message: 'Upstream response was not valid JSON object',
      }
    }

    const rawData = asRecord(payloadRecord['data']) || payloadRecord
    if (!rawData) {
      return {
        ok: false,
        status: 502,
        message: 'Upstream response missing visa payload',
      }
    }

    return { ok: true, data: normalizeVisaPayload(rawData) }
  } catch (error) {
    console.error('[visa-check] upstream request failed', error)
    return {
      ok: false,
      status: 502,
      message: 'Failed to reach upstream provider',
    }
  }
}

function sendJson(res: VercelResponse, status: number, body: Record<string, unknown>, cacheState: string): void {
  res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('Cache-Control', 'no-store')
    .setHeader('X-Visa-Cache', cacheState)
    .end(JSON.stringify(body))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' }, 'bypass')
    return
  }

  const passport = normalizeCountryCode(getQueryParam(req.query.passport))
  const destination = normalizeCountryCode(getQueryParam(req.query.destination))

  if (!isCodeValid(passport) || !isCodeValid(destination)) {
    sendJson(
      res,
      400,
      { error: 'Invalid passport or destination code. Expected ISO alpha code like US, FR, JP.' },
      'bypass'
    )
    return
  }

  const key = `${passport}_${destination}`
  const now = Date.now()
  const state = getState()
  const cached = state.cache.get(key)

  if (cached && cached.expiresAt > now) {
    sendJson(res, 200, cached.data, 'hit')
    return
  }

  if (state.globalRateLimitedUntil > now) {
    if (cached && cached.staleUntil > now) {
      sendJson(res, 200, cached.data, 'stale-rate-limit')
      return
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((state.globalRateLimitedUntil - now) / 1000))
    res.setHeader('Retry-After', String(retryAfterSeconds))
    sendJson(res, 429, { error: 'Visa provider temporarily rate-limited. Retry later.' }, 'rate-limited')
    return
  }

  let inflight = state.inflight.get(key)
  if (!inflight) {
    inflight = fetchUpstream(passport, destination).finally(() => {
      state.inflight.delete(key)
    })
    state.inflight.set(key, inflight)
  }

  const result = await inflight
  const currentTime = Date.now()

  if (result.ok) {
    state.cache.set(key, {
      data: result.data,
      expiresAt: currentTime + SUCCESS_TTL_MS,
      staleUntil: currentTime + STALE_TTL_MS,
    })
    sendJson(res, 200, result.data, 'miss')
    return
  }

  const errorResult = result as Extract<UpstreamResult, { ok: false }>

  if (errorResult.status === 429) {
    state.globalRateLimitedUntil = currentTime + (errorResult.retryAfterMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS)
    if (cached && cached.staleUntil > currentTime) {
      sendJson(res, 200, cached.data, 'stale-after-429')
      return
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((state.globalRateLimitedUntil - currentTime) / 1000))
    res.setHeader('Retry-After', String(retryAfterSeconds))
    sendJson(res, 429, { error: 'Visa provider rate-limited request.' }, 'upstream-429')
    return
  }

  if (cached && cached.staleUntil > currentTime) {
    sendJson(res, 200, cached.data, 'stale-after-error')
    return
  }

  sendJson(res, 502, { error: errorResult.message }, 'error')
}
