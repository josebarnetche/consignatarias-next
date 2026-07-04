'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

interface Props {
  svg?: string // gráfico server-rendered (legacy)
  children?: React.ReactNode // gráfico interactivo (preferido)
  context: string // analytics context
  /** Compat: título del viejo gate (ignorado). */
  title?: string
  /** Compat: descripción del viejo gate (ignorado). */
  description?: string
}

/**
 * (Ex-)gate PRO de gráficos. PRO Usuario fue retirado (2026-07): estos gráficos
 * (histórico completo, etc.) son ahora GRATIS. Passthrough + track de vista:
 * renderiza el gráfico directo (SSR-safe, sin flash de placeholder ni upsell) y
 * registra `chart_view`. Se mantiene la firma de props para no tocar los callers.
 */
export default function ProChartGate({ svg, children, context }: Props) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackEvent('chart_view', { context })
  }, [context])

  if (children) return <div className="px-panel py-4">{children}</div>
  return <div className="px-panel py-4" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
}
