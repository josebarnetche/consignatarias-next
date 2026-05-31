import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import existencias from '@/lib/data/existencias-bovinas.json'
import type { Auction } from '@/lib/db/schema'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { ProvinceCluster } from '@/components/seo/ProvinceCluster'

/* ============================================================
   /precios/[categoria]/[provincia] — geo × category long-tail.
   HONEST design: the reference price is NATIONAL (INMAG, formed
   at Cañuelas). This page answers "precio del novillo en Corrientes"
   with: national reference + that province's real context
   (existencias, supply share at MAG, local remates, consignatarias).
   ============================================================ */

type CategorySlug = 'novillos' | 'novillitos' | 'vaquillonas' | 'vacas' | 'toros' | 'terneros'

const CATEGORIES: Record<CategorySlug, { singular: string; title: string; promedioKg: number; remateTypes: string[] }> = {
  novillos: { singular: 'novillo', title: 'Novillo', promedioKg: 430, remateTypes: ['general', 'especial'] },
  novillitos: { singular: 'novillito', title: 'Novillito', promedioKg: 280, remateTypes: ['general', 'invernada'] },
  vaquillonas: { singular: 'vaquillona', title: 'Vaquillona', promedioKg: 320, remateTypes: ['invernada', 'cria', 'especial'] },
  vacas: { singular: 'vaca', title: 'Vaca', promedioKg: 380, remateTypes: ['general', 'especial'] },
  toros: { singular: 'toro', title: 'Toro', promedioKg: 600, remateTypes: ['reproductores', 'especial', 'general'] },
  terneros: { singular: 'ternero', title: 'Ternero', promedioKg: 180, remateTypes: ['invernada', 'cria'] },
}

const PROVINCES: Record<string, { name: string; display: string }> = {
  'buenos-aires': { name: 'BUENOS AIRES', display: 'Buenos Aires' },
  cordoba: { name: 'CORDOBA', display: 'Córdoba' },
  'santa-fe': { name: 'SANTA FE', display: 'Santa Fe' },
  'entre-rios': { name: 'ENTRE RIOS', display: 'Entre Ríos' },
  corrientes: { name: 'CORRIENTES', display: 'Corrientes' },
  'la-pampa': { name: 'LA PAMPA', display: 'La Pampa' },
  chaco: { name: 'CHACO', display: 'Chaco' },
  'san-luis': { name: 'SAN LUIS', display: 'San Luis' },
  'santiago-del-estero': { name: 'SANTIAGO DEL ESTERO', display: 'Santiago del Estero' },
  formosa: { name: 'FORMOSA', display: 'Formosa' },
  misiones: { name: 'MISIONES', display: 'Misiones' },
  neuquen: { name: 'NEUQUEN', display: 'Neuquén' },
  tucuman: { name: 'TUCUMAN', display: 'Tucumán' },
}

const ALL_CATEGORIES = Object.keys(CATEGORIES) as CategorySlug[]
const ALL_PROVINCES = Object.keys(PROVINCES)
const fmt = (n: number) => n.toLocaleString('es-AR')

export function generateStaticParams() {
  return ALL_CATEGORIES.flatMap((categoria) =>
    ALL_PROVINCES.map((provincia) => ({ categoria, provincia })),
  )
}

function isValid(categoria: string, provincia: string): boolean {
  return ALL_CATEGORIES.includes(categoria as CategorySlug) && provincia in PROVINCES
}

const auctions = rematesData as Auction[]
const existenciasMap = existencias as unknown as Record<string, { total: number; year: number } | undefined>

function getContext(categoria: CategorySlug, provincia: string) {
  const cat = CATEGORIES[categoria]
  const prov = PROVINCES[provincia]
  const priceData = (marketPrices.categories as Record<string, { current: number; prev: number; change: number }>)[categoria]
  const price = Math.round(priceData.current)
  const today = new Date().toISOString().slice(0, 10)

  // Province supply share at the MAG (origin of cattle sold at Cañuelas)
  const supply = (marketPrices.provinceEntry?.provinces as { province: string; percentage: number }[] | undefined)?.find(
    (p) => p.province === prov.name,
  )
  const existencia = existenciasMap[prov.name]?.total ?? null

  // Local remate activity for this category's relevant sale-types
  const provAuctions = auctions.filter((a) => a.province === prov.name)
  const relevant = provAuctions.filter((a) => cat.remateTypes.includes(a.type))
  const upcoming = relevant.filter((a) => a.date >= today).sort((x, y) => x.date.localeCompare(y.date))
  const consignatarias = [...new Set(provAuctions.map((a) => a.consignatariaName).filter(Boolean))] as string[]

  return { cat, prov, price, change: priceData.change, supply, existencia, upcoming, consignatarias }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; provincia: string }>
}): Promise<Metadata> {
  const { categoria, provincia } = await params
  if (!isValid(categoria, provincia)) return { title: 'No encontrado' }
  const { cat, prov, price } = getContext(categoria as CategorySlug, provincia)
  const lastUpdate = marketPrices.lastUpdate

  const title = `Precio del ${cat.singular} en ${prov.display} hoy: $${fmt(price)}/kg (INMAG)`
  const description = `Precio de referencia del kilo vivo de ${cat.singular} en ${prov.display}: $${fmt(price)}/kg (INMAG, ${lastUpdate}). El precio se forma a nivel nacional en el Mercado Agroganadero; en ${prov.display} la hacienda se comercializa en remates en origen. Próximos remates y consignatarias que operan en la provincia.`

  return {
    title,
    description,
    keywords: [
      `precio ${cat.singular} ${prov.display.toLowerCase()}`,
      `precio kilo vivo ${cat.singular} ${prov.display.toLowerCase()}`,
      `${cat.singular} ${prov.display.toLowerCase()}`,
      `remates ${cat.singular} ${prov.display.toLowerCase()}`,
      `hacienda ${prov.display.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://www.consignatarias.com.ar/precios/${categoria}/${provincia}`,
      type: 'website',
    },
    alternates: { canonical: `https://www.consignatarias.com.ar/precios/${categoria}/${provincia}` },
  }
}

export default async function PrecioCategoriaProvinciaPage({
  params,
}: {
  params: Promise<{ categoria: string; provincia: string }>
}) {
  const { categoria, provincia } = await params
  if (!isValid(categoria, provincia)) notFound()

  const { cat, prov, price, change, supply, existencia, upcoming, consignatarias } = getContext(
    categoria as CategorySlug,
    provincia,
  )
  const lastUpdate = marketPrices.lastUpdate
  const changeStr = `${change >= 0 ? '+' : ''}${change}%`
  const changeColor = change >= 0 ? '#34d399' : '#f87171'
  const promedioPeso = price * cat.promedioKg

  const faqItems = [
    {
      question: `¿Cuánto vale el kilo vivo de ${cat.singular} en ${prov.display}?`,
      answer: `El precio de referencia del kilo vivo de ${cat.singular} es $${fmt(price)} (INMAG, ${lastUpdate}). Este valor es nacional: se forma en el Mercado Agroganadero de Cañuelas. En ${prov.display}, la hacienda se opera principalmente en remates en origen, cuyo precio toma al INMAG como referencia.`,
    },
    {
      question: `¿Dónde se forma el precio del ${cat.singular} en Argentina?`,
      answer: `El precio de referencia se forma en el Mercado Agroganadero (Cañuelas, ex Liniers) y se publica como INMAG. ${prov.display}${supply ? ` aportó el ${supply.percentage}% de la hacienda operada en el MAG en la última rueda` : ' comercializa su hacienda mayormente vía remates en origen y ferias locales'}.`,
    },
    {
      question: `¿Cuánto sale un ${cat.singular} en ${prov.display}?`,
      answer: `Un ${cat.singular} promedio de ${cat.promedioKg} kg ronda los $${fmt(promedioPeso)} a precio de referencia ($${fmt(price)}/kg × ${cat.promedioKg} kg). El valor final depende de peso, terminación y de la plaza/remate donde se venda.`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema
        section={`precios/${categoria}/${provincia}`}
        sectionName={`Precio ${cat.title} en ${prov.display}`}
      />
      <FAQPageSchema items={faqItems} />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <Link href={`/precios/${categoria}`} className="hover:text-zinc-300">{cat.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{prov.display}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Precio del {cat.singular} en {prov.display} hoy:{' '}
          <span style={{ color: '#fbbf24' }}>${fmt(price)}/kg</span>
        </h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
          El precio de referencia es <strong className="text-zinc-200">nacional</strong> (INMAG, formado en el
          Mercado Agroganadero). En {prov.display} la hacienda se comercializa en remates en origen que toman al
          INMAG como referencia. Actualizado {lastUpdate} ·{' '}
          <span style={{ color: changeColor }}>{changeStr} semanal</span>.
        </p>

        {/* Reference price */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Precio de referencia nacional — {cat.title}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-terminal-border">
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">INMAG hoy</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">${fmt(price)}</div>
              <div className="text-zinc-600 text-xxs">$/kg vivo</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Variación</div>
              <div className="text-2xl font-terminal tabular-nums" style={{ color: changeColor }}>{changeStr}</div>
              <div className="text-zinc-600 text-xxs">vs semana previa</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Promedio {cat.promedioKg}kg</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">${fmt(promedioPeso)}</div>
              <div className="text-zinc-600 text-xxs">por cabeza</div>
            </div>
          </div>
        </div>

        {/* Province context */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">La hacienda en {prov.display}</div>
          <div className="px-panel py-4 text-sm text-zinc-400 leading-relaxed space-y-2">
            {existencia && (
              <p>
                Stock bovino provincial: <strong className="text-zinc-200">{fmt(existencia)} cabezas</strong>{' '}
                (existencias SENASA{existenciasMap[prov.name]?.year ? ` ${existenciasMap[prov.name]!.year}` : ''}).
              </p>
            )}
            {supply && (
              <p>
                Aporte a la oferta del Mercado Agroganadero en la última rueda:{' '}
                <strong className="text-zinc-200">{supply.percentage}%</strong> de la hacienda operada.
              </p>
            )}
            <p>
              El precio del {cat.singular} no se fija por provincia: la referencia es el INMAG nacional. Lo que
              cambia en {prov.display} es la <strong className="text-zinc-200">plaza</strong> — qué consignatarias
              operan, con qué frecuencia rematan y a qué compradores llegan.
            </p>
          </div>
        </div>

        {/* Local remates */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">
            Próximos remates de {cat.title.toLowerCase()} en {prov.display}
          </div>
          {upcoming.length > 0 ? (
            <div className="divide-y divide-terminal-border">
              {upcoming.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  href={`/remates/${a.id}`}
                  className="px-panel py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <span className="text-zinc-300 text-data truncate">
                    {a.date} · {a.consignatariaName || a.location}
                  </span>
                  <span className="text-zinc-500 text-xxs font-terminal uppercase">{a.type}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-panel py-4 text-sm text-zinc-500">
              No hay remates de {cat.title.toLowerCase()} programados en {prov.display} en este momento.{' '}
              <Link href={`/remates/${provincia}`} className="text-amber-500 hover:text-amber-400">
                Ver todos los remates en {prov.display} →
              </Link>
            </div>
          )}
        </div>

        {/* Consignatarias operating in province */}
        {consignatarias.length > 0 && (
          <div className="terminal-panel mb-6">
            <div className="terminal-panel-header">Consignatarias que operan en {prov.display}</div>
            <div className="px-panel py-4 flex flex-wrap gap-2">
              {consignatarias.slice(0, 12).map((name) => (
                <span key={name} className="text-xxs bg-zinc-800 px-2 py-1 rounded text-zinc-300">{name}</span>
              ))}
            </div>
          </div>
        )}

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

        <ProvinceCluster province={prov.name} />

        <p className="text-zinc-600 text-xxs text-center mt-6">
          Fuente: INMAG (Mercado Agroganadero) · existencias SENASA · Actualizado {lastUpdate}.
        </p>
      </div>
    </>
  )
}
