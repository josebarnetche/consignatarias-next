'use client'

import Link from 'next/link'
import { trackValueEvent } from '@/lib/analytics'
import type { ValueEvent, ValueEntityType } from '@/lib/value-events'

/**
 * Un <Link> que dispara un value-event al hacer clic. Permite instrumentar CTAs
 * que viven dentro de server components (ej. el "Activar PRO" del muro).
 */
export default function ValueLink({
  href,
  event,
  entityType,
  entitySlug,
  className,
  children,
}: {
  href: string
  event: ValueEvent
  entityType?: ValueEntityType
  entitySlug?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackValueEvent(event, { entityType, entitySlug })}
    >
      {children}
    </Link>
  )
}
