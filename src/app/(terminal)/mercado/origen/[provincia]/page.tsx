import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema, DatasetSchema } from '@/components/seo/JsonLd'
import { AnswerBlock } from '@/components/seo/AnswerBlock'
import { DataStamp } from '@/components/seo/DataStamp'
import { PriceCTA } from '@/components/PriceCTA'
import { ProvinceCluster } from '@/components/seo/ProvinceCluster'

/* ============================================================
   /mercado/origen/[provincia] — de qué provincia provino la hacienda
   operada en el Mercado Agroganadero (única rueda). Dato de origen
   (procedencia), agregado a provincia + localidad. NUNCA muestra el
   remitente (privacidad). Gated a las provincias con ProvinceCluster.
   ============================================================ */

const PROVINCES: Record<string, { name: string; display: string }> = {
  'buenos-aires': { name: 'BUENOS AIRES', display: 'Buenos Aires' },
  'santa-fe': { name: 'SANTA FE', display: 'Santa Fe' },
  'la-pampa': { name: 'LA PAMPA', display: 'La Pampa' },
  'cordoba': { name: 'CORDOBA', display: 'Córdoba' },
  'san-luis': { name: 'SAN LUIS', display: 'San Luis' },
  'entre-rios': { name: 'ENTRE RIOS', display: 'Entre Ríos' },
}

// Province codes used inside auctionDayEntries.entries[].provincia.
const CODE_MAP: Record<string, string> = {
  BUE: 'BUENOS AIRES', SFE: 'SANTA FE', COR: 'CORDOBA', CBA: 'CORDOBA', LPA: 'LA PAMPA',
  SLU: 'SAN LUIS', ERI: 'ENTRE RIOS', CHU: 'CHUBUT', MZA: 'MENDOZA', NEU: 'NEUQUEN',
  TUC: 'TUCUMAN', CHA: 'CHACO', SDE: 'SANTIAGO DEL ESTERO', FOR: 'FORMOSA', MIS: 'MISIONES', CTE: 'CORRIENTES',
}

const NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCES).map(([slug, v]) => [v.name, slug]),
)

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

interface ProvinceRow { province: string; enPie: number; total: number; percentage: number }
interface Entry { remitente?: string; localidad?: string; provincia?: string; cabezas?: number }

export function generateStaticParams() {
  return (marketPrices.provinceEntry.provinces as ProvinceRow[])
    .filter((p) => NAME_TO_SLUG[p.province])
    .map((p) => ({ provincia: NAME_TO_SLUG[p.province] }))
}

export const dynamicParams = false

function getContext(slug: string) {
  const config = PROVINCES[slug]
  if (!config) return null
  const row = (marketPrices.provinceEntry.provinces as ProvinceRow[]).find((p) => p.province === config.name)
  if (!row) return null

  // Aggregate origin cattle to localidad (DROP remitente — privacy de-risk).
  const consig = (marketPrices.auctionDayEntries?.consignatarias ?? {}) as Record<string, { entries?: Entry[] }>
  const localMap = new Map<string, number>()
  let receiving = 0
  for (const key of Object.keys(consig)) {
    let touched = false
    for (const e of consig[key].entries ?? []) {
      const pname = CODE_MAP[(e.provincia ?? '').toUpperCase()] ?? (e.provincia ?? '')
      if (pname === config.name && e.localidad) {
        localMap.set(e.localidad, (localMap.get(e.localidad) ?? 0) + (e.cabezas ?? 0))
        touched = true
      }
    }
    if (touched) receiving++
  }
  const localidades = [...localMap.entries()]
    .map(([localidad, cabezas]) => ({ localidad, cabezas }))
    .sort((a, b) => b.cabezas - a.cabezas)

  return { config, row, localidades, receiving, date: marketPrices.provinceEntry.date }
}

export async function generateMetadata({ params }: { params: Promise<{ provincia: string }> }): Promise<Metadata> {
  const { provincia } = await params
  const ctx = getContext(provincia)
  if (!ctx) return { title: 'Origen no encontrado' }
  const { config, row, date } = ctx
  const url = `https://www.consignatarias.com.ar/mercado/origen/${provincia}`
  const title = `Origen de la hacienda de ${config.display} en el Mercado Agroganadero (${date})`
  const description = `${config.display} aportó el ${row.percentage}% de la hacienda operada en el Mercado Agroganadero en la última rueda (${fmt(row.total)} cabezas, ${date}). Procedencia por localidad y participación en la oferta del MAG.`
  return {
    title,
    description,
    openGraph: { title, description, url, type: 'website' },
    alternates: { canonical: url },
  }
}

export default async function OrigenProvinciaPage({ params }: { params: Promise<{ provincia: string }> }) {
  const { provincia } = await params
  const ctx = getContext(provincia)
  if (!ctx) notFound()
  const { config, row, localidades, receiving, date } = ctx
  const lastUpdate = marketPrices.lastUpdate

  const topLoc = localidades.slice(0, 3).map((l) => l.localidad).join(', ')
  const faqItems = [
    {
      question: `¿Qué porcentaje de la hacienda del Mercado Agroganadero provino de ${config.display}?`,
      answer: `${config.display} aportó el ${row.percentage}% (${fmt(row.total)} cabezas) de la hacienda operada en el MAG en la última rueda (${date}).`,
    },
    {
      question: `¿De qué localidades de ${config.display} provino la hacienda?`,
      answer: localidades.length
        ? `Principales localidades de origen: ${topLoc}${localidades.length > 3 ? ', entre otras' : ''} (rueda del ${date}).`
        : `El detalle por localidad no está disponible para ${config.display} en la última rueda; sí su participación provincial (${row.percentage}%).`,
    },
    {
      question: `¿Dónde se forma el precio de esa hacienda?`,
      answer: `El precio de referencia se forma en el Mercado Agroganadero (Cañuelas) y se publica como INMAG. El dato de origen indica de dónde viajó la hacienda hasta el mercado.`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section={`mercado/origen/${provincia}`} sectionName={`Origen — ${config.display}`} />
      <FAQPageSchema items={faqItems} />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/mercado/origen/${provincia}`}
        headline={`Origen de la hacienda de ${config.display} en el Mercado Agroganadero`}
      />
      <DatasetSchema
        name={`Origen de la hacienda operada en el Mercado Agroganadero — ${config.display}`}
        description={`Participación de ${config.display} (${row.percentage}%, ${fmt(row.total)} cabezas) en la oferta del Mercado Agroganadero, rueda del ${date}.`}
        url={`https://www.consignatarias.com.ar/mercado/origen/${provincia}`}
        keywords={['origen hacienda', 'procedencia ganado', `hacienda ${config.display.toLowerCase()}`, 'mercado agroganadero']}
        dateModified={lastUpdate}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Origen — {config.display}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Origen de la hacienda de {config.display} en el Mercado Agroganadero
        </h1>
        <p className="text-zinc-400 text-sm mb-3">
          <DataStamp isoDate={date} prefix="Última rueda" /> · Mercado Agroganadero (Cañuelas)
        </p>
        <AnswerBlock
          question={`¿De qué zona provino la hacienda de ${config.display} operada en el Mercado Agroganadero?`}
          answer={
            <>
              {config.display} aportó el <strong className="text-white">{row.percentage}%</strong> de la hacienda
              operada en el Mercado Agroganadero en la última rueda (<strong className="text-white">{fmt(row.total)} cabezas</strong>,{' '}
              {date}){localidades.length ? <>, con origen principal en {topLoc}</> : null}. El precio se forma en
              Cañuelas (INMAG); este dato indica de dónde viajó la hacienda.
            </>
          }
        />

        {/* Share panel */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Origen de la hacienda — {config.display}</div>
          <div className="grid grid-cols-3 gap-px bg-terminal-border">
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Participación</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">{row.percentage}%</div>
              <div className="text-zinc-600 text-xxs">de la oferta del MAG</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Cabezas</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">{fmt(row.total)}</div>
              <div className="text-zinc-600 text-xxs">total operadas</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">En pie</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">{fmt(row.enPie)}</div>
              <div className="text-zinc-600 text-xxs">cabezas</div>
            </div>
          </div>
        </div>

        {/* Localidades */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Principales localidades de origen</div>
          {localidades.length > 0 ? (
            <div className="divide-y divide-terminal-border">
              {localidades.slice(0, 12).map((l) => (
                <div key={l.localidad} className="px-panel py-2.5 flex items-center justify-between">
                  <span className="text-zinc-300 text-data">{l.localidad}</span>
                  <span className="text-zinc-400 font-terminal tabular-nums text-sm">{fmt(l.cabezas)} cab.</span>
                </div>
              ))}
              <div className="px-panel py-2 text-xxs text-zinc-600">
                {receiving} consignataria{receiving === 1 ? '' : 's'} recibió hacienda de {config.display} · rueda del {date}.
              </div>
            </div>
          ) : (
            <div className="px-panel py-4 text-sm text-zinc-500">
              El detalle por localidad no está disponible para {config.display} en la última rueda. Sí se registra su
              participación provincial ({row.percentage}% de la oferta del MAG, {date}).
            </div>
          )}
        </div>

        {/* FAQ */}
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

        <ProvinceCluster province={config.name} />

        <p className="text-zinc-600 text-xxs text-center mt-6">
          Fuente: Mercado Agroganadero (ingreso por provincia), rueda del {date}. Datos agregados a provincia y
          localidad. Actualizado {lastUpdate}.
        </p>
      </div>
    </>
  )
}
