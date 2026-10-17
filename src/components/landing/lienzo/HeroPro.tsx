import Link from 'next/link'
import { Frame, CursorMp } from './Frame'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'

function fmt(n: number) {
  return n.toLocaleString('es-AR')
}

/**
 * Hero de la landing (v1.226.0): PRO Consignataria como producto principal.
 * A la izquierda la promesa y el alcance real (Search Console); a la derecha el
 * lienzo — cómo se ve una firma PRO en los tres lugares donde el mercado busca:
 * Google, el directorio y la respuesta de una IA. "Tu consignataria" es un
 * marcador: la pieza ilustra el producto, no afirma nada de una firma real.
 */
export default function HeroPro({
  rematesProximos,
  consignatarias,
  citadaReal,
}: {
  rematesProximos: number
  consignatarias: number
  citadaReal?: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-terminal-border">
      <div className="lienzo-puntos absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24 grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        {/* ── Promesa ── */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.07] px-3 py-1 text-xxs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            PRO Consignataria
          </div>

          <h1 className="mt-6 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.1rem] font-semibold tracking-tight text-ink text-balance">
            Tu consignataria, donde el mercado ganadero <span className="text-accent">busca.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            consignatarias.com.ar apareció{' '}
            <strong className="font-semibold text-ink tabular-nums">{fmt(ALCANCE_GOOGLE.impresiones)} veces</strong> en
            Google desde marzo. Con PRO, tu firma y tus remates salen primero: en el sitio, en el mail del productor y
            en la respuesta de las IAs.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/overview"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors"
            >
              Acceder al Terminal
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#pro"
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3.5 text-sm font-medium text-zinc-200 hover:border-accent hover:text-accent transition-colors"
            >
              Ver los beneficios
            </a>
          </div>
          <p className="mt-3 text-xs text-zinc-500">PRO: ARS 45.000/mes · sin permanencia · se cancela cuando quieras</p>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-terminal-border pt-6">
            <div>
              <dt className="text-xxs text-zinc-500">Impresiones en Google</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">+1 millón</dd>
            </div>
            <div>
              <dt className="text-xxs text-zinc-500">Remates próximos</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{fmt(rematesProximos)}</dd>
            </div>
            <div>
              <dt className="text-xxs text-zinc-500">Firmas en el directorio</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{fmt(consignatarias)}</dd>
            </div>
          </dl>

          <Link href="#valuar" className="mt-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-accent transition-colors">
            ¿Sos productor? Valuá tu rodeo gratis <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* ── Lienzo ── */}
        <div className="relative lg:h-[680px] lg:[container-type:size]" aria-label="Así se ve una consignataria PRO">
          <CursorMp nombre="Productor · Corrientes" tono="accent" dur={15} ruta={[['6cqw', '34cqh'], ['62cqw', '20cqh'], ['84cqw', '58cqh'], ['30cqw', '70cqh']]} />
          <CursorMp nombre="ChatGPT" tono="positive" dur={17} delay={-6} ruta={[['88cqw', '36cqh'], ['48cqw', '88cqh'], ['14cqw', '40cqh'], ['70cqw', '8cqh']]} />

          <div className="flex flex-col gap-10 pt-6 lg:block lg:pt-0">
            {/* Google */}
            <Frame nombre="Búsqueda en Google" className="p-5 lg:absolute lg:left-0 lg:top-6 lg:w-[72%] shadow-xl shadow-zinc-950/5">
              <div className="flex items-center gap-2 rounded-full border border-terminal-border px-3 py-1.5 text-xs text-zinc-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                remate invernada corrientes
              </div>
              <div className="mt-4">
                <div className="text-xxs text-zinc-500">consignatarias.com.ar › consignatarias › tu-consignataria</div>
                <div className="mt-0.5 text-[1.05rem] font-medium text-accent">Tu Consignataria — remates, calendario y contacto</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Próximos remates de invernada y cría, catálogo con video y contacto directo. Firma verificada.
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent/[0.08] px-2.5 py-1 text-xxs font-medium text-accent tabular-nums">
                {fmt(ALCANCE_GOOGLE.impresiones)} impresiones · mar–oct 2026
              </div>
            </Frame>

            {/* Directorio */}
            <Frame nombre="Directorio · PRO primero" className="p-4 lg:absolute lg:right-0 lg:top-[300px] lg:w-[56%] shadow-xl shadow-zinc-950/5">
              <ul className="space-y-2">
                <li className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/[0.06] px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-xxs font-bold text-white oscuro:text-zinc-950">TC</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">Tu Consignataria</span>
                    <span className="block text-xxs text-zinc-500">Verificada · remate esta semana</span>
                  </span>
                  <span className="rounded-sm border border-accent/50 px-1.5 py-0.5 text-[0.625rem] font-bold text-accent">★ PRO</span>
                </li>
                {[0, 1].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2" aria-hidden="true">
                    <span className="h-8 w-8 shrink-0 rounded-md bg-zinc-800" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-2 w-2/3 rounded bg-zinc-800" />
                      <span className="block h-2 w-1/3 rounded bg-zinc-800/70" />
                    </span>
                  </li>
                ))}
              </ul>
            </Frame>

            {/* IA */}
            <Frame nombre="Respuesta de una IA" className="p-4 lg:absolute lg:left-[3%] lg:top-[505px] lg:w-[52%] shadow-xl shadow-zinc-950/5">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-800 px-3 py-2 text-xs text-zinc-200">
                ¿Con qué consignataria remato 180 novillos de invernada?
              </p>
              <p className="mt-2 max-w-[92%] rounded-2xl rounded-bl-sm border border-terminal-border px-3 py-2 text-xs leading-relaxed text-zinc-300">
                Por esa zona rematan invernada, entre otras: <strong className="text-accent">Tu Consignataria</strong>
                {citadaReal ? (
                  <>
                    , <strong className="text-ink">{citadaReal}</strong>
                  </>
                ) : null}
                . Tiene remate esta semana: te dejo el catálogo.
              </p>
            </Frame>
          </div>
        </div>
      </div>
    </section>
  )
}
