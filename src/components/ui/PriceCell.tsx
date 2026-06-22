import type { ReactNode } from 'react'
import { SEMANTIC_HEX, type SemanticTone } from '@/lib/ui/tokens'
import Delta from './Delta'

interface PriceCellProps {
  /**
   * Valor numérico. `null`/`undefined` → "—" en neutral (nunca inventa precio).
   */
  value: number | null | undefined
  /** Prefijo del valor, ej. "$". Default "". */
  prefix?: string
  /** Sufijo del valor, ej. "/kg". Default "". */
  suffix?: ReactNode
  /** Decimales para el formato es-AR. Default 0. */
  decimals?: number
  /** Variación firmada → render como <Delta> inline al lado del valor. */
  delta?: number | null
  /** Threshold para el <Delta>. */
  deltaThreshold?: number
  /** Tono del valor. Default `emphasis`. */
  tone?: SemanticTone
  /** Formateador custom del valor (recibe el número). */
  format?: (n: number) => ReactNode
  className?: string
}

const fmtNum = (decimals: number) => (n: number): string =>
  n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/**
 * Celda de precio canónica: valor (`tabular-nums`, tono semántico) + <Delta>
 * inline. Idéntica en INMAG, precios y remates. DESIGN-SYSTEM.md §4.
 *
 *   <PriceCell value={2872} prefix="$" />
 *   <PriceCell value={2872} prefix="$" suffix="/kg" delta={1.4} />
 *   <PriceCell value={null} />            // —
 */
export default function PriceCell({
  value,
  prefix = '',
  suffix,
  decimals = 0,
  delta,
  deltaThreshold = 0,
  tone = 'emphasis',
  format,
  className = '',
}: PriceCellProps) {
  const empty = value == null || Number.isNaN(value)
  const fmt = format ?? fmtNum(decimals)
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`.trim()}>
      <span
        className="font-terminal tabular-nums"
        style={{ color: empty ? SEMANTIC_HEX.neutral : SEMANTIC_HEX[tone] }}
      >
        {empty ? (
          '—'
        ) : (
          <>
            {prefix}
            {fmt(value)}
            {suffix != null && (
              <span className="text-xxs text-zinc-500 ml-0.5">{suffix}</span>
            )}
          </>
        )}
      </span>
      {delta !== undefined && !empty && (
        <Delta change={delta} threshold={deltaThreshold} className="text-data" />
      )}
    </span>
  )
}
