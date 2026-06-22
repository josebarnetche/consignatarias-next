import type { ReactNode } from 'react'
import { SEMANTIC_HEX, type SemanticTone } from '@/lib/ui/tokens'

// Re-exported for back-compat: existing call sites import `SemanticTone`
// from '@/components/pro'. The canonical definition lives in '@/lib/ui/tokens'.
export type { SemanticTone }

interface HeroNumberProps {
  /** Small uppercase label above the number, e.g. "Por cabeza (ARS)". */
  label: string
  /** The big number, pre-formatted (e.g. "$1.234.567" or "USD 4.236"). */
  value: ReactNode
  /** Optional sub-line under the number, e.g. "$2.870/kg × 430 kg". */
  sub?: ReactNode
  /** Semantic color of the number. Default `emphasis` (zinc-100, número-hero fuerte). */
  tone?: SemanticTone
  /** Tailwind size class for the number. Default text-2xl. */
  size?: string
  /** Center-align the block (e.g. for single-stat hero panels). */
  center?: boolean
}

/**
 * Unifies the recurring "big number-hero + label + sub-line" block used across
 * PRO surfaces (valor por cabeza, INMAG hoy, net-back, etc).
 *
 * Server component (no client state). Always receives a PRE-FORMATTED value —
 * it never computes or invents numbers; formatting/data live at the call site.
 *
 *   <HeroNumber label="Por cabeza (ARS)" value={`$${fmt(v)}`} sub="$2.870/kg × 430 kg" />
 *   <HeroNumber label="INMAG hoy" value="USD 2,84/kg" tone="accent" />
 */
export default function HeroNumber({
  label,
  value,
  sub,
  tone = 'emphasis',
  size = 'text-2xl',
  center = false,
}: HeroNumberProps) {
  return (
    <div className={center ? 'text-center' : undefined}>
      <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`${size} font-terminal tabular-nums leading-none`}
        style={{ color: SEMANTIC_HEX[tone] }}
      >
        {value}
      </div>
      {sub != null && <div className="text-zinc-500 text-xxs mt-1">{sub}</div>}
    </div>
  )
}
