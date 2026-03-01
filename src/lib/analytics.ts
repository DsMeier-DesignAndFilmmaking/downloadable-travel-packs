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
    capture_pageview: false,
    autocapture: false,
    ...(import.meta.env.DEV ? { flushAt: 1, flushInterval: 100 } as any : {}),
    person_profiles: 'identified_only',
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        console.log('✅ PostHog loaded. Distinct ID:', ph.get_distinct_id())
      }
    },
  })
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as any).posthog = posthog
}

export { posthog, posthog as posthogClient }

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

  if (eventName === '$pageview') {
    const pathname = properties.pathname
    const cityName = properties.city_name
    if (
      typeof pathname === 'string' &&
      pathname.startsWith('/guide/') &&
      typeof cityName !== 'string'
    ) {
      return
    }
  }

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
// Arrival Intelligence Events
// -----------------------------

/** "See Tourist Zone Map" tapped in City Dynamics. */
export function trackTouristZoneMapOpened(cityName: string): void {
  captureEvent('tourist_zone_map_opened', { city_name: cityName })
}

/** "Find Local Alternatives" tapped in City Dynamics. */
export function trackLocalAlternativeClicked(cityName: string): void {
  captureEvent('local_alternative_clicked', { city_name: cityName })
}

// -----------------------------
// Environmental Impact Events
// -----------------------------

/**
 * Fired when a user taps a weather/air-quality adaptive CTA.
 * e.g. "See Indoor Spots Nearby", "Find Low-Pollution Parks"
 *
 * PostHog event: weather_adaptive_cta_clicked
 *
 * @param cityName    - City the action belongs to (e.g. "Bangkok")
 * @param ctaLabel    - Button label as displayed (e.g. "See Indoor Spots Nearby")
 * @param actionIndex - 0-based position in the actions list (for funnel analysis)
 */
export function trackWeatherAdaptiveCta(
  cityName: string,
  ctaLabel: string,
  actionIndex: number,
): void {
  captureEvent('weather_adaptive_cta_clicked', {
    city_name: cityName,
    cta_label: ctaLabel,
    action_index: actionIndex,
  })
}

/**
 * Fired when a user taps a sustainability / local-impact CTA.
 * e.g. "View Rail Map", "Shop Or Tor Kor Market", "Explore Thonglor"
 *
 * PostHog event: sustainability_action_clicked
 *
 * @param cityName    - City the action belongs to (e.g. "Bangkok")
 * @param ctaLabel    - Button label as displayed
 * @param actionIndex - 0-based position in the actions list
 */
export function trackSustainabilityAction(
  cityName: string,
  ctaLabel: string,
  actionIndex: number,
): void {
  captureEvent('sustainability_action_clicked', {
    city_name: cityName,
    cta_label: ctaLabel,
    action_index: actionIndex,
  })
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

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendDuration()
      }
    })
  }

  public sendDuration(): void {
    const durationMs = Date.now() - this.startTime
    captureEvent(
      this.pageName === 'homepage' ? 'homepage_duration' : 'city_pack_duration',
      {
        duration_ms: durationMs,
        ...(this.cityName ? { city_name: this.cityName } : {}),
      },
    )
  }
}