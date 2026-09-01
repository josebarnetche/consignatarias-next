import type { Metadata } from 'next'
import Link from 'next/link'
import { Tv, Radio, MapPin, ArrowRight } from 'lucide-react'
import {
  EXPO,
  REMATES_EXPO,
  plazasPorConcentracion,
  posicionNacional,
  esMercedesCorrientes,
  type Modalidad,
  type RemateExpo,
} from '@/lib/data/expo-mercedes'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { getLogoUrl } from '@/lib/data/logo-map'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

const APP_URL = 'https://www.consignatarias.com.ar'
const RUTA = '/remates/expo-rural-mercedes'

export const revalidate = 3600

export const metadata: Metadata = {
  title: `Remates de la ${EXPO.edicion}ª Expo Rural de Mercedes ${EXPO.anio} — siete remates, seis firmas`,
  description:
    `Todos los remates de la ${EXPO.edicion}ª Exposición de la ${EXPO.entidad}, Corrientes: fechas, firmas y modalidad. ` +
    'Siete remates de seis consignatarias en dos semanas — fuera de Palermo y Expoagro, la mayor concentración del país.',
  keywords: [
    'remates expo rural mercedes',
    'expo rural mercedes corrientes 2026',
    'remates mercedes corrientes',
    'sociedad rural de mercedes remates',
    `${EXPO.edicion} expo rural mercedes`,
    'remate reproductores mercedes corrientes',
    'braford corrientes remate',
  ],
  openGraph: {
    title: `Remates de la ${EXPO.edicion}ª Expo Rural de Mercedes`,
    description: 'Siete remates de seis firmas en dos semanas. El cronograma completo, con quién remata cada uno.',
    url: `${APP_URL}${RUTA}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${RUTA}` },
}

const MODALIDAD: Record<Modalidad, { etiqueta: string; icono: typeof Tv }> = {
  televisado: { etiqueta: 'Televisado', icono: Tv },
  streaming: { etiqueta: 'Streaming', icono: Radio },
  fisico: { etiqueta: 'En pista', icono: MapPin },
}

function fechaCorta(iso: string): { dia: string; mes: string; semana: string } {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  return {
    dia: String(d),
    mes: f.toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    semana: f.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'UTC' }),
  }
}

function esDeMuestra(r: RemateExpo): boolean {
  return r.fecha >= EXPO.muestraDesde && r.fecha <= EXPO.muestraHasta
}

/** Las firmas con logo, en el orden en que aparecen en la rueda, sin repetir. */
function firmasConLogo(): Array<{ slug: string; nombre: string; logo: string }> {
  const vistas = new Map<string, { slug: string; nombre: string; logo: string }>()
  for (const r of REMATES_EXPO) {
    if (!r.slug || vistas.has(r.slug)) continue
    const logo = getLogoUrl(r.slug)
    if (logo) vistas.set(r.slug, { slug: r.slug, nombre: r.firma, logo })
  }
  return [...vistas.values()]
}

export default function Page() {
  const pos = posicionNacional()
  const siguiente = plazasPorConcentracion().find(
    (p) => p.firmas <= pos.firmas && !esMercedesCorrientes(p.sede),
  )
  const firmas = firmasConLogo()

  return (
    <>
      {/* ── Hero, en el registro de la portada: foto de campo al 35 %, degradados
             hacia el carbón y la grilla de fondo. ─────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-zinc-800/60">
        <div className="absolute inset-0 z-0">
          <picture>
            <source media="(max-width: 768px)" srcSet="/marca/hero-pampa-mobile.webp" type="image/webp" />
            <source srcSet="/marca/hero-pampa.webp" type="image/webp" />
            <img
              src="/marca/hero-pampa.jpg"
              alt=""
              className="h-full w-full object-cover object-[center_35%] opacity-30"
              fetchPriority="high"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/75 to-[#09090b]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/50 via-transparent to-[#09090b]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-20">
          <nav className="mb-6 text-xs text-zinc-500">
            <Link href="/remates" className="hover:text-accent">Remates</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-400">Expo de Mercedes</span>
          </nav>

          <p className="text-xs uppercase tracking-[0.18em] text-accent">
            {EXPO.entidad} · {EXPO.provincia} · 4 al 17 de septiembre
          </p>
          <h1 className="mt-3 text-4xl font-normal leading-[1.1] tracking-tight text-zinc-50 md:text-5xl lg:text-6xl">
            Siete remates.
            <br />
            <span className="text-accent">Seis firmas.</span> Dos semanas.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300 md:text-xl">
            Fuera de Palermo y Expoagro, no hay en el país una plaza que junte tantas casas
            rematando en la misma quincena. Invernada y reproductores Braford, en pista y por
            pantalla, alrededor de la {EXPO.edicion}ª Exposición.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <p className="font-mono text-3xl tabular-nums text-zinc-100">{REMATES_EXPO.length}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Remates</p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <p className="font-mono text-3xl tabular-nums text-zinc-100">{pos.firmas}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Casas</p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <p className="font-mono text-3xl tabular-nums text-accent">{pos.puesto}º</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Del país</p>
            </div>
          </div>
        </div>
      </section>

      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />

      {/* ── Las firmas, con su logo. Es la prueba visual del titular. ─────────── */}
      <section className="border-b border-zinc-800/60 bg-zinc-950/40">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Quiénes rematan</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {firmas.map((f) => (
              <Link
                key={f.slug}
                href={consignatariaProfilePath(f.slug)}
                className="group flex h-24 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-accent/40 hover:bg-zinc-900/70"
                title={f.nombre}
              >
                {/* Los logos vienen en fondos y proporciones distintas; el contenedor
                    fija el alto y `object-contain` respeta cada marca sin recortarla. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.logo}
                  alt={f.nombre}
                  className="max-h-12 w-auto max-w-full object-contain opacity-80 transition-opacity group-hover:opacity-100"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Cada logo lleva a la ficha de la firma: sus remates, su cadencia y su plaza.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* ── La comparación. El número se recalcula en cada build. ───────────── */}
        <section className="rounded-lg border border-sky-500/20 bg-gradient-to-br from-sky-950/25 via-zinc-900/60 to-zinc-900/60 p-6 md:p-8">
          <h2 className="text-2xl font-normal tracking-tight text-zinc-100 md:text-3xl">
            Tercera del país, y primera del interior
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Tomamos nuestro calendario completo, agrupamos por plaza y buscamos, para cada una, la
            quincena con más firmas distintas. Sólo dos la superan, y las dos son muestras
            nacionales.
          </p>

          <ol className="mt-6 divide-y divide-zinc-800/70">
            {pos.porEncima.map((p, i) => (
              <li key={p.sede} className="flex items-baseline justify-between gap-4 py-3 text-zinc-400">
                <span className="min-w-0 truncate">
                  <span className="mr-3 font-mono text-xs text-zinc-600">{i + 1}</span>
                  {p.sede}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-zinc-500">{p.firmas}</span>
              </li>
            ))}
            <li className="-mx-2 flex items-baseline justify-between gap-4 rounded bg-accent/[0.08] px-2 py-3 text-zinc-100">
              <span>
                <span className="mr-3 font-mono text-xs text-accent">{pos.puesto}</span>
                Mercedes, Corrientes
              </span>
              <span className="shrink-0 font-mono text-lg tabular-nums text-accent">{pos.firmas}</span>
            </li>
            {siguiente && (
              <li className="flex items-baseline justify-between gap-4 py-3 text-zinc-500">
                <span className="min-w-0 truncate">
                  <span className="mr-3 font-mono text-xs text-zinc-600">{pos.puesto + 1}</span>
                  {siguiente.sede}
                </span>
                <span className="shrink-0 font-mono tabular-nums">{siguiente.firmas}</span>
              </li>
            )}
          </ol>
          <p className="mt-4 text-xs text-zinc-500">Firmas distintas en su mejor quincena del año.</p>
        </section>

        {/* ── El cronograma ──────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-2xl font-normal tracking-tight text-zinc-100 md:text-3xl">
            El cronograma
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            La muestra va del 10 al 13. La rueda de remates la desborda por los dos lados.
          </p>

          <ol className="mt-8 space-y-2">
            {REMATES_EXPO.map((r) => {
              const m = MODALIDAD[r.modalidad]
              const Icono = m.icono
              const destacado = esDeMuestra(r)
              const f = fechaCorta(r.fecha)
              const logo = r.slug ? getLogoUrl(r.slug) : null
              return (
                <li
                  key={r.fecha}
                  className={`flex gap-4 rounded-lg border p-4 transition-colors sm:gap-6 ${
                    destacado
                      ? 'border-accent/30 bg-accent/[0.05]'
                      : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  {/* Bloque de fecha, como el taco de un almanaque. */}
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-mono text-2xl leading-none tabular-nums text-zinc-100">{f.dia}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{f.mes}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    {r.cabania && <p className="font-medium text-zinc-100">{r.cabania}</p>}
                    {r.firma ? (
                      <p className={r.cabania ? 'text-sm text-zinc-400' : 'font-medium text-zinc-100'}>
                        {r.cabania && <span className="text-zinc-500">Rematan </span>}
                        {r.slug ? (
                          <Link
                            href={consignatariaProfilePath(r.slug)}
                            className="underline decoration-zinc-700 underline-offset-4 hover:text-accent hover:decoration-accent"
                          >
                            {r.firma}
                          </Link>
                        ) : (
                          r.firma
                        )}
                      </p>
                    ) : (
                      // Sin consignataria confirmada se dice, no se completa: atribuirle
                      // el remate a una firma real equivocada es peor que el hueco.
                      <p className="text-sm italic text-zinc-500">Consignataria a confirmar</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span className="capitalize">{f.semana}</span>
                      {r.hora && <span className="font-mono">{r.hora}</span>}
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icono className="h-3.5 w-3.5" aria-hidden />
                        {m.etiqueta}
                      </span>
                      {r.categoria && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="capitalize">{r.categoria}</span>
                        </>
                      )}
                      {destacado && <span className="text-accent">· Días de muestra</span>}
                    </div>

                    {r.nota && <p className="mt-2 text-sm leading-relaxed text-zinc-400">{r.nota}</p>}
                  </div>

                  {logo && (
                    <div className="hidden w-24 shrink-0 items-center justify-end sm:flex">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo}
                        alt=""
                        className="max-h-10 w-auto max-w-full object-contain opacity-60"
                        loading="lazy"
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── Por qué convoca tantas casas ───────────────────────────────────── */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: 'Pantalla y pista, la misma semana',
              d: 'Cuatro remates se siguen y se ofertan a distancia; tres son en el predio. Sirve para vender hacienda general sin moverse y para colocar reproductores con el animal delante.',
            },
            {
              t: 'Braford, en su plaza',
              d: 'Trumil, de Mocoretá, y La Morenita, de Curuzú Cuatiá, figuran como cabañas Braford en el padrón de la asociación. La genética de la zona se vende en la zona.',
            },
            {
              t: 'La rueda excede a la muestra',
              d: 'Abre el 4, casi una semana antes de que entren los animales, y cierra el 17, cuatro días después del último desfile.',
            },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
              <h3 className="text-base font-medium text-zinc-100">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.d}</p>
            </div>
          ))}
        </section>

        {/* ── Fuentes ────────────────────────────────────────────────────────── */}
        <section className="mt-16 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-sm font-medium text-zinc-200">De dónde sale cada dato</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>
              <span className="text-zinc-300">Los remates del 9 al 12</span> — cronograma de la{' '}
              {EXPO.entidad}. El del miércoles 9 es{' '}
              <strong className="text-zinc-200">HK Agro a las 18:00</strong>; el programa que
              todavía figura en algunos lados lo da a las 14:00 a nombre de otra firma, y ese dato
              quedó viejo.
            </li>
            <li>
              <span className="text-zinc-300">Los del 4 y el 12</span> — publicados por las propias
              consignatarias y recogidos por nuestro calendario.
            </li>
            <li>
              <span className="text-zinc-300">Trumil y La Morenita</span> — figuran como cabañas de
              Corrientes, en Mocoretá y Curuzú Cuatiá, en el padrón de cabañas de Braford Argentina.
              Quién remata sus lotes el 17 todavía no está confirmado y por eso no se nombra: ese
              remate queda fuera del programa oficial de la muestra.
            </li>
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            Si tenés el dato del 17 o ves algo que no cierra,{' '}
            <a href="mailto:agro@memola.com.ar" className="text-accent underline underline-offset-2">
              escribinos
            </a>
            .
          </p>
        </section>

        {/* ── Cierre ─────────────────────────────────────────────────────────── */}
        <section className="mt-16 rounded-lg border border-sky-500/20 bg-gradient-to-br from-sky-950/30 via-zinc-900/60 to-zinc-900/60 p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-normal tracking-tight text-zinc-100 md:text-3xl">
                Contra qué se mide lo que se paga
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                El índice del novillo se publica todos los días y es la referencia con la que se
                arma un precio antes de entrar a la pista. Gratis, sin cuenta.
              </p>
            </div>
            <Link
              href="/mercado/inmag"
              className="group flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 px-8 py-4 font-medium text-zinc-950 shadow-[0_0_40px_rgba(56,189,248,0.3)] transition-all hover:from-sky-200 hover:via-sky-300 hover:to-sky-400 hover:shadow-[0_0_60px_rgba(56,189,248,0.5)]"
            >
              Ver el índice de hoy
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        <section className="mt-12 border-t border-zinc-800 pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/remates" className="text-accent underline underline-offset-2">
                Calendario completo
              </Link>
            </li>
            <li>
              <Link href="/remates/corrientes" className="text-accent underline underline-offset-2">
                Remates en Corrientes
              </Link>
            </li>
            <li>
              <Link href="/consignatarias" className="text-accent underline underline-offset-2">
                Directorio de consignatarias
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
