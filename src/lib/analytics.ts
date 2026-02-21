// /src/lib/analytics.ts
import posthog from 'posthog-js'

// -----------------------------
// Initialize PostHog
// -----------------------------
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  persistence: 'localStorage',
  capture_pageview: false, // VERY important for SPA
  autocapture: false,      // Manual control
})

export default posthog

// -----------------------------
// Session Handling
// -----------------------------
export function getSessionId(): string {
  let sessionId = localStorage.getItem('tp_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID() // unique session per user
    localStorage.setItem('tp_session_id', sessionId)
  }
  return sessionId
}

// -----------------------------
// Event Tracking
// -----------------------------
export function trackHomepageView(): void {
  posthog.capture('homepage_viewed', {
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  })
}

export function trackCityPackView(cityName: string): void {
  posthog.capture('city_pack_viewed', {
    city_name: cityName,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  })
}

export function trackAddToDevice(cityName: string): void {
  posthog.capture('add_to_device_clicked', {
    city_name: cityName,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
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

    // Automatically send duration on page unload
    window.addEventListener('beforeunload', () => this.sendDuration())
  }

  public sendDuration(): void {
    const durationMs = Date.now() - this.startTime
    const eventName = this.pageName === 'homepage' ? 'homepage_duration' : 'city_pack_duration'

    const payload: Record<string, any> = {
      session_id: getSessionId(),
      duration: durationMs, // milliseconds
      timestamp: new Date().toISOString(),
    }

    if (this.cityName) payload.city_name = this.cityName

    posthog.capture(eventName, payload)
  }
}