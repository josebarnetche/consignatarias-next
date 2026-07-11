import type { Metadata } from 'next'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import NovilloEnDolares, { type NovilloDay, type NovilloPoint } from '@/components/NovilloEnDolares'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 3600

const PAGE_URL = 'https://www.consignatarias.com.ar/el-novillo-en-dolares'

// Número vivo (interpolado en build; el scraper 14:00 ART actualiza el JSON → rebuild).
// El precio en pesos del novillo (INMAG) dividido por el dólar de referencia da el
// valor por kilo vivo EN DÓLARES — la unidad que permite comparar poder de compra
// del ganado a lo largo de los años sin el ruido de la inflación en pesos.
const novillo = Math.round(marketPrices.categories.novillos.current)
const usd = marketPrices.usdBlue.current
const novilloUsd = novillo / usd
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// FAQ — mismo array para el schema y el <dl> visible; cada respuesta arranca con el dato.
const FAQ = [
  {
    question: '¿Cuánto vale el novillo en dólares hoy?',
    answer: `US$${novilloUsd.toFixed(2)} por kilo vivo (${lastUpdate}). Sale de dividir el precio del novillo en pesos del INMAG ($${fmt(novillo)}/kg) por el dólar de referencia ($${fmt(usd)}). Es el valor mayorista del animal en pie medido en dólares, no el precio de la carne en la carnicería ni un precio que fije esta página: es la referencia del Mercado Agroganadero.`,
  },
  {
    question: '¿Por qué medir el novillo en dólares?',
    answer: `Porque el peso argentino pierde valor por la inflación año a año, así que un precio en pesos no se puede comparar entre 2015 y hoy sin ajustar. Medido en dólares —hoy unos US$${novilloUsd.toFixed(2)}/kg vivo— el novillo se vuelve comparable en el tiempo: muestra el poder de compra real de la hacienda y separa lo que sube por la moneda de lo que sube por el mercado ganadero. Por eso la serie 2015→hoy en dólares es la lente honesta para ver si el ganado se revaluó o se abarató.`,
  },
  {
    question: '¿A qué dólar se convierte el novillo?',
    answer: `Esta serie usa el dólar blue como referencia principal (hoy $${fmt(usd)}), porque es el tipo de cambio libre con el que el productor efectivamente compara su poder de compra; también se puede leer al dólar oficial. La conversión es precio del INMAG en pesos ÷ dólar: $${fmt(novillo)}/kg ÷ $${fmt(usd)} = US$${novilloUsd.toFixed(2)}/kg vivo al ${lastUpdate}.`,
  },
]

export const metadata: Metadata = {
  title: `Precio del novillo en dólares Argentina · histórico 2015→hoy: US$${novilloUsd.toFixed(2)}/kg`,
  description:
    `El novillo argentino cotiza hoy unos US$${novilloUsd.toFixed(2)}/kg vivo (INMAG ÷ dólar, ${lastUpdate}). Serie histórica en dólares desde 2015: del cepo de Macri al récord de hoy, día por día. Referencia del Mercado Agroganadero, no un precio fijado por esta página.`,
  keywords: [
    'precio del novillo en dolares argentina historico',
    'novillo en dolares',
    'precio novillo dolares',
    'cuanto vale el novillo en dolares',
    'novillo en dolares 2015',
    'serie historica novillo dolares',
    'inmag en dolares',
    'precio hacienda en dolares argentina',
  ],
  openGraph: {
    title: `El novillo argentino en dólares · serie histórica 2015→hoy`,
    description: `Hoy ~US$${novilloUsd.toFixed(2)}/kg vivo (${lastUpdate}). INMAG diario cruzado con el dólar, del cepo de Macri al récord actual.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

// Días importantes de Argentina (2015→). El copy usa los números reales de la serie.
const FIXED: { date: string; label: string; ctx: string }[] = [
  {
    date: '2015-12-17',
    label: 'Macri libera el cepo',
    ctx: 'El primer sinceramiento cambiario. El dólar saltó de golpe y el novillo quedó valuado cerca de 800 dólares — el techo de la era que arrancaba.',
  },
  {
    date: '2018-08-30',
    label: 'La corrida de 2018',
    ctx: 'La corrida se comió al peso más rápido que a la hacienda. En dólares, el novillo se derrumbó casi 300 dólares respecto de 2015 — la misma vaca, la mitad de valor.',
  },
  {
    date: '2019-08-12',
    label: 'Lunes negro post-PASO',
    ctx: 'Las PASO devaluaron todo en un día. Pero el ganado, medido en dólares, casi no se movió: el peso es el que se derrite, no el animal.',
  },
  {
    date: '2020-03-20',
    label: 'Arranca la cuarentena',
    ctx: 'Pandemia, cepo reforzado y brecha que se abría. El novillo planchado en dólares — la hacienda como refugio mientras el peso se licuaba.',
  },
  {
    date: '2021-10-15',
    label: 'El novillo más barato en dólares',
    ctx: 'El piso de toda la serie. Con la brecha cambiaria en su peor momento, nunca un novillo argentino valió tan poco medido en dólares blue.',
  },
  {
    date: '2023-08-14',
    label: 'Milei gana la PASO',
    ctx: 'Otro piso. El mercado ya descontaba el salto que se venía: hacienda regalada en dólares a la espera de la corrección.',
  },
  {
    date: '2023-12-13',
    label: 'La devaluación de Milei',
    ctx: 'El oficial pasó de 350 a 800 pesos de un día para el otro. El novillo, en dólares, recuperó de golpe unos 250 dólares por cabeza.',
  },
  {
    date: '2024-12-10',
    label: 'Un año de Milei',
    ctx: 'Con la brecha cerrándose y la inflación cediendo, el ganado se revaluó fuerte en dólares. Casi 1.000 dólares la cabeza.',
  },
]

type RpcDay = { date: string; inmag: number | null; blue: number | null; usd_blue: number | null; usd_oficial: number | null }

export default async function ElNovilloEnDolaresPage() {
  const db = createAdminClient() as unknown as SupabaseClient

  const { count: totalDays } = await createAdminClient()
    .from('mag_inmag_history')
    .select('*', { count: 'exact', head: true })
    .not('inmag_value', 'is', null)

  const { data: seriesRaw } = await db.rpc('novillo_usd_series')
  const series: NovilloPoint[] = ((seriesRaw as { date: string; usd: number }[] | null) || []).map((p) => ({
    date: p.date,
    usd: Number(p.usd),
  }))
  const hoy = series.length ? series[series.length - 1].date : '2026-07-03'

  const curated = [
    ...FIXED,
    {
      date: hoy,
      label: 'Hoy · el récord',
      ctx: 'El novillo argentino nunca valió tanto en dólares en toda la serie. De 446 a más de 1.200 dólares — la misma hacienda, otro país.',
    },
  ]

  const { data: daysRaw } = await db.rpc('novillo_usd_days', { p_dates: curated.map((c) => c.date) })
  const byDate = new Map(((daysRaw as RpcDay[] | null) || []).map((r) => [r.date, r]))

  const days: NovilloDay[] = curated
    .map((c) => {
      const v = byDate.get(c.date)
      return {
        date: c.date,
        label: c.label,
        ctx: c.ctx,
        usd_blue: Number(v?.usd_blue ?? 0),
        usd_oficial: Number(v?.usd_oficial ?? 0),
        inmag: Number(v?.inmag ?? 0),
        blue: Number(v?.blue ?? 0),
      }
    })
    .filter((d) => d.usd_blue > 0)

  if (days.length === 0 || series.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-zinc-400 font-mono text-sm">
        No se pudo cargar la serie histórica en este momento.
      </div>
    )
  }

  return (
    <>
      {/* Capa AEO — schemas primero, sin tocar la lógica de la serie/gráfico */}
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Precio del novillo en dólares en Argentina: US$${novilloUsd.toFixed(2)}/kg vivo (${lastUpdate})`}
        cssSelectors={['h1', '.speakable-content']}
      />
      <DatasetSchema
        name="Precio del novillo en dólares (serie 2015-hoy)"
        description={`Serie histórica diaria del precio del novillo argentino en dólares desde 2015 hasta hoy, construida cruzando el INMAG (Mercado Agroganadero) con el dólar de referencia. Último valor: US$${novilloUsd.toFixed(2)}/kg vivo al ${lastUpdate}.`}
        url={PAGE_URL}
        keywords={[
          'novillo en dolares',
          'precio novillo dolares',
          'serie historica novillo',
          'inmag en dolares',
          'mercado agroganadero',
          'hacienda en dolares',
          'Argentina',
        ]}
        dateModified={lastUpdate}
        creator="INMAG / Mercado Agroganadero"
      />

      <NovilloEnDolares days={days} series={series} totalDays={totalDays ?? 2254} />

      {/* Bloque answer-first + FAQ citable (editorial bajo el machine) */}
      <section className="max-w-3xl mx-auto px-4 pb-32 -mt-24 text-zinc-300 font-mono text-sm leading-relaxed">
        <div className="text-xs uppercase tracking-[0.22em] text-sky-400 font-semibold mb-3">
          El dato, en una línea
        </div>

        <p className="speakable-content text-zinc-100 text-base md:text-lg leading-relaxed mb-6">
          El novillo en Argentina cotiza hoy ({lastUpdate}) unos{' '}
          <strong className="text-sky-400">US${novilloUsd.toFixed(2)}/kg vivo</strong>, resultado de
          dividir el precio en pesos del INMAG (${fmt(novillo)}/kg) por el dólar de referencia (${fmt(usd)});
          en dólares el precio permite comparar el poder de compra del ganado a lo largo de los años sin
          el ruido de la inflación.
        </p>

        <p className="text-zinc-400 mb-8 leading-relaxed">
          Es el valor mayorista del animal en pie, referencia del Mercado Agroganadero — no un precio que
          fije esta página ni el precio de la carne en la carnicería. La serie de arriba muestra ese mismo
          cálculo día por día desde 2015: la misma hacienda, y lo que valía en dólares según qué pasaba
          en la Argentina.
        </p>

        <h2 className="text-white text-lg md:text-xl font-bold tracking-tight mb-4">
          Preguntas sobre el novillo en dólares
        </h2>
        <dl className="space-y-5 mb-10">
          {FAQ.map((f) => (
            <div key={f.question} className="border-l-2 border-zinc-800 pl-4">
              <dt className="text-zinc-100 font-semibold mb-1">{f.question}</dt>
              <dd className="text-zinc-400 leading-relaxed">{f.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="border border-zinc-800 rounded-xl bg-zinc-950/40 px-5 py-4 space-y-2">
          <div className="text-xxs uppercase tracking-widest text-zinc-500 mb-1">Seguir con el dato</div>
          <p>
            <Link href="/mercado/inmag-dolares" className="text-sky-400 hover:text-sky-300 transition-colors">
              INMAG en dólares →
            </Link>{' '}
            el índice del novillo cruzado con el dólar, serie completa.
          </p>
          <p>
            <Link href="/mercado/novillos" className="text-sky-400 hover:text-sky-300 transition-colors">
              Precio del novillo en pesos →
            </Link>{' '}
            kilo vivo en el Mercado Agroganadero, actualizado a diario.
          </p>
          <p>
            <Link href="/metodologia" className="text-sky-400 hover:text-sky-300 transition-colors">
              Metodología →
            </Link>{' '}
            cómo se construye el INMAG y a qué dólar se convierte.
          </p>
          <p>
            <Link href="/mercado/arrendamiento" className="text-sky-400 hover:text-sky-300 transition-colors">
              Precio del novillo para arrendamiento →
            </Link>{' '}
            el índice sugerido para fijar y ajustar el canon en kg/ha.
          </p>
        </div>

        <p className="text-xxs text-zinc-600 mt-8 leading-relaxed">
          Referencia del Mercado Agroganadero (INMAG) cruzada con el dólar; esta página no fija el precio.
          Actualizado: {lastUpdate} · Memola Medios S.A.S.
        </p>
      </section>
    </>
  )
}
