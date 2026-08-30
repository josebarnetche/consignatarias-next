import Link from 'next/link'
import type { Territorio } from '@/lib/reports/territorio'

/**
 * El mapa del territorio de una firma.
 *
 * Server component: recibe el `Territorio` ya calculado. Muestra primero dónde NO está
 * —que es lo que su propio sistema no puede decirle— y después dónde está flojo, que es
 * la oportunidad más barata: ya conoce la zona.
 */
export function TerritorioPanel({ t, titular }: { t: Territorio; titular: string }) {
  const fmt = (n: number) => n.toLocaleString('es-AR')

  // Partidos donde ya opera pero tiene menos del 15 % de los que van al MAG. Se pide un
  // piso de 20 productores: con menos, un 10 % de cuota puede ser un solo cliente y la
  // "oportunidad" es ruido.
  const flojos = t.presencia
    .filter((p) => p.totales >= 20 && p.cuota < 0.15)
    .sort((a, b) => a.cuota - b.cuota)
    .slice(0, 5)

  if (!t.presencia.length && !t.oportunidades.length) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Territorio</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Todavía no registramos operaciones tuyas en el Mercado de Cañuelas en los últimos
          {' '}
          {Math.round(
            (new Date(t.hasta).getTime() - new Date(t.desde).getTime()) / 86_400_000,
          )}{' '}
          días. Este mapa se arma con ese dato, así que aparece en cuanto haya movimiento.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Territorio</h2>
        <p className="text-xs text-slate-500">
          Buenos Aires · {t.desde} a {t.hasta}
        </p>
      </div>

      <p className="mt-3 border-l-2 border-sky-800 pl-3 text-base leading-relaxed text-slate-200">
        {titular}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { n: fmt(t.totalRemitentesPropios), l: 'remitentes tuyos' },
          { n: `${t.presencia.length}`, l: `partidos donde operás, de ${t.totalPartidosConActividad}` },
          { n: `${t.oportunidades.length}`, l: 'partidos sin un solo remitente tuyo' },
        ].map((s) => (
          <div key={s.l} className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3">
            <p className="text-xl font-semibold text-slate-100">{s.n}</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      {t.oportunidades.length > 0 && (
        <div className="mt-7">
          <h3 className="text-sm font-semibold text-slate-300">Dónde no tenés a nadie</h3>
          <p className="mt-1 text-xs text-slate-500">
            Productores que ya mandan hacienda a Cañuelas desde ese partido, y ninguno es tuyo.
          </p>
          <div className="mt-3 overflow-x-auto rounded border border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-900/60 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Partido</th>
                  <th className="px-3 py-2 font-medium">Van al MAG</th>
                  <th className="px-3 py-2 font-medium">Casas</th>
                  <th className="px-3 py-2 font-medium">Rodeo</th>
                  <th className="px-3 py-2 text-right font-medium">Establec.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {t.oportunidades.slice(0, 10).map((o) => (
                  <tr key={o.partido} className="hover:bg-slate-900/40">
                    <td className="px-3 py-2">
                      <Link
                        href={`/productividad/${o.slugProvincia}/${o.slugDepartamento}`}
                        className="text-slate-200 hover:text-sky-400"
                      >
                        {o.partido}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-medium text-sky-300">{o.totales}</td>
                    <td className="px-3 py-2 text-slate-500">{o.casas}</td>
                    <td className="px-3 py-2 text-slate-400">{o.stock ? fmt(o.stock) : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {o.establecimientos ? fmt(o.establecimientos) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {flojos.length > 0 && (
        <div className="mt-7">
          <h3 className="text-sm font-semibold text-slate-300">Donde ya estás, pero flojo</h3>
          <p className="mt-1 text-xs text-slate-500">
            La zona ya la conocés: son los partidos donde tenés menos del 15 % de los que
            operan en Cañuelas.
          </p>
          <ul className="mt-3 divide-y divide-slate-800 overflow-hidden rounded border border-slate-800">
            {flojos.map((p) => (
              <li key={p.partido} className="flex items-center justify-between px-4 py-2.5">
                <Link
                  href={`/productividad/${p.slugProvincia}/${p.slugDepartamento}`}
                  className="text-sm text-slate-200 hover:text-sky-400"
                >
                  {p.partido}
                </Link>
                <span className="text-sm text-slate-400">
                  <strong className="text-amber-400">{p.propios}</strong> de {p.totales}
                  <span className="ml-2 text-xs text-slate-600">
                    {(p.cuota * 100).toLocaleString('es-AR', { maximumFractionDigits: 0 })} %
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Se cuentan <strong className="text-slate-400">remitentes distintos</strong>, no
        lotes: un productor que mandó cinco camiones cuenta una vez. El rodeo y los
        establecimientos salen del padrón oficial de MAGyP. Sólo Buenos Aires — en el resto
        del país el origen de los lotes no se resuelve a partido con la misma precisión.
      </p>
    </section>
  )
}
