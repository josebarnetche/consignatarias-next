'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import LoginGate from '@/components/LoginGate'

interface ProRevealProps {
  children: ReactNode
  /** Compat: ya no se muestra (herramienta gratis). */
  benefit?: string
  /** Clave de la herramienta para analytics, ej. "/mercado/vender-ahora". */
  from: string
  /** Preview que ve el anónimo en lugar del resultado. */
  placeholder?: ReactNode
  /** Título del panel gateado — se usa en el cartel de login. */
  title?: string
  /** Compat: probada semanal (ignorado). */
  tasteUnlocked?: boolean
  /** Compat: días para próxima probada (ignorado). */
  tasteResetDays?: number
}

/**
 * Gate de las herramientas de decisión del productor (neto en mano, ¿vendo
 * ahora?, estacionalidad, década completa del INMAG).
 *
 * PRO Usuario fue retirado (2026-07): ya no se cobra por estas herramientas —
 * son gratis, pero piden cuenta. El productor arma su consulta a la vista y el
 * resultado aparece cuando entra. El `placeholder` sigue siendo el preview, así
 * que la página conserva su forma para el visitante (y para Google).
 *
 * Sigue registrando `tool_view` con la clave `from` para medir uso por
 * herramienta.
 */
export default function ProReveal({ children, from, title, placeholder }: ProRevealProps) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackEvent('tool_view', { tool: from })
  }, [from])

  return (
    <LoginGate feature={title} redirectTo={from} minHeight={140} preview={placeholder}>
      {children}
    </LoginGate>
  )
}
