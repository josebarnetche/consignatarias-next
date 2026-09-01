import type { Metadata } from 'next'
import Link from 'next/link'
import { Tv, Radio, MapPin } from 'lucide-react'
import {
  EXPO,
  REMATES_EXPO,
  plazasPorConcentracion,
  posicionNacional,
  casasConfirmadas,
  esMercedesCorrientes,
  type Modalidad,
  type RemateExpo,
} from '@/lib/data/expo-mercedes'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
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
  ],
  openGraph: {
    title: `Remates de la ${EXPO.edicion}ª Expo Rural de Mercedes`,
    description: 'Siete remates de seis firmas en dos semanas. El cronograma completo, con quién remata cada uno.',
    url: `${APP_URL}${RUTA}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${RUTA}` },
}

const MODALIDAD: Record<Modalidad, { etiqueta: string; icono: typeof Tv; detalle: string }> = {
  televisado: { etiqueta: 'Televisado', icono: Tv, detalle: 'Se sigue y se oferta a distancia.' },
  streaming: { etiqueta: 'Streaming', icono: Radio, detalle: 'Se sigue y se oferta a distancia.' },
  fisico: { etiqueta: 'En pista', icono: MapPin, detalle: 'En el predio, con la hacienda a la vista.' },
}

function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function esDeMuestra(r: RemateExpo): boolean {
  return r.fecha >= EXPO.muestraDesde && r.fecha <= EXPO.muestraHasta
}

export default function Page() {
  const pos = posicionNacional()
  const siguiente = plazasPorConcentracion().find(
    (p) => p.firmas <= pos.firmas && !esMercedesCorrientes(p.sede),
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />

      <nav className="mb-6 text-xs text-zinc-500">
        <Link href="/remates" className="hover:text-accent">Remates</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-400">Expo Rural de Mercedes</span>
      </nav>

      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-accent">
          {EXPO.entidad} · {EXPO.provincia}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Siete remates, seis firmas, dos semanas
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-300">
          Alrededor de la {EXPO.edicion}ª Exposición de Mercedes se arma una rueda de remates que
          no tiene equivalente en el interior del país: {casasConfirmadas().length} casas distintas
          bajando el martillo en la misma plaza, entre el 4 y el 17 de septiembre, con invernada y
          reproductores Braford saliendo la misma semana.
        </p>
      </header>

      {/* El dato que sostiene el título. Se calcula en cada build desde el calendario
          propio: si deja de ser cierto, la página deja de decirlo. */}
      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-200">Cómo se compara</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Sobre nuestro calendario de remates, agrupando por plaza y buscando la quincena con más
          firmas distintas, Mercedes queda <strong className="text-zinc-100">tercera del país</strong>.
          Sólo la superan las dos megamuestras nacionales:
        </p>

        <ol className="mt-4 space-y-2 text-sm">
          {pos.porEncima.map((p, i) => (
            <li key={p.sede} className="flex items-baseline justify-between gap-4 text-zinc-400">
              <span>
                <span className="mr-2 font-mono text-xs text-zinc-600">{i + 1}</span>
                {p.sede}
              </span>
              <span className="font-mono tabular-nums text-zinc-500">{p.firmas} firmas</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 rounded bg-accent/[0.06] px-2 py-1.5 text-zinc-100">
            <span>
              <span className="mr-2 font-mono text-xs text-accent">{pos.puesto}</span>
              Mercedes, Corrientes
            </span>
            <span className="font-mono tabular-nums text-accent">{pos.firmas} firmas</span>
          </li>
          {siguiente && (
            <li className="flex items-baseline justify-between gap-4 text-zinc-500">
              <span>
                <span className="mr-2 font-mono text-xs text-zinc-600">{pos.puesto + 1}</span>
                {siguiente.sede}
              </span>
              <span className="font-mono tabular-nums">{siguiente.firmas} firmas</span>
            </li>
          )}
        </ol>

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Palermo y Expoagro son muestras nacionales. Entre las sociedades rurales del interior, la
          plaza que sigue a Mercedes junta {siguiente?.firmas ?? 4} firmas.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-100">El cronograma</h2>
        <p className="mt-2 text-sm text-zinc-400">
          La muestra es del {fechaLarga(EXPO.muestraDesde)} al {fechaLarga(EXPO.muestraHasta)}. La
          rueda de remates la desborda por los dos lados.
        </p>

        <ol className="mt-6 space-y-3">
          {REMATES_EXPO.map((r) => {
            const m = MODALIDAD[r.modalidad]
            const Icono = m.icono
            const destacado = esDeMuestra(r)
            return (
              <li
                key={r.fecha}
                className={`rounded-lg border p-4 ${
                  destacado ? 'border-accent/40 bg-accent/[0.04]' : 'border-zinc-800 bg-zinc-900/30'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    {/* Primero qué se vende, después quién lo baja: en un remate de
                        cabaña el productor busca la genética, no la casa. */}
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
                      <p className="text-sm text-zinc-500">Consignataria a confirmar</p>
                    )}
                  </div>
                  <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">
                    {fechaLarga(r.fecha)}
                    {r.hora && ` · ${r.hora}`}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
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
                  {destacado && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-accent">Días de muestra</span>
                    </>
                  )}
                </div>

                {r.nota && <p className="mt-2 text-sm leading-relaxed text-zinc-400">{r.nota}</p>}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-medium text-zinc-200">Televisado, streaming y pista</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          De los siete, cuatro se siguen y se ofertan a distancia y tres son en el predio. Es la
          mezcla que explica por qué la plaza convoca tantas firmas: la misma semana sirve para
          vender hacienda general a distancia y para colocar reproductores con el animal delante.
        </p>
      </section>

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-medium text-zinc-200">De dónde sale cada dato</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
          <li>
            <span className="text-zinc-300">Los remates del 9 al 12</span> — cronograma de la{' '}
            {EXPO.entidad}. El del miércoles 9 es <strong className="text-zinc-200">HK Agro a las
            18:00</strong>; el programa que todavía figura en algunos lados lo da a las 14:00 a
            nombre de otra firma, y ese dato quedó viejo.
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
        <p className="mt-3 text-xs text-zinc-500">
          Si tenés el dato del 17 o ves algo que no cierra,{' '}
          <a href="mailto:agro@memola.com.ar" className="text-accent underline underline-offset-2">
            escribinos
          </a>
          .
        </p>
      </section>

      <section className="mt-12 border-t border-zinc-800 pt-6">
        <h2 className="text-base font-semibold text-zinc-200">Seguir de cerca</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/remates" className="text-accent underline underline-offset-2">
              Calendario completo de remates
            </Link>
            <span className="text-zinc-500"> — todo el país, actualizado a diario</span>
          </li>
          <li>
            <Link href="/remates/corrientes" className="text-accent underline underline-offset-2">
              Remates en Corrientes
            </Link>
          </li>
          <li>
            <Link href="/mercado/inmag" className="text-accent underline underline-offset-2">
              El novillo, día por día
            </Link>
            <span className="text-zinc-500"> — contra qué se mide lo que se paga en la pista</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
