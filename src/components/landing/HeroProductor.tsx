import Link from 'next/link'

function fmt(n: number, d = 0) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

/**
 * Hero de la portada para el productor (v1.255.2). El que llega por WhatsApp desde
 * el celular viene a saber cuánto vale su hacienda: arriba va el precio del último
 * cierre, con su fecha, y la herramienta de valuación a un toque (`#valuar`, en la
 * misma página). Solo texto y números: es el LCP y no carga imagen ni JS.
 * El pitch PRO para consignatarias quedó abajo (HeroPro).
 */
export default function HeroProductor({
  inmag,
  inmagAnterior,
  cambioPct,
  fechaCierre,
  lotes,
  ventanaDias,
}: {
  inmag: number
  inmagAnterior: number | null
  cambioPct: number | null
  /** El cierre, ya escrito para leer ("jueves 30 de octubre"). */
  fechaCierre: string
  lotes: number
  ventanaDias: number
}) {
  const tono = cambioPct == null ? 'text-zinc-400' : cambioPct >= 0 ? 'text-positive' : 'text-negative'
  return (
    <section className="border-b border-terminal-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-8 sm:pt-14 sm:pb-12">
        <p className="text-xxs font-medium text-accent">Para el productor, gratis</p>
        <h1 className="mt-3 max-w-3xl text-[1.9rem] leading-[1.1] sm:text-5xl font-semibold tracking-tight text-ink text-balance">
          Cuánto vale tu hacienda hoy, medido en lo que se vendió.
        </h1>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-end">
          <Link
            href="/mercado/inmag"
            className="block rounded-lg border border-terminal-border bg-terminal-panel claro:shadow-panel p-4 hover:border-accent/50 transition-colors"
          >
            <p className="text-xxs text-zinc-500">Índice Novillo (INMAG) · cierre del {fechaCierre}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-terminal text-4xl font-semibold tabular-nums text-ink">${fmt(inmag)}</span>
              <span className="text-sm text-zinc-400">/kg vivo</span>
              {cambioPct != null && (
                <span className={`font-terminal text-sm tabular-nums ${tono}`}>
                  {cambioPct >= 0 ? '▲' : '▼'} {fmt(Math.abs(cambioPct), 1)} %
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {inmagAnterior != null ? `Contra $${fmt(inmagAnterior)} de la rueda anterior. ` : ''}
              Mercado Agroganadero de Cañuelas.
            </p>
          </Link>

          <div>
            <a
              href="#valuar"
              className="flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-4 text-base font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors"
            >
              ¿Cuánto vale mi hacienda?
              <span aria-hidden="true">→</span>
            </a>
            <p className="mt-2 text-xs text-zinc-500">
              Categoría, cabezas y peso: el rango de lo que se pagó en {fmt(lotes)} lotes de los últimos {ventanaDias} días.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
