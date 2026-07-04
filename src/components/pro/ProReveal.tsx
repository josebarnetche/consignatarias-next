'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'

interface ProRevealProps {
  children: ReactNode
  /** Compat: ya no se muestra (herramienta gratis). */
  benefit?: string
  /** Clave de la herramienta para analytics, ej. "/mercado/vender-ahora". */
  from: string
  /** Compat: placeholder del viejo teaser (ignorado). */
  placeholder?: ReactNode
  /** Compat: título del panel gateado (ignorado). */
  title?: string
  /** Compat: probada semanal (ignorado). */
  tasteUnlocked?: boolean
  /** Compat: días para próxima probada (ignorado). */
  tasteResetDays?: number
}

/**
 * (Ex-)gate PRO. PRO Usuario fue retirado (2026-07): estas herramientas de
 * decisión del productor (neto en mano, ¿vendo ahora?, estacionalidad, histórico,
 * exports) son ahora GRATIS.
 *
 * ProReveal quedó como passthrough + instrumentación: renderiza el contenido real
 * para todos y registra `tool_view` (con la clave `from`) para medir el uso de cada
 * herramienta minuto a minuto en analytics. Se mantiene la firma de props para no
 * tocar los callers; los props del viejo teaser se ignoran.
 */
export default function ProReveal({ children, from }: ProRevealProps) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackEvent('tool_view', { tool: from })
  }, [from])

  return <>{children}</>
}
