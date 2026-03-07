'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { trackPageView } from '@/lib/analytics'

/**
 * Tracks GA4 pageviews on every Next.js App Router navigation.
 * Without this, only the first page load is tracked — SPA
 * navigations (Link clicks) are invisible to GA4.
 */
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  )
}
