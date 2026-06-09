import type { SemanticTone } from './HeroNumber'

const TONE_COLOR: Record<SemanticTone, string> = {
  neutral: '#a1a1aa', // zinc-400
  positive: '#34d399',
  warning: '#fbbf24',
  negative: '#f87171',
  accent: '#38bdf8',
}

interface StatPillProps {
  /** Label to the left of the bar, e.g. "Percentil últimos 30 días". */
  label: string
  /**
   * Bar fill, 0–100. This is a REAL measured value (e.g. a percentile from
   * mag_inmag_history). Never pass a made-up number to a non-skeleton pill.
   */
  value: number
  /**
   * How to color the bar:
   *  - 'percentile' (default): green ≥70, amber ≥40, else red — for "how good
   *    is this price vs history" semantics.
   *  - a fixed SemanticTone to force a color.
   */
  tone?: SemanticTone | 'percentile'
  /** Suffix on the right-hand number. Default "%". */
  suffix?: string
}

function resolveColor(value: number, tone: SemanticTone | 'percentile'): string {
  if (tone === 'percentile') {
    return value >= 70 ? '#34d399' : value >= 40 ? '#fbbf24' : '#f87171'
  }
  return TONE_COLOR[tone]
}

/**
 * Unifies the "label + horizontal bar + value%" row with semantic color,
 * extracted from the PercentileBar pattern. Bar is clamped to 0–100.
 *
 *   <StatPill label="Percentil últimos 30 días" value={72} />            // percentile coloring
 *   <StatPill label="Uso de cuota" value={84} tone="warning" />
 */
export default function StatPill({ label, value, tone = 'percentile', suffix = '%' }: StatPillProps) {
  const pct = Math.max(0, Math.min(100, value))
  const color = resolveColor(value, tone)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-data text-zinc-400">{label}</span>
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <div className="flex-1 h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-zinc-200 font-terminal tabular-nums text-data w-12 text-right">
          {value}
          {suffix}
        </span>
      </div>
    </div>
  )
}
