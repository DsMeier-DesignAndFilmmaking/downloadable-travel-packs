import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  persistence: 'localStorage',
  capture_pageview: false, // VERY important for SPA
  autocapture: false,      // We want manual control
})

export default posthog