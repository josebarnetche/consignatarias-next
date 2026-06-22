'use client'

import type { ReactNode } from 'react'
import { PriceLineChart, type PricePoint } from '@/components/charts/PriceLineChart'
import { SEMANTIC_HEX, type SemanticTone } from '@/lib/ui/tokens'

export type { PricePoint }

/* ================================================================== */
/*  Series — wrapper fino sobre PriceLineChart (DESIGN-SYSTEM.md §4)   */
/*  Rompe el acoplamiento a hex: recibe `tone: SemanticTone` y resuelve */
/*  `SEMANTIC_HEX[tone]`. Nunca un literal '#34d399' en la página.      */
/* ================================================================== */

interface SeriesProps {
  data: PricePoint[]
  /** Color de la serie por token semántico. Default `positive`. */
  tone?: SemanticTone
  /** Altura del área de gráfico en px. Default 200. */
  height?: number
  /** Decimales del valor en tooltip/ejes. Default 0. */
  decimals?: number
  /** Prefijo del valor (ej. "$"). Default "$". */
  prefix?: string
  /** Sufijo del valor (ej. "/kg"). Default "". */
  suffix?: string
  className?: string
}

/**
 * Serie de precio estandarizada. Color SIEMPRE desde el token.
 *
 *   <Series data={pts} tone="positive" height={140} prefix="$" />
 */
export function Series({
  data,
  tone = 'positive',
  height = 200,
  decimals = 0,
  prefix = '$',
  suffix = '',
  className = '',
}: SeriesProps) {
  return (
    <PriceLineChart
      data={data}
      height={height}
      accentColor={SEMANTIC_HEX[tone]}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      className={className}
    />
  )
}

/* ================================================================== */
/*  ChartCard — panel terminal + header + <Series>                    */
/* ================================================================== */

interface ChartCardProps extends SeriesProps {
  /** Título del panel (header terminal). */
  title?: ReactNode
  /** Slot de acciones a la derecha del header (rangeTabs, link API, etc). */
  actions?: ReactNode
  /** Contenido extra debajo del gráfico (footer/notas). */
  footer?: ReactNode
  /** Clase del panel envolvente. */
  panelClassName?: string
}

/**
 * Panel de gráfico canónico: `terminal-panel` + header + <Series> + footer.
 * Estandariza eje/tooltip/colores por token. DESIGN-SYSTEM.md §4.
 *
 *   <ChartCard title="EVOLUCIÓN INMAG" data={pts} tone="positive" prefix="$" />
 */
export function ChartCard({
  title,
  actions,
  footer,
  panelClassName = '',
  className = '',
  ...series
}: ChartCardProps) {
  return (
    <div className={`terminal-panel ${panelClassName}`.trim()}>
      {(title != null || actions != null) && (
        <div className="terminal-panel-header font-heading flex items-center justify-between gap-2">
          <span>{title}</span>
          {actions != null && <span className="flex items-center gap-2">{actions}</span>}
        </div>
      )}
      <div className="terminal-panel-body">
        <Series {...series} className={className} />
        {footer != null && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  )
}

export default ChartCard
