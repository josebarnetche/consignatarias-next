import { SEMANTIC_HEX } from '@/lib/ui/tokens'

/** Ritmo de entrada: barras de los últimos 14 días, para la fila de KPIs. */
export default function Ritmo({ days }: { days: Array<{ key: string; count: number }> }) {
  const total = days.reduce((a, d) => a + d.count, 0)
  const max = Math.max(1, ...days.map((d) => d.count))
  const W = 112
  const H = 28
  const gap = 2
  const bw = (W - gap * (days.length - 1)) / days.length
  return (
    <div>
      <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Ritmo · 14 d</div>
      <div className="flex items-end gap-3">
        <span className="text-2xl font-terminal tabular-nums leading-none" style={{ color: SEMANTIC_HEX.emphasis }}>
          {total}
        </span>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${total} leads en 14 días`}>
          {days.map((d, i) => {
            const h = d.count > 0 ? Math.max(3, (d.count / max) * H) : 2
            return (
              <rect
                key={d.key}
                x={i * (bw + gap)}
                y={H - h}
                width={bw}
                height={h}
                rx={1}
                fill={d.count > 0 ? SEMANTIC_HEX.accent : SEMANTIC_HEX.neutral}
                opacity={d.count > 0 ? 0.85 : 0.3}
              >
                <title>{`${d.key}: ${d.count}`}</title>
              </rect>
            )
          })}
        </svg>
      </div>
      <div className="text-zinc-500 text-xxs mt-1">leads por día</div>
    </div>
  )
}
