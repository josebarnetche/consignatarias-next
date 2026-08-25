import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Benchmark } from '@/lib/reports/benchmark'

/**
 * "Cómo vendiste contra el mercado" — el bloque que su CRM no puede tener.
 *
 * Su sistema tiene sus liquidaciones. Lo que no tiene, y no puede conseguir, es el
 * precio al que vendieron las otras 21 casas la misma categoría el mismo día. Eso
 * sale de los 14.000 lotes de Cañuelas que ya scrapeamos.
 *
 * Es también el argumento que la firma usa hacia afuera: *"en vaquillona vendemos
 * 8,8% arriba del promedio del mercado"* es exactamente lo que le dice a un productor
 * para ganarle una consignación. Se lo damos calculado.
 *
 * El color se gana: una diferencia que no supera la dispersión de los propios lotes
 * va gris y dice que entra en lo normal. Si el número no resiste que lo crucen contra
 * sus liquidaciones, no sirve.
 */

const ars = (n: number) => '$' + n.toLocaleString('es-AR')

function Fila({ f }: { f: Benchmark['filas'][number] }) {
  const Icono = !f.significativa ? Minus : f.diffPct > 0 ? TrendingUp : TrendingDown
  const color = !f.significativa
    ? 'text-zinc-500'
    : f.diffPct > 0
      ? 'text-positive'
      : 'text-negative'

  return (
    <tr className="border-t border-terminal-border">
      <td className="py-2 pr-3 text-xxs font-terminal text-zinc-200">{f.categoria}</td>
      <td className="py-2 pr-3 text-right font-terminal tabular-nums text-sm text-zinc-100">{ars(f.miPrecio)}</td>
      <td className="py-2 pr-3 text-right font-terminal tabular-nums text-xs text-zinc-500">{ars(f.precioMercado)}</td>
      <td className={`py-2 pr-3 text-right font-terminal tabular-nums text-sm ${color}`}>
        <span className="inline-flex items-center gap-1">
          <Icono className="h-3 w-3" />
          {f.diffPct > 0 ? '+' : ''}{f.diffPct}%
        </span>
      </td>
      <td className="py-2 text-right text-[10px] font-terminal text-zinc-600">{f.lotes}</td>
    </tr>
  )
}

export default function BenchmarkMercado({ b }: { b: Benchmark }) {
  const titular = b.fuertes[0] ?? b.debiles[0] ?? null

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Cómo vendiste contra el mercado
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">
          Cañuelas · últimos {b.dias} días
        </span>
      </div>

      {titular && (
        <p className="mb-3 text-sm leading-snug text-zinc-200">{titular.leyenda}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="text-[10px] font-terminal uppercase tracking-widest text-zinc-600">
              <th className="pb-1 text-left font-normal">Categoría</th>
              <th className="pb-1 pr-3 text-right font-normal">Tu $/kg</th>
              <th className="pb-1 pr-3 text-right font-normal">Mercado</th>
              <th className="pb-1 pr-3 text-right font-normal">Dif.</th>
              <th className="pb-1 text-right font-normal">Lotes</th>
            </tr>
          </thead>
          <tbody>
            {b.filas.map((f) => <Fila key={f.categoria} f={f} />)}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-terminal-border pt-3">
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
          {b.totalLotes.toLocaleString('es-AR')} lotes
        </span>
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
          {b.totalCabezas.toLocaleString('es-AR')} cabezas
        </span>
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
          {b.clientes} remitentes distintos
        </span>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Comparación por categoría contra el promedio de todas las casas del Mercado
        Agroganadero, sobre operaciones publicadas. Una diferencia se marca en verde o
        rojo sólo cuando supera la dispersión normal entre lotes. Nunca se comparan
        promedios generales: una casa que vende más terneros tiene un $/kg más alto sin
        vender mejor.
      </p>
    </div>
  )
}
