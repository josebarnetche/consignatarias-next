import Link from 'next/link'
import { getBandasPublicas, getSlugsConBanda, vrCobertura, VR_VENTANA_DIAS, VR_METODOLOGIA } from '@/lib/vr'

/**
 * La banda de precio observada por categoría — el dato que hoy no publica nadie
 * más en el mercado argentino.
 *
 * Va PÚBLICA y sin login a propósito (doctrina CLAUDE.md: el número del día y los
 * precios observados quedan abiertos porque son la cita GEO). Lo que se cobra es la
 * serie histórica de dispersión y el uso institucional, no el número de hoy.
 *
 * Server component: las bandas salen de un JSON commiteado, así que esto es SSG y
 * no agrega una sola query al render.
 */
export default function VrBandas() {
  const bandas = getBandasPublicas()
  const cob = vrCobertura()
  const slugs = getSlugsConBanda()
  if (bandas.length === 0) return null

  return (
    <section className="px-4 pt-6 pb-2 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-zinc-200 text-lg font-medium">A cuánto se vendió realmente</h2>
        <Link href="/metodologia/vr" className="text-xs text-sky-400 hover:underline">
          Metodología {VR_METODOLOGIA} →
        </Link>
      </div>
      <p className="text-zinc-400 text-sm mb-4 max-w-3xl">
        El precio de referencia es un punto; el mercado es un rango. Esta es la{' '}
        <strong className="text-zinc-200">banda de precio observada</strong> en las operaciones de
        lote del Mercado Agroganadero de los últimos {VR_VENTANA_DIAS} días, con la cantidad de
        operaciones que la sostiene.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left py-2 font-normal">Categoría</th>
              <th className="text-right py-2 font-normal">Mínimo (P10)</th>
              <th className="text-right py-2 font-normal">Mediana</th>
              <th className="text-right py-2 font-normal">Máximo (P90)</th>
              <th className="text-right py-2 font-normal">Amplitud</th>
              <th className="text-right py-2 font-normal hidden sm:table-cell">Lotes</th>
              <th className="text-right py-2 font-normal hidden sm:table-cell">Cabezas</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {bandas.map((b) => (
              <tr key={b.codigo} className="border-b border-zinc-900">
                <td className="py-2 text-zinc-200">
                  {slugs.includes(b.codigo.toLowerCase()) ? (
                    <Link href={`/vr/${b.codigo.toLowerCase()}`} className="hover:text-sky-400">
                      {b.categoria}
                    </Link>
                  ) : (
                    b.categoria
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">${b.p10.toLocaleString('es-AR')}</td>
                <td className="py-2 text-right tabular-nums text-zinc-100 font-medium">
                  ${b.mediana.toLocaleString('es-AR')}
                </td>
                <td className="py-2 text-right tabular-nums">${b.p90.toLocaleString('es-AR')}</td>
                <td className="py-2 text-right tabular-nums text-amber-400">{b.amplitud_pct}%</td>
                <td className="py-2 text-right tabular-nums text-zinc-500 hidden sm:table-cell">
                  {b.lotes.toLocaleString('es-AR')}
                </td>
                <td className="py-2 text-right tabular-nums text-zinc-500 hidden sm:table-cell">
                  {b.cabezas.toLocaleString('es-AR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-zinc-500 text-xs mt-2">
        ARS por kilo vivo. Ventana del {cob.desde} al {cob.hasta}, sobre{' '}
        {cob.lotes.toLocaleString('es-AR')} lotes y {cob.cabezas.toLocaleString('es-AR')} cabezas.
        Es una referencia de mercado observada, no una tasación: el precio final lo define el remate.
      </p>
    </section>
  )
}
