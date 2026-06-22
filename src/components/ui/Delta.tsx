import type { ReactNode } from 'react'
import { SEMANTIC_HEX, signedTone } from '@/lib/ui/tokens'

interface DeltaProps {
  /**
   * The signed change. `null`/`undefined` renders the empty glyph "—" in
   * neutral — NUNCA un 0% en verde. Si no hay dato, no se inventa tendencia.
   */
  change: number | null | undefined
  /**
   * Below this absolute value the change is "flat" (neutral, glyph "—").
   * Default 0 (cualquier signo cuenta). Reemplaza los `>2/<-2` hardcodeados.
   */
  threshold?: number
  /** Suffix on the number, e.g. "%". Default "%". Pass "" to omit. */
  suffix?: string
  /** Prefix on the number, e.g. "$". Default "". */
  prefix?: string
  /** Show the directional glyph (▲▼/—). Default true. */
  showGlyph?: boolean
  /**
   * How to format the magnitude. Default: 1 decimal with es-AR. Receives the
   * ABSOLUTE value (sign is carried by the glyph + color).
   */
  format?: (abs: number) => ReactNode
  className?: string
}

type SignedTone = 'positive' | 'negative' | 'neutral'
const GLYPH: Record<SignedTone, string> = { positive: '▲', negative: '▼', neutral: '—' }

const defaultFormat = (abs: number): string =>
  abs.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * The atom of "subió/bajó/igual". One language for price variation across the
 * whole product — reemplaza `changeArrow` ASCII y `ChangeIndicator` lucide
 * (~25 archivos). Glyph por signo, color desde el token semántico, `tabular-nums`.
 *
 * Server component (no client state). DESIGN-SYSTEM.md §2.5 / §4.
 *
 *   <Delta change={2.4} />            // ▲ 2,4%  (positive)
 *   <Delta change={-1.1} />           // ▼ 1,1%  (negative)
 *   <Delta change={0} />              // —       (neutral, no "0,0% verde")
 *   <Delta change={null} />           // —       (sin dato)
 *   <Delta change={x} threshold={2} suffix="" prefix="$" />
 */
export default function Delta({
  change,
  threshold = 0,
  suffix = '%',
  prefix = '',
  showGlyph = true,
  format = defaultFormat,
  className = '',
}: DeltaProps) {
  // Sin dato: nunca inventamos una tendencia.
  if (change == null || Number.isNaN(change)) {
    return (
      <span
        className={`font-terminal tabular-nums ${className}`}
        style={{ color: SEMANTIC_HEX.neutral }}
      >
        —
      </span>
    )
  }

  const tone = signedTone(change, threshold)
  const glyph = GLYPH[tone]
  const isFlat = tone === 'neutral'

  return (
    <span
      className={`font-terminal tabular-nums inline-flex items-center gap-1 ${className}`}
      style={{ color: SEMANTIC_HEX[tone] }}
    >
      {showGlyph && <span aria-hidden>{glyph}</span>}
      {!isFlat && (
        <span>
          {prefix}
          {format(Math.abs(change))}
          {suffix}
        </span>
      )}
    </span>
  )
}
