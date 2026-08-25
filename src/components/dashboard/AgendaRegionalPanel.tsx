import type { AgendaRegional } from '@/lib/reports/agenda-regional'

/**
 * "Tu agenda en la zona" — el bloque para las casas que no rematan en Cañuelas.
 *
 * Son 109 de las 130: para ellas no hay dato transaccional, y hasta acá el panel no
 * tenía nada que ofrecerles. Lo que sí tenemos y ellas no es el calendario completo
 * de su provincia — una casa conoce sus fechas, no las de las otras veinticuatro.
 *
 * Y la fecha es una decisión cara: si el remate cae el mismo día que el de otra casa
 * fuerte de la zona, se parte la clientela.
 */

function fecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export default function AgendaRegionalPanel({ a }: { a: AgendaRegional }) {
  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-terminal uppercase tracking-widest text-zinc-300">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-100" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/calendario.png" alt="" className="h-4 w-4" />
          </span>
          Tu agenda en {a.provincia}
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">próximos {a.dias} días</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-300">
          {a.misRemates} {a.misRemates === 1 ? 'remate tuyo' : 'remates tuyos'}
        </span>
        <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-300">
          {a.rematesProvincia} en la provincia
        </span>
        {a.cabezasProvincia > 0 && a.misCabezas > 0 && (
          <span className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-300">
            {a.cuotaOferta}% de las cabezas anunciadas
          </span>
        )}
      </div>

      {/* 1 · CHOQUES DE FECHA — lo accionable. */}
      {a.diasCompartidos.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xxs font-terminal uppercase tracking-widest text-amber-400">
            Compartís fecha con otras casas
          </h4>
          <ul className="space-y-2">
            {a.diasCompartidos.slice(0, 4).map((d) => (
              <li key={d.fecha} className="rounded-terminal border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
                <p className="text-sm text-zinc-100">
                  {fecha(d.fecha)}
                  {d.miRemate.localidad && (
                    <span className="text-zinc-400"> · tu remate en {d.miRemate.localidad}</span>
                  )}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {d.otros.slice(0, 4).map((o, i) => (
                    <li key={`${o.firma}-${i}`} className="text-[11px] leading-snug text-zinc-400">
                      También remata <span className="text-zinc-300">{o.firma}</span>
                      {o.localidad && ` en ${o.localidad}`}
                      {o.cabezas ? ` · ~${o.cabezas.toLocaleString('es-AR')} cab` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2 · DÓNDE HAY LUGAR. */}
      {a.ventanasLibres.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xxs font-terminal uppercase tracking-widest text-positive">
            Días sin remates en la zona
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {a.ventanasLibres.map((v) => (
              <span
                key={v.fecha}
                className="rounded border border-positive/25 bg-positive/5 px-2 py-1 text-xxs font-terminal text-zinc-300"
              >
                {fecha(v.fecha)}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Ninguna casa de la provincia tiene remate anunciado esos días.
          </p>
        </div>
      )}

      {/* 3 · QUIÉN MÁS OPERA. */}
      {a.competidores.length > 0 && (
        <div className="mt-4 border-t border-terminal-border pt-3">
          <h4 className="mb-2 text-xxs font-terminal uppercase tracking-widest text-zinc-400">
            Quién más remata en la zona
          </h4>
          <ol className="space-y-1">
            {a.competidores.slice(0, 6).map((c, i) => (
              <li
                key={c.slug}
                className={`flex items-baseline justify-between gap-3 rounded px-1.5 py-1 text-xs ${
                  c.esMia ? 'bg-accent/10 text-zinc-100' : 'text-zinc-500'
                }`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-terminal tabular-nums text-zinc-600">{i + 1}.</span> {c.nombre}
                </span>
                <span className="shrink-0 font-terminal tabular-nums">
                  {c.remates} {c.remates === 1 ? 'remate' : 'remates'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {a.categoriasSinCubrir.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          En tu zona se rematan categorías que vos no estás anunciando:{' '}
          <span className="text-zinc-300">{a.categoriasSinCubrir.join(', ')}</span>.
        </p>
      )}

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Sale del calendario público de remates, no de operaciones cerradas: fuera del Mercado
        Agroganadero no se publica quién vendió a qué precio. Las cabezas son las que cada
        casa anuncia y menos de un tercio las declara, así que el orden es por cantidad de
        remates. Una casa que aparece con dos nombres distintos en el calendario puede
        contarse dos veces.
      </p>
    </div>
  )
}
