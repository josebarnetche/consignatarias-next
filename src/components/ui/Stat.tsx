import type { ReactNode } from 'react'
import { SEMANTIC_HEX, type SemanticTone } from '@/lib/ui/tokens'
import Delta from './Delta'

interface StatProps {
  /** Small uppercase label above the value, e.g. "INMAG hoy". */
  label: string
  /**
   * The value, PRE-FORMATTED (e.g. "$1.234" or "USD 2,84/kg"). `null`/`undefined`
   * renders "—" en neutral — el componente nunca inventa un número.
   */
  value: ReactNode
  /** Optional signed change rendered as a <Delta> next to the value. */
  delta?: number | null
  /** Threshold passed to the embedded <Delta>. */
  deltaThreshold?: number
  /** Optional sub-line under the value, e.g. "$2.870/kg × 430 kg". */
  sub?: ReactNode
  /** Semantic color of the value. Default `emphasis` (número fuerte). */
  tone?: SemanticTone
  /** Tailwind size class for the value. Default `text-2xl`. */
  size?: string
  /** Center-align the block. */
  center?: boolean
  className?: string
}

/**
 * Number-hero block: label + value (+ optional <Delta>) + sub-line. Thin typed
 * wrapper that fija el ritmo (label xxs uppercase, `tabular-nums`, tono desde
 * el token canónico) y embebe el <Delta> con el mismo idioma de "subió/bajó".
 *
 * Server component. Always receives a PRE-FORMATTED value. DESIGN-SYSTEM.md §2.5.
 *
 *   <Stat label="INMAG hoy" value="USD 2,84/kg" delta={1.4} />
 *   <Stat label="Por cabeza" value={`$${fmt(v)}`} sub="$2.870/kg × 430 kg" />
 */
export default function Stat({
  label,
  value,
  delta,
  deltaThreshold = 0,
  sub,
  tone = 'emphasis',
  size = 'text-2xl',
  center = false,
  className = '',
}: StatProps) {
  const empty = value == null
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`.trim()}>
      <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`flex items-baseline gap-2 ${center ? 'justify-center' : ''}`.trim()}>
        <span
          className={`${size} font-terminal tabular-nums leading-none`}
          style={{ color: empty ? SEMANTIC_HEX.neutral : SEMANTIC_HEX[tone] }}
        >
          {empty ? '—' : value}
        </span>
        {delta !== undefined && !empty && (
          <Delta change={delta} threshold={deltaThreshold} className="text-data" />
        )}
      </div>
      {sub != null && <div className="text-zinc-500 text-xxs mt-1">{sub}</div>}
    </div>
  )
}
