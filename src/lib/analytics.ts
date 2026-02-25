// /src/lib/analytics.ts
import posthog from 'posthog-js'

// -----------------------------
// Environment variables
// -----------------------------
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// -----------------------------
// Initialize PostHog
// -----------------------------
if (!POSTHOG_KEY) {
  console.warn('⚠️ PostHog key missing — analytics disabled')
} else {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'localStorage',
    capture_pageview: false, // SPA controlled manually
    autocapture: false,      // manual control

    // DEV-only flush settings for immediate Live Events
    ...(import.meta.env.DEV ? { flushAt: 1, flushInterval: 100 } as any : {}),

    // recommended for newer PostHog versions
    person_profiles: 'identified_only',

    loaded: (ph) => {
      if (import.meta.env.DEV) {
        console.log('✅ PostHog loaded. Distinct ID:', ph.get_distinct_id())
      }
    },
  })
}

// Expose globally only in development for debugging
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as any).posthog = posthog
}

// Named export for TS safety
export { posthog as posthogClient }

// -----------------------------
// Session Handling
// -----------------------------
export function getSessionId(): string {
  let sessionId = localStorage.getItem('tp_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('tp_session_id', sessionId)
  }
  return sessionId
}

// -----------------------------
// Centralized Capture Wrapper
// -----------------------------
export function captureEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  if (!POSTHOG_KEY) return

  posthog.capture(eventName, {
    environment: import.meta.env.MODE,
    app_version: '1.0',
    session_id: getSessionId(),
    ...properties,
  })
}

// -----------------------------
// Structured Events
// -----------------------------
export function trackHomepageView(): void {
  captureEvent('homepage_viewed')
}

export function trackCityPackView(cityName: string): void {
  captureEvent('city_pack_viewed', { city_name: cityName })
}

export function trackAddToDevice(cityName: string): void {
  captureEvent('add_to_device_clicked', { city_name: cityName })
}

// -----------------------------
// Page Duration Tracker
// -----------------------------
export class PageTimer {
  private startTime: number
  private pageName: 'homepage' | 'city_pack'
  private cityName?: string

  constructor(pageName: 'homepage' | 'city_pack', cityName?: string) {
    this.pageName = pageName
    this.cityName = cityName
    this.startTime = Date.now()

    // Send duration on tab close or hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendDuration()
      }
    })
  }

  public sendDuration(): void {
    const durationMs = Date.now() - this.startTime

    captureEvent(
      this.pageName === 'homepage'
        ? 'homepage_duration'
        : 'city_pack_duration',
      {
        duration_ms: durationMs,
        ...(this.cityName ? { city_name: this.cityName } : {}),
      },
    )
  }
}