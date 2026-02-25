import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { posthogClient } from './analytics'

export default function PostHogPageView() {
  const location = useLocation()

  useEffect(() => {
    posthogClient.capture('$pageview', {
      path: location.pathname,
    })
  }, [location])

  return null
}