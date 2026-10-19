import Link from 'next/link'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'

function fmt(n: number) {
  return n.toLocaleString('es-AR')
}

/**
 * El alcance que se le ofrece a una firma PRO, medido: impresiones de Google por mes
 * (Search Console). Las barras crecen una vez al entrar (ScrollReveal + .barra-alcance).
 * Los meses parciales (el primero y el corriente) van rayados y rotulados.
 */
export default function AlcanceGoogle({ aiRefsMes }: { aiRefsMes: number }) {
  const max = Math.max(...ALCANCE_GOOGLE.porMes.map((m) => m.impresiones))
  return (
    <section id="alcance" className="max-w-7xl mx-auto px-6 pt-24 pb-8">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xxs font-medium text-accent">El alcance que se suma a tu firma</p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-ink tabular-nums">
            {fmt(ALCANCE_GOOGLE.impresiones)}
          </h2>
          <p className="mt-2 text-lg text-zinc-400">
            veces apareció consignatarias.com.ar en una búsqueda de Google, del 6 de marzo al 14 de octubre de 2026.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 max-w-md">
            <div>
              <dt className="text-xxs text-zinc-500">Clics desde Google</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{fmt(ALCANCE_GOOGLE.clics)}</dd>
            </div>
            <div>
              <dt className="text-xxs text-zinc-500">Visitas en los últimos 30 días</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{fmt(ALCANCE_GOOGLE.visitasMes)}</dd>
            </div>
            {aiRefsMes > 0 && (
              <div className="col-span-2">
                <dt className="text-xxs text-zinc-500">Visitas que llegaron desde una IA, último mes</dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{fmt(aiRefsMes)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-6 text-xxs text-zinc-500">
            Fuente: Google Search Console y Google Analytics de consignatarias.com.ar.{' '}
            <Link href="/calidad" className="underline underline-offset-2 hover:text-accent">
              Cómo medimos
            </Link>
          </p>
        </div>

        <figure className="frame rounded-xl border border-terminal-border bg-terminal-panel p-6 pt-8">
          <span className="frame-nombre" aria-hidden="true"># Impresiones por mes</span>
          <div className="flex h-60 items-end gap-2 sm:gap-3" role="img" aria-label="Impresiones de Google por mes, de marzo a octubre de 2026, en crecimiento">
            {ALCANCE_GOOGLE.porMes.map((m) => {
              const parcial = 'parcial' in m && m.parcial
              return (
                <div key={m.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[0.625rem] tabular-nums text-zinc-500">
                    {m.impresiones >= 1000 ? `${Math.round(m.impresiones / 1000)}k` : m.impresiones}
                  </span>
                  <div
                    className={`barra-alcance w-full rounded-t-md ${parcial ? 'bg-accent/35' : 'bg-accent'}`}
                    style={{
                      height: `${Math.max(3, (m.impresiones / max) * 100)}%`,
                      backgroundImage: parcial
                        ? 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(var(--t-panel) / 0.5) 5px 7px)'
                        : undefined,
                    }}
                  />
                  <span className="text-xxs text-zinc-500">{m.mes}</span>
                </div>
              )
            })}
          </div>
          <figcaption className="mt-4 text-xxs text-zinc-500">Marzo y octubre, parciales (rayados).</figcaption>
          <span className="frame-sel" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </figure>
      </div>
    </section>
  )
}
