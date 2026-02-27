import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { captureEvent } from './analytics'

const STRICT_MODE_DEDUPE_WINDOW_MS = 1000
let lastPageviewPathname: string | null = null
let lastPageviewAtMs = 0

export default function PostHogPageView() {
  const location = useLocation()
  const pathname = location.pathname

  useEffect(() => {
    const now = Date.now()

    // React.StrictMode intentionally mounts twice in development.
    // Skip immediate duplicate pageviews for the same pathname.
    if (
      import.meta.env.DEV &&
      lastPageviewPathname === pathname &&
      now - lastPageviewAtMs < STRICT_MODE_DEDUPE_WINDOW_MS
    ) {
      return
    }

    lastPageviewPathname = pathname
    lastPageviewAtMs = now

    captureEvent('$pageview', { pathname })
  }, [pathname])

  return null
}
