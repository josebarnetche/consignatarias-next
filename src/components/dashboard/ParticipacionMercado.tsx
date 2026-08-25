import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Participacion } from '@/lib/reports/participacion'

/**
 * "Tu lugar en el Mercado" — cuánto mueve la casa y contra quién.
 *
 * Responde lo que su propio sistema no puede: si un mes flojo fue de ella o de todos.
 * Un mes con menos cabezas donde el Mercado cayó más es, en realidad, un mes bueno —
 * y sólo se ve con el denominador.
 *
 * El ranking va con nombre y apellido porque es dato público del Mercado, y porque
 * ubicarse sin ver contra quién no sirve de nada.
 */

const num = (n: number) => n.toLocaleString('es-AR')

export default function ParticipacionMercado({ p }: { p: Participacion }) {
  const Icono = !p.significativo ? Minus : p.deltaPuntos > 0 ? TrendingUp : TrendingDown
  const color = !p.significativo
    ? 'text-zinc-500'
    : p.deltaPuntos > 0
      ? 'text-positive'
      : 'text-negative'

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Tu lugar en el Mercado
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">Cañuelas · últimos 30 días</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-3xl font-terminal tabular-nums font-bold text-zinc-100">
          {p.cuota}%
        </span>
        <span className={`inline-flex items-center gap-1 font-terminal text-sm ${color}`}>
          <Icono className="h-3.5 w-3.5" />
          {p.deltaPuntos > 0 ? '+' : ''}{p.deltaPuntos} pts
        </span>
        <span className="text-xs font-terminal text-amber-300">
          {p.puesto}º de {p.totalCasas} casas
        </span>
      </div>

      <p className="mt-2 text-xs leading-snug text-zinc-400">{p.leyenda}</p>

      <p className="mt-1 text-xxs font-terminal text-zinc-600">
        {num(p.cabezas)} de {num(p.cabezasMercado)} cabezas operadas en el Mercado.
      </p>

      <ol className="mt-3 space-y-1 border-t border-terminal-border pt-3">
        {p.ranking.map((r, i) => (
          <li
            key={r.nombre}
            className={`flex items-baseline justify-between gap-3 rounded px-1.5 py-1 text-xs ${
              r.esMia ? 'bg-accent/10 text-zinc-100' : 'text-zinc-500'
            }`}
          >
            <span className="min-w-0 truncate">
              <span className="font-terminal tabular-nums text-zinc-600">{i + 1}.</span>{' '}
              {r.nombre}
            </span>
            <span className="shrink-0 font-terminal tabular-nums">{r.cuota}%</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Sobre cabezas operadas en el Mercado Agroganadero. La variación se marca con color
        sólo cuando supera el ruido normal —calculado sobre la cantidad de lotes, que es
        la unidad que el productor decide: un camión entero va a una sola casa—.
      </p>
    </div>
  )
}
