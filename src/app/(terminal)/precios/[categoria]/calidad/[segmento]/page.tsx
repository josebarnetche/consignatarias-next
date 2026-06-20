import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { AnswerBlock } from '@/components/seo/AnswerBlock'
import { DataStamp } from '@/components/seo/DataStamp'
import { PriceCTA } from '@/components/PriceCTA'
import { getQualitySegments, getQualitySegmentByParams, CABEZAS_INDEX_THRESHOLD } from '@/lib/data/quality-segments'

/* ============================================================
   /precios/[categoria]/calidad/[segmento] — observed MAG quality
   segments. The most honest pages in the catalog: 100% observed
   (min/avg/max + cabezas), zero estimate. One page per emittable row.
   ============================================================ */

const CAT: Record<string, { singular: string; title: string }> = {
  novillos: { singular: 'novillo', title: 'Novillo' },
  novillitos: { singular: 'novillito', title: 'Novillito' },
  vaquillonas: { singular: 'vaquillona', title: 'Vaquillona' },
  vacas: { singular: 'vaca', title: 'Vaca' },
  toros: { singular: 'toro', title: 'Toro' },
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const segLabel = (label: string) => (label.includes(' ') ? label.slice(label.indexOf(' ') + 1) : label)

export function generateStaticParams() {
  return getQualitySegments().map((s) => ({ categoria: s.categoria, segmento: s.segmento }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; segmento: string }>
}): Promise<Metadata> {
  const { categoria, segmento } = await params
  const row = getQualitySegmentByParams(categoria, segmento)
  const cat = CAT[categoria]
  if (!row || !cat) return { title: 'Segmento no encontrado' }
  const lbl = segLabel(row.label)
  const avg = Math.round(row.avgPrice)
  const lastUpdate = marketPrices.lastUpdate
  const url = `https://www.consignatarias.com.ar/precios/${categoria}/calidad/${segmento}`
  const title = `Precio ${cat.singular} ${lbl} hoy: $${fmt(avg)}/kg (observado MAG ${lastUpdate})`
  const description = `Precio observado del ${cat.singular} ${lbl}: promedio $${fmt(avg)}/kg vivo (rango $${fmt(row.minPrice)}–$${fmt(row.maxPrice)}, ${fmt(row.cabezas)} cabezas) en el Mercado Agroganadero. Dato real por categoría, ${lastUpdate}.`
  return {
    title,
    description,
    openGraph: { title, description, url, type: 'website' },
    alternates: { canonical: url },
    // Thin sample → keep out of the index (still followable), per the consignataria thin pattern.
    ...(row.cabezas < CABEZAS_INDEX_THRESHOLD ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function QualitySegmentPage({
  params,
}: {
  params: Promise<{ categoria: string; segmento: string }>
}) {
  const { categoria, segmento } = await params
  const row = getQualitySegmentByParams(categoria, segmento)
  const cat = CAT[categoria]
  if (!row || !cat) notFound()
  const lbl = segLabel(row.label)
  const avg = Math.round(row.avgPrice)
  const lastUpdate = marketPrices.lastUpdate
  const magDate = (marketPrices.detailedCategories as { date?: string })?.date ?? lastUpdate
  const thin = row.cabezas < CABEZAS_INDEX_THRESHOLD

  const faqItems = [
    {
      question: `¿Cuánto vale el ${cat.singular} ${lbl.toLowerCase()} hoy?`,
      answer: `Promedió $${fmt(avg)}/kg vivo (rango $${fmt(row.minPrice)}–$${fmt(row.maxPrice)}, ${fmt(row.cabezas)} cabezas) en el Mercado Agroganadero del ${magDate}. Es un precio observado por categoría.`,
    },
    {
      question: `¿Cuál es el rango de precio del ${cat.singular} ${lbl.toLowerCase()}?`,
      answer: `Entre $${fmt(row.minPrice)} y $${fmt(row.maxPrice)} por kg vivo, con promedio $${fmt(avg)} (MAG, ${magDate}).`,
    },
    {
      question: `¿Cuántas cabezas de ${cat.singular} ${lbl.toLowerCase()} se operaron?`,
      answer: `${fmt(row.cabezas)} cabezas en la rueda del ${magDate}.`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section={`precios/${categoria}/calidad/${segmento}`} sectionName={`${cat.title} ${lbl}`} />
      <FAQPageSchema items={faqItems} />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/precios/${categoria}/calidad/${segmento}`}
        headline={`Precio ${cat.singular} ${lbl} hoy`}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <Link href={`/precios/${categoria}`} className="hover:text-zinc-300">{cat.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{lbl}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Precio del {cat.singular} {lbl} hoy: <span style={{ color: '#fbbf24' }}>${fmt(avg)}/kg</span>
        </h1>
        <p className="text-zinc-400 text-sm mb-3">
          <DataStamp isoDate={magDate} /> · precio observado, Mercado Agroganadero
        </p>
        <AnswerBlock
          question={`Precio observado del ${cat.singular} ${lbl} (MAG ${magDate})`}
          answer={
            <>
              El {cat.singular} {lbl.toLowerCase()} promedió <strong className="text-white">${fmt(avg)}/kg</strong> vivo
              (rango ${fmt(row.minPrice)}–${fmt(row.maxPrice)}, {fmt(row.cabezas)} cabezas) en el remate observado del
              Mercado Agroganadero del {magDate}. Es el promedio realizado por categoría — precio observado, no estimado.
            </>
          }
        />
        {thin && (
          <p className="text-xxs text-amber-500/80 mb-6 -mt-3 max-w-2xl">
            Muestra reducida: {fmt(row.cabezas)} cabezas en la última rueda; el promedio puede no ser representativo.
          </p>
        )}

        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Precio observado — {cat.title} {lbl}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border">
            {[
              ['Mínimo', `$${fmt(row.minPrice)}`],
              ['Promedio', `$${fmt(avg)}`],
              ['Máximo', `$${fmt(row.maxPrice)}`],
              ['Cabezas', fmt(row.cabezas)],
            ].map(([k, v]) => (
              <div key={k} className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">{k}</div>
                <div className="text-zinc-100 text-2xl font-terminal tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <div className="px-panel py-2 text-xxs text-zinc-600">
            $/kg vivo · Mercado Agroganadero (Cañuelas), rueda del {magDate}.
          </div>
        </div>

        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {faqItems.map((f, i) => (
              <div key={f.question} className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}>
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <PriceCTA />

        <p className="text-sm text-zinc-400">
          <Link href={`/precios/${categoria}`} className="text-amber-500 hover:text-amber-400">
            ← Ver todos los precios de {cat.title.toLowerCase()}
          </Link>
        </p>
      </div>
    </>
  )
}
