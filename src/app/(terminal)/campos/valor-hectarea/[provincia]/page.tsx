import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  PROVINCIAS_CON_DATO,
  provinciaPorSlug,
  partidosDeProvincia,
  zonasDeProvincia,
  SUPERFICIES_TIPICAS,
} from '@/lib/campos-seo'
import { anosDeArrendamiento, promedioMesAnterior } from '@/lib/valuacion-campos'
import ValuacionCampo from '@/components/campos/ValuacionCampo'
import { FAQPageSchema } from '@/components/seo/JsonLd'

export const revalidate = 3600
export const dynamicParams = false

const BASE_URL = 'https://www.consignatarias.com.ar'

export function generateStaticParams() {
  return PROVINCIAS_CON_DATO.map((p) => ({ provincia: p.slug }))
}

const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')
const fmtM = (n: number) =>
  n >= 1_000_000
    ? `US$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} millones`
    : fmtUsd(n)

const APTITUD: Record<string, string> = {
  ganadera: 'Ganadera',
  mixta: 'Mixta',
  agricola: 'Agrícola',
  forestal: 'Forestal',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string }>
}): Promise<Metadata> {
  const { provincia } = await params
  const t = provinciaPorSlug(provincia)
  if (!t) return { title: 'Provincia no encontrada' }
  const titulo = `¿Cuánto vale la hectárea en ${t.provincia}? — ${fmtUsd(t.usd_ha)} por hectárea`
  return {
    title: titulo,
    description: `Valor de la hectárea de campo en ${t.provincia}: ${fmtUsd(t.usd_ha)} de referencia, con rango de ${fmtUsd(t.p25)} a ${fmtUsd(t.p75)}. Relevamiento propio por zona, con la fuente y la fecha de cada dato.`,
    keywords: [
      `cuanto vale la hectarea en ${t.provincia}`,
      `valor hectarea ${t.provincia}`,
      `precio de la hectarea en ${t.provincia}`,
      `valor del campo en ${t.provincia}`,
      `tasar campo en ${t.provincia}`,
      `campos en venta en ${t.provincia}`,
    ],
    openGraph: { title: titulo, url: `${BASE_URL}/campos/valor-hectarea/${provincia}`, type: 'article' },
    alternates: { canonical: `${BASE_URL}/campos/valor-hectarea/${provincia}` },
  }
}

export default async function ValorHectareaProvincia({
  params,
}: {
  params: Promise<{ provincia: string }>
}) {
  const { provincia } = await params
  const t = provinciaPorSlug(provincia)
  if (!t) notFound()

  const zonas = zonasDeProvincia(t.provincia)
  const partidos = partidosDeProvincia(t.provincia)
  const { anos } = anosDeArrendamiento(t)
  const { etiqueta } = promedioMesAnterior()
  const otras = PROVINCIAS_CON_DATO.filter((p) => p.provincia !== t.provincia)

  const masCara = zonas[0]
  const masBarata = zonas[zonas.length - 1]
  const brechaZonas =
    masCara && masBarata && masBarata.usd_ha > 0 ? masCara.usd_ha / masBarata.usd_ha : null

  const FAQ = [
    {
      question: `¿Cuánto vale una hectárea de campo en ${t.provincia}?`,
      answer: `El valor de referencia es de ${fmtUsd(t.usd_ha)} por hectárea, dentro de un rango que va de ${fmtUsd(t.p25)} a ${fmtUsd(t.p75)} según la zona y la calidad del campo. ${
        zonas.length > 1 && brechaZonas
          ? `Dentro de la provincia la diferencia es grande: ${masCara.zona} está en ${fmtUsd(masCara.usd_ha)} y ${masBarata.zona} en ${fmtUsd(masBarata.usd_ha)}, unas ${brechaZonas.toFixed(1)} veces menos.`
          : ''
      }`,
    },
    {
      question: `¿Cuánto cuesta un campo de 1.000 hectáreas en ${t.provincia}?`,
      answer: `A ${fmtUsd(t.usd_ha)} la hectárea, mil hectáreas rondan ${fmtM(t.usd_ha * 1000)}. Según la zona puede ir de ${fmtM(t.p25 * 1000)} a ${fmtM(t.p75 * 1000)}. El número final lo definen el agua, los caminos, las mejoras y qué proporción del campo es realmente aprovechable.`,
    },
    ...(t.aptitud !== 'agricola'
      ? [
          {
            question: `¿Cuánto se paga de arrendamiento en ${t.provincia}?`,
            answer: `El canon ronda ${t.kg_ha_mes_canon} kilos de novillo por hectárea por mes, que son unos ${Math.round((t.kg_ha_mes_canon ?? 0) * 12)} kilos por año — que es como se publica en los avisos. Se liquida con el ${etiqueta} del novillo. A ese canon, el valor de la tierra equivale a unos ${anos} años de arrendamiento.`,
          },
        ]
      : []),
  ]

  return (
    <>
      <FAQPageSchema items={FAQ} />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4 flex gap-2">
          <Link href="/campos" className="hover:text-accent">Campos</Link>
          <span>/</span>
          <Link href="/campos/valuar" className="hover:text-accent">Tasador</Link>
          <span>/</span>
          <span className="text-zinc-400">{t.provincia}</span>
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          ¿Cuánto vale la hectárea en {t.provincia}?
        </h1>

        <div className="border border-zinc-800 rounded-xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-2">Valor de referencia</p>
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-4xl sm:text-5xl font-mono text-zinc-50 leading-none tabular-nums">
              {fmtUsd(t.usd_ha)}
            </span>
            <span className="text-zinc-500 text-sm mb-1">por hectárea</span>
          </div>
          <p className="text-zinc-400 text-xs mt-3">
            Rango de la provincia: {fmtUsd(t.p25)} – {fmtUsd(t.p75)} · {t.region}
            {t.n > 1 ? ` · ${t.n} referencias` : ''}
          </p>
          {t.fuente && (
            <p className="text-zinc-600 text-xxs mt-1">
              {t.fuente}
              {t.fecha ? ` · ${t.fecha}` : ''}
            </p>
          )}
        </div>

        <p className="text-zinc-300 text-base mb-6">
          {zonas.length > 1 && brechaZonas ? (
            <>
              El promedio de una provincia dice poco. En {t.provincia} la hectárea de{' '}
              <strong className="text-zinc-100">{masCara.zona}</strong> vale {fmtUsd(masCara.usd_ha)} y la
              de <strong className="text-zinc-100">{masBarata.zona}</strong>, {fmtUsd(masBarata.usd_ha)}:{' '}
              <strong className="text-zinc-100">{brechaZonas.toFixed(1)} veces de diferencia</strong> dentro
              de la misma provincia. Por eso conviene mirar la zona antes que el promedio.
            </>
          ) : (
            <>
              El valor de la hectárea en {t.provincia} lo explica, sobre todo, cuánto produce el campo.
              Abajo está el detalle y un tasador para poner los datos del campo concreto.
            </>
          )}
        </p>

        {/* Cuánto sale un campo según su tamaño — responde las búsquedas por superficie */}
        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">
            Cuánto sale un campo en {t.provincia}, según el tamaño
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-normal py-2 pr-3">Superficie</th>
                  <th className="text-right font-normal py-2 pr-3">Valor de referencia</th>
                  <th className="text-right font-normal py-2">Rango de la provincia</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {SUPERFICIES_TIPICAS.map((ha) => (
                  <tr key={ha} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-200 font-sans">
                      {ha.toLocaleString('es-AR')} hectáreas
                    </td>
                    <td className="py-2 pr-3 text-right text-accent tabular-nums">
                      {fmtM(t.usd_ha * ha)}
                    </td>
                    <td className="py-2 text-right text-zinc-500 tabular-nums">
                      {fmtM(t.p25 * ha)} – {fmtM(t.p75 * ha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-600 text-xxs mt-2">
            Es una referencia de mercado, no una tasación. Un campo con agua, buenos caminos y mejoras se
            paga por encima del rango; uno con mucho bajo inundable o sin acceso, por debajo.
          </p>
        </section>

        {zonas.length > 0 && (
          <section className="mb-8">
            <h2 className="text-zinc-200 text-lg font-medium mb-3">Por zona</h2>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left font-normal py-2 pr-3">Zona</th>
                    <th className="text-left font-normal py-2 pr-3">Aptitud</th>
                    <th className="text-right font-normal py-2 pr-3">US$/ha</th>
                    <th className="text-left font-normal py-2 pl-3">Fuente</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {zonas.map((z) => (
                    <tr key={z.zona} className="border-b border-zinc-900">
                      <td className="py-2 pr-3 text-zinc-200 font-sans">{z.zona}</td>
                      <td className="py-2 pr-3 text-zinc-500 font-sans">
                        {z.aptitud ? (APTITUD[z.aptitud] ?? z.aptitud) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-accent tabular-nums">
                        {z.usd_ha.toLocaleString('es-AR')}
                      </td>
                      <td className="py-2 pl-3 text-zinc-600 font-sans text-xxs">
                        {z.fuente}
                        {z.fecha ? ` · ${z.fecha}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {partidos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-zinc-200 text-lg font-medium mb-3">Por partido</h2>
            <p className="text-zinc-400 mb-3">
              A qué zona pertenece cada partido, y qué valor de referencia le corresponde.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {partidos.map((p) => (
                <span
                  key={`${p.partido}-${p.zona}`}
                  className="text-xxs border border-zinc-800 rounded px-2 py-1 text-zinc-400"
                >
                  {p.partido}{' '}
                  <span className="text-accent font-mono tabular-nums">
                    {fmtUsd(p.usdHa)}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Tasá tu campo en {t.provincia}</h2>
          <p className="text-zinc-400 mb-4">
            Poné la superficie y la zona{t.aptitud !== 'agricola' ? ', y el canon si lo tenés pactado' : ''}.
            Cruza lo que el campo renta con lo que se paga en la zona.
          </p>
          <ValuacionCampo
            provinciaInicial={t.provincia}
            hectareasInicial={500}
            kgHaMesInicial={null}
          />
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
          <dl className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.question} className="border-l-2 border-zinc-700 pl-4">
                <dt className="text-accent font-medium text-base mb-1">{f.question}</dt>
                <dd className="text-zinc-400">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-200 font-medium mb-1">¿Tenés un campo en {t.provincia} para vender o arrendar?</p>
          <p className="text-zinc-400 mb-3">
            Publicalo gratis. Tu contacto no se publica: las consultas te las pasamos nosotros.
          </p>
          <Link
            href="/campos/publicar"
            className="inline-block px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
          >
            Publicar mi campo
          </Link>
        </div>

        <section className="border-t border-zinc-800 pt-4">
          <h2 className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-3">Otras provincias</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {otras.map((p) => (
              <Link
                key={p.slug}
                href={`/campos/valor-hectarea/${p.slug}`}
                className="text-zinc-500 hover:text-accent transition-colors"
              >
                {p.provincia}{' '}
                <span className="font-mono tabular-nums text-zinc-600">{fmtUsd(p.usd_ha)}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs mt-4 pt-4 border-t border-zinc-900">
            <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">Tasador de campos</Link>
            <Link href="/campos" className="text-zinc-500 hover:text-accent">Campos publicados</Link>
            <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent">Índice de arrendamiento</Link>
          </div>
        </section>
      </div>
    </>
  )
}
