import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import posthog from './analytics'

export default function PostHogPageView() {
  const location = useLocation()

  useEffect(() => {
    posthog.capture('$pageview', {
      path: location.pathname,
    })
  }, [location])

  return null
}