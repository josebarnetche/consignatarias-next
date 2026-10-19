import { Search } from 'lucide-react'
import { consultasDeRemate, type BusquedasFicha, type PeriodoBusquedas } from '@/lib/gsc/fichas'

/**
 * "Lo que buscan en Google sobre su firma" — bloque PRO del panel (17-10-2026).
 *
 * Las consultas de Google Search Console que mostraron la ficha
 * /consignatarias/<slug>, a 28 y 90 días, leídas de `gsc_fichas` (las guarda el
 * cron semanal; acá no se llama a Google). Todo número es de GSC tal cual: lo que no
 * hay se dice "sin datos", nunca se rellena. El total de impresiones es el de la
 * página, por eso puede ser mayor que la suma de las consultas: Google no muestra
 * las búsquedas muy poco frecuentes.
 *
 * Sin `'use client'` ni hooks: lo renderiza DashboardClient (cliente) y también se
 * puede usar desde un server component.
 */

const MAX_FILAS = 10

function fmtFecha(iso: string, conAnio: boolean): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(conAnio ? { year: 'numeric' } : {}),
  })
}

const n = (x: number) => x.toLocaleString('es-AR')

function Cifras({ p, rotulo }: { p: PeriodoBusquedas | null; rotulo: string }) {
  return (
    <div className="rounded-terminal border border-terminal-border bg-zinc-900/40 p-3">
      <p className="mb-1 text-xxs font-terminal uppercase tracking-wider text-zinc-500">{rotulo}</p>
      {p ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span>
            <span className="text-2xl font-terminal font-bold tabular-nums text-zinc-100">{n(p.impresiones)}</span>
            <span className="ml-1 text-xs text-zinc-500">{p.impresiones === 1 ? 'vez apareció' : 'veces apareció'}</span>
          </span>
          <span>
            <span className="text-lg font-terminal font-semibold tabular-nums text-zinc-200">{n(p.clics)}</span>
            <span className="ml-1 text-xs text-zinc-500">{p.clics === 1 ? 'clic' : 'clics'}</span>
          </span>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Sin datos para este período.</p>
      )}
    </div>
  )
}

export default function BusquedasGoogle({ d }: { d: BusquedasFicha | null }) {
  const base = d?.d90 ?? d?.d28 ?? null

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Lo que buscan en Google sobre tu firma
        </h3>
      </div>

      {!d || !base ? (
        <p className="text-xs leading-relaxed text-zinc-500">
          Todavía no hay datos de Google para esta ficha. Se actualizan una vez por semana, con lo que
          Google Search Console registra de las búsquedas que la mostraron.
        </p>
      ) : (
        <Contenido d={d} base={base} />
      )}
    </div>
  )
}

function Contenido({ d, base }: { d: BusquedasFicha; base: PeriodoBusquedas }) {
  const remate = consultasDeRemate(base.consultas)
  const filas = base.consultas.slice(0, MAX_FILAS)
  // Impresiones a 28 días de la misma consulta, para ver si viene subiendo.
  const corto = new Map((d.d28?.consultas ?? []).map((c) => [c.query, c.impresiones]))
  const mostrarCorto = !!d.d28 && base !== d.d28

  return (
    <>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        Cuántas veces su ficha apareció en Google y cuántas personas entraron desde ahí.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Cifras p={d.d28} rotulo="Últimos 28 días" />
        <Cifras p={d.d90} rotulo="Últimos 90 días" />
      </div>

      {remate.length > 0 && (
        <div className="mt-3 rounded-terminal border border-accent/25 bg-accent/5 p-3">
          <p className="text-xs leading-relaxed text-zinc-300">
            <span className="font-semibold text-zinc-100">La gente busca tu remate en vivo:</span>{' '}
            {remate.slice(0, 3).map((c, i) => (
              <span key={c.query}>
                {i > 0 && ', '}«{c.query}» <span className="tabular-nums text-zinc-500">({n(c.impresiones)})</span>
              </span>
            ))}
            .
          </p>
        </div>
      )}

      {filas.length > 0 ? (
        <div className="mt-4 border-t border-terminal-border pt-3">
          <p className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Qué escribieron · últimos {base.dias} días
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-xxs font-terminal uppercase tracking-wider text-zinc-600">
                <th className="pb-1 font-normal">Búsqueda</th>
                {mostrarCorto && <th className="pb-1 text-right font-normal">28 días</th>}
                <th className="pb-1 text-right font-normal">{base.dias} días</th>
                <th className="pb-1 text-right font-normal">Clics</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.query} className="border-t border-terminal-border/60">
                  <td className="py-1.5 pr-2 text-zinc-300">{c.query}</td>
                  {mostrarCorto && (
                    <td className="py-1.5 text-right font-terminal tabular-nums text-zinc-500">
                      {corto.has(c.query) ? n(corto.get(c.query) ?? 0) : '—'}
                    </td>
                  )}
                  <td className="py-1.5 text-right font-terminal tabular-nums text-zinc-200">{n(c.impresiones)}</td>
                  <td className="py-1.5 text-right font-terminal tabular-nums text-zinc-400">{n(c.clics)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] leading-snug text-zinc-600">
            Las columnas de días son impresiones: las veces que su ficha apareció en esa búsqueda. Google no
            informa las búsquedas muy poco frecuentes, por eso la tabla suma menos que el total.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Google todavía no informa búsquedas puntuales para esta ficha.</p>
      )}

      <p className="mt-3 text-[10px] font-terminal text-zinc-600">
        Google Search Console · {fmtFecha(base.desde, false)}–{fmtFecha(base.hasta, true)}
      </p>
    </>
  )
}
