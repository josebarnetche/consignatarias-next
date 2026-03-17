'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, Suspense } from 'react'
import { trackPlanesView } from '@/lib/analytics'

/**
 * Tracks /planes page views with conversion source.
 * Captures the `from` query param to attribute conversions
 * to specific PRO upgrade prompts.
 */
function PlanesTrackerInner() {
  const searchParams = useSearchParams()
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!hasTracked.current) {
      const source = searchParams?.get('from')
      trackPlanesView(source)
      hasTracked.current = true
    }
  }, [searchParams])

  return null
}

export default function PlanesTracker() {
  return (
    <Suspense fallback={null}>
      <PlanesTrackerInner />
    </Suspense>
  )
}
