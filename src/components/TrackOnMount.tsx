'use client'

import { useEffect, useRef } from 'react'
import { trackValueEvent } from '@/lib/analytics'
import type { ValueEvent, ValueEntityType } from '@/lib/value-events'

/**
 * Dispara un value-event UNA vez al montar. Sirve para instrumentar escalones
 * del funnel que viven en server components (ej. planes_view, pro_prompt_view):
 * se dropea `<TrackOnMount event="planes_view" />` y listo.
 */
export default function TrackOnMount({
  event,
  entityType,
  entitySlug,
}: {
  event: ValueEvent
  entityType?: ValueEntityType
  entitySlug?: string
}) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackValueEvent(event, { entityType, entitySlug })
  }, [event, entityType, entitySlug])
  return null
}
