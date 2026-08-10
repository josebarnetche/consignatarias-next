import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ZONAS_CON_DATO,
  zonaPorSlug,
  partidosDeZona,
  provinciaPorSlug,
  zonasDeProvincia,
  slugZona,
  SUPERFICIES_TIPICAS,
} from '@/lib/campos-seo'
import { anosDeArrendamiento } from '@/lib/valuacion-campos'
import ValuacionCampo from '@/components/campos/ValuacionCampo'
import CapturaCampoForm from '@/components/campos/CapturaCampoForm'
import { FAQPageSchema, DatasetSchema, SpeakableSchema, BreadcrumbSchema } from '@/components/seo/JsonLd'

export const revalidate = 3600
export const dynamicParams = false

const BASE_URL = 'https://www.consignatarias.com.ar'

export function generateStaticParams() {
  return ZONAS_CON_DATO.map((z) => ({ provincia: z.provinciaSlug, zona: z.zonaSlug }))
}

const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')
const fmtM = (n: number) =>
  n >= 1_000_000
    ? `US$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} millones`
    : fmtUsd(n)

const APTITUD: Record<string, string> = {
  ganadera: 'ganadera',
  mixta: 'mixta',
  agricola: 'agrícola',
  forestal: 'forestal',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string; zona: string }>
}): Promise<Metadata> {
  const { provincia, zona } = await params
  const z = zonaPorSlug(provincia, zona)
  if (!z) return { title: 'Zona no encontrada' }
  const titulo = `¿Cuánto vale la hectárea en ${z.zona}, ${z.provincia}? — ${fmtUsd(z.usd_ha)}`
  const partidos = partidosDeZona(z.provincia, z.zona as string)
  return {
    title: titulo,
    description: `La hectárea de campo en ${z.zona} (${z.provincia}) vale ${fmtUsd(z.usd_ha)} de referencia, con rango de ${fmtUsd(z.p25)} a ${fmtUsd(z.p75)}. Zona ${APTITUD[z.aptitud ?? 'ganadera']}${partidos.length ? `: ${partidos.slice(0, 5).join(', ')}` : ''}. Fuente y fecha del dato.`,
    keywords: [
      `cuanto vale la hectarea en ${z.zona}`,
      `valor hectarea ${z.zona}`,
      `precio hectarea ${z.zona} ${z.provincia}`,
      `campos en ${z.zona}`,
      ...partidos.slice(0, 6).map((p) => `valor hectarea ${p}`),
    ],
    openGraph: {
      title: titulo,
      url: `${BASE_URL}/campos/valor-hectarea/${provincia}/${zona}`,
      type: 'article',
    },
    alternates: { canonical: `${BASE_URL}/campos/valor-hectarea/${provincia}/${zona}` },
  }
}

export default async function ValorHectareaZona({
  params,
}: {
  params: Promise<{ provincia: string; zona: string }>
}) {
  const { provincia, zona } = await params
  const z = zonaPorSlug(provincia, zona)
  if (!z) notFound()

  const prov = provinciaPorSlug(provincia)
  const hermanas = zonasDeProvincia(z.provincia).filter((x) => x.zona !== z.zona)
  const partidos = partidosDeZona(z.provincia, z.zona as string)
  const { anos } = anosDeArrendamiento(z)
  const esAgricola = z.aptitud === 'agricola'

  // Contra el promedio de la provincia: es la información que no está en
  // ninguna otra parte y la razón por la que esta página existe.
  const vsProvincia =
    prov && prov.usd_ha > 0 ? ((z.usd_ha - prov.usd_ha) / prov.usd_ha) * 100 : null

  const url = `${BASE_URL}/campos/valor-hectarea/${provincia}/${zona}`

  const FAQ = [
    {
      question: `¿Cuánto vale una hectárea en ${z.zona}, ${z.provincia}?`,
      answer: `La referencia es de ${fmtUsd(z.usd_ha)} por hectárea, dentro de un rango de ${fmtUsd(z.p25)} a ${fmtUsd(z.p75)}. ${
        vsProvincia !== null && Math.abs(vsProvincia) > 10
          ? `Está ${Math.abs(Math.round(vsProvincia))}% ${vsProvincia > 0 ? 'por encima' : 'por debajo'} del promedio de ${z.provincia}, que es de ${fmtUsd(prov!.usd_ha)}.`
          : ''
      }`,
    },
    ...(esAgricola
      ? [
          {
            question: `¿Cuánto se paga de arrendamiento en ${z.zona}?`,
            answer: z.qq_soja_ha_anio
              ? `Al ser zona agrícola, el arrendamiento se pacta en quintales de soja por hectárea por año, no en kilos de novillo. Acá ronda los ${z.qq_soja_ha_anio} quintales por hectárea por año${z.rinde_soja_qq_ha ? `, sobre un rinde de referencia de ${z.rinde_soja_qq_ha} quintales de soja de primera` : ''}. A ese canon, el valor de la tierra equivale a unos ${anos} años de arrendamiento.`
              : 'Al ser zona agrícola, el arrendamiento se pacta en quintales de soja por hectárea por año y no en kilos de novillo.',
          },
        ]
      : [
          {
            question: `¿Cuánto se paga de arrendamiento en ${z.zona}?`,
            answer: `El canon ronda ${z.kg_ha_mes_canon} kilos de novillo por hectárea por mes, unos ${Math.round((z.kg_ha_mes_canon ?? 0) * 12)} por año — que es como se publica en los avisos. A ese canon, el valor de la tierra equivale a unos ${anos} años de arrendamiento.`,
          },
        ]),
    {
      question: `¿Cuánto cuesta un campo de 500 hectáreas en ${z.zona}?`,
      answer: `A ${fmtUsd(z.usd_ha)} la hectárea, quinientas hectáreas rondan ${fmtM(z.usd_ha * 500)}, y según la calidad del campo puede ir de ${fmtM(z.p25 * 500)} a ${fmtM(z.p75 * 500)}.`,
    },
  ]

  return (
    <>
      <FAQPageSchema items={FAQ} />
      <BreadcrumbSchema
        items={[
          { name: 'Campos', url: `${BASE_URL}/campos` },
          { name: 'Valor de la hectárea', url: `${BASE_URL}/campos/valuar` },
          { name: z.provincia, url: `${BASE_URL}/campos/valor-hectarea/${provincia}` },
          { name: z.zona as string, url },
        ]}
      />
      <DatasetSchema
        name={`Valor de la hectárea en ${z.zona}, ${z.provincia}`}
        description={`Valor de referencia y rango de la hectárea de campo en ${z.zona} (${z.provincia}), zona ${APTITUD[z.aptitud ?? 'ganadera']}. ${z.fuente ?? ''}`}
        url={url}
        keywords={[`valor hectarea ${z.zona}`, z.provincia, 'precio de la tierra']}
        dateModified={z.fecha ?? undefined}
      />
      <SpeakableSchema url={url} headline={`¿Cuánto vale la hectárea en ${z.zona}?`} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4 flex gap-2 flex-wrap">
          <Link href="/campos" className="hover:text-accent">Campos</Link>
          <span>/</span>
          <Link href={`/campos/valor-hectarea/${provincia}`} className="hover:text-accent">
            {z.provincia}
          </Link>
          <span>/</span>
          <span className="text-zinc-400">{z.zona}</span>
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          ¿Cuánto vale la hectárea en {z.zona}, {z.provincia}?
        </h1>

        <p className="speakable-content text-zinc-300 text-base mb-5">
          Una hectárea de campo en {z.zona} vale{' '}
          <strong className="text-zinc-100">{fmtUsd(z.usd_ha)}</strong> de referencia, dentro de un rango
          de {fmtUsd(z.p25)} a {fmtUsd(z.p75)}. Es zona{' '}
          <strong className="text-zinc-100">{APTITUD[z.aptitud ?? 'ganadera']}</strong>
          {!esAgricola && z.kg_ha_mes_canon
            ? `, y el arrendamiento ronda los ${Math.round(z.kg_ha_mes_canon * 12)} kilos de novillo por hectárea por año.`
            : '.'}
        </p>

        <div className="border border-zinc-800 rounded-xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-2">Valor de referencia</p>
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-4xl sm:text-5xl font-mono text-zinc-50 leading-none tabular-nums">
              {fmtUsd(z.usd_ha)}
            </span>
            <span className="text-zinc-500 text-sm mb-1">por hectárea</span>
          </div>
          <p className="text-zinc-400 text-xs mt-3">
            Rango: {fmtUsd(z.p25)} – {fmtUsd(z.p75)}
            {prov && vsProvincia !== null && (
              <>
                {' · '}
                <span className={vsProvincia > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {vsProvincia > 0 ? '+' : ''}
                  {Math.round(vsProvincia)}% vs. el promedio de {z.provincia}
                </span>
              </>
            )}
          </p>
          {z.fuente && (
            <p className="text-zinc-600 text-xxs mt-1">
              {z.fuente}
              {z.fecha ? ` · ${z.fecha}` : ''}
            </p>
          )}
        </div>

        {partidos.length > 0 && (
          <p className="text-zinc-400 mb-6">
            Partidos de referencia de la zona:{' '}
            <span className="text-zinc-200">{partidos.join(', ')}</span>.
          </p>
        )}

        {esAgricola && (
          <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 px-4 py-3 mb-6">
            <p className="text-zinc-300 text-xs leading-relaxed">
              Esta es tierra agrícola, así que el arrendamiento se pacta en{' '}
              <strong className="text-zinc-100">quintales de soja por hectárea por año</strong> y no en
              kilos de novillo.
              {z.qq_soja_ha_anio ? (
                <>
                  {' '}
                  Acá ronda los <strong className="text-zinc-100">{z.qq_soja_ha_anio} qq/ha/año</strong>
                  {z.rinde_soja_qq_ha ? `, sobre un rinde de referencia de ${z.rinde_soja_qq_ha} qq de soja de primera` : ''}
                  . A ese canon, la hectárea equivale a unos <strong className="text-zinc-100">{anos} años</strong> de arrendamiento.
                </>
              ) : null}
            </p>
            {z.qq_fuente && (
              <p className="text-zinc-600 text-xxs mt-1.5">Canon relevado: {z.qq_fuente}.</p>
            )}
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">
            Cuánto sale un campo en {z.zona}, según el tamaño
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-normal py-2 pr-3">Superficie</th>
                  <th className="text-right font-normal py-2 pr-3">Valor de referencia</th>
                  <th className="text-right font-normal py-2">Rango</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {SUPERFICIES_TIPICAS.map((ha) => (
                  <tr key={ha} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-200 font-sans">
                      {ha.toLocaleString('es-AR')} hectáreas
                    </td>
                    <td className="py-2 pr-3 text-right text-accent tabular-nums">
                      {fmtM(z.usd_ha * ha)}
                    </td>
                    <td className="py-2 text-right text-zinc-500 tabular-nums">
                      {fmtM(z.p25 * ha)} – {fmtM(z.p75 * ha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Tasá tu campo en {z.zona}</h2>
          <ValuacionCampo provinciaInicial={z.provincia} hectareasInicial={500} kgHaMesInicial={null} />
        </section>

        <section className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-6">
          <p className="text-zinc-100 text-base font-medium mb-1">¿Tenés un campo en {z.zona}?</p>
          <p className="text-zinc-400 mb-4">
            Te pasamos la valuación con el detalle de la zona y lo que estamos viendo de precios. Sin
            costo. Tus datos no se publican ni se los damos a nadie.
          </p>
          <CapturaCampoForm
            tipo="tengo"
            provinciaInicial={z.provincia}
            zonaInicial={z.zona as string}
            origen={`zona-${zona}`}
            compacto
          />
        </section>

        <section className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 mb-8">
          <p className="text-zinc-100 text-base font-medium mb-1">¿Buscás campo en {z.zona}?</p>
          <p className="text-zinc-400 mb-4">
            Decinos superficie y para qué lo querés, y te avisamos cuando aparezca algo que encaje.
          </p>
          <CapturaCampoForm
            tipo="busco"
            provinciaInicial={z.provincia}
            zonaInicial={z.zona as string}
            origen={`zona-${zona}`}
            compacto
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

        {hermanas.length > 0 && (
          <section className="border-t border-zinc-800 pt-4">
            <h2 className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-3">
              Otras zonas de {z.provincia}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {hermanas.map((h) => (
                <Link
                  key={h.zona}
                  href={`/campos/valor-hectarea/${provincia}/${slugZona(h.zona as string)}`}
                  className="text-zinc-500 hover:text-accent transition-colors"
                >
                  {h.zona}{' '}
                  <span className="font-mono tabular-nums text-zinc-600">{fmtUsd(h.usd_ha)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
