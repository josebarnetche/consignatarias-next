import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { BreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import {
  formatDateShort,
  getCity,
  getProvinceCode,
  TYPE_LABELS,
  TYPE_COLORS,
  CAT_LABELS,
} from '@/lib/ui/tokens'
import { EmptyState } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  TYPE CONFIGURATION                                                  */
/* ------------------------------------------------------------------ */

interface TypeConfig {
  slug: string
  name: string          // matches remates.json type field
  displayName: string   // title case for display
  intro: string         // SEO intro paragraph
  faqs: Array<{ question: string; answer: string }>
}

const TYPES: TypeConfig[] = [
  {
    slug: 'invernada',
    name: 'invernada',
    displayName: 'Invernada',
    intro: 'Los remates de invernada son subastas especializadas en hacienda destinada al engorde. Se comercializan principalmente terneros, novillitos y vaquillonas que serán llevados a campos de invernada para alcanzar el peso de faena. Estos remates son fundamentales en la cadena ganadera argentina, conectando a criadores del norte (NEA, NOA) con invernadores del centro y sur del país (Buenos Aires, Córdoba, La Pampa, Santa Fe). La invernada requiere hacienda con buena genética, sanidad certificada y potencial de ganancia de peso. Las consignatarias especializadas ofrecen lotes uniformes, clasificados por categoría, peso y procedencia. Los principales mercados de invernada operan en provincias con disponibilidad de pasturas y granos para el engorde. La época de mayor actividad es otoño (marzo-mayo), cuando se comercializan los terneros de la parición de primavera.',
    faqs: [
      { question: '¿Qué es un remate de invernada?', answer: 'Un remate de invernada es una subasta de hacienda destinada al engorde. Se venden terneros, novillitos y vaquillonas que serán llevados a campos de invernada para alcanzar el peso de faena, generalmente entre 400-500 kg.' },
      { question: '¿Cuál es la mejor época para comprar invernada?', answer: 'La principal temporada es otoño (marzo-mayo), cuando se destetan los terneros de la parición de primavera. También hay oferta en primavera (septiembre-noviembre) con hacienda liviana.' },
      { question: '¿Qué categorías se venden en remates de invernada?', answer: 'Las categorías principales son: terneros/as (150-200 kg), novillitos/vaquillonas (200-300 kg) y animales livianos en general. La hacienda se clasifica por peso, calidad y procedencia.' },
    ],
  },
  {
    slug: 'cria',
    name: 'cria',
    displayName: 'Cría',
    intro: 'Los remates de cría ofrecen hacienda para la producción de terneros: vacas con cría al pie, vacas preñadas, vaquillonas para servicio y toros reproductores. Son fundamentales para productores que buscan formar o reponer su rodeo de madres. La cría es la base de la ganadería argentina, concentrada principalmente en el norte del país (Corrientes, Chaco, Formosa, Santiago del Estero) y en zonas marginales donde la invernada no es viable. Los remates de cría permiten adquirir genética probada, con información sobre origen, sanidad y antecedentes productivos. Las vacas con cría al pie son especialmente valoradas porque demuestran fertilidad comprobada. Las consignatarias especializadas garantizan trazabilidad y documentación sanitaria completa. La primavera es la época de mayor actividad, coincidiendo con la preparación de los rodeos para el servicio de verano.',
    faqs: [
      { question: '¿Qué se vende en un remate de cría?', answer: 'Se comercializan vacas con cría al pie, vacas preñadas, vaquillonas para servicio, vientres vacíos y toros reproductores. Es hacienda destinada a la producción de terneros.' },
      { question: '¿Cuándo conviene comprar hacienda de cría?', answer: 'La mejor época es primavera (septiembre-noviembre) para preparar el rodeo antes del servicio de verano. También hay oferta en otoño con vacas que ya tienen preñez confirmada.' },
      { question: '¿Qué información es importante en un remate de cría?', answer: 'Es clave conocer: estado reproductivo (vacía, preñada, con cría), edad, raza, sanidad (brucelosis, tuberculosis), origen y antecedentes productivos del rodeo.' },
    ],
  },
  {
    slug: 'general',
    name: 'general',
    displayName: 'Generales',
    intro: 'Los remates generales o ferias generales son las subastas más tradicionales del campo argentino. Ofrecen todas las categorías de hacienda: terneros, novillos, vaquillonas, vacas, toros y hasta animales de descarte. Son el punto de encuentro semanal entre productores, consignatarios y compradores de una región. Las ferias generales operan durante todo el año en localidades de todo el país, adaptándose a los ciclos productivos de cada zona. Funcionan como termómetro del mercado ganadero, reflejando la oferta y demanda local. Las consignatarias tradicionales organizan estas ferias con regularidad semanal o quincenal, ofreciendo un servicio integral que incluye pesaje, clasificación, documentación y financiación. Para los productores pequeños y medianos, las ferias generales son la principal vía de comercialización de su hacienda.',
    faqs: [
      { question: '¿Qué es una feria general de hacienda?', answer: 'Es un remate donde se venden todas las categorías de ganado: terneros, novillos, vaquillonas, vacas, toros y descarte. Es la subasta tradicional del campo argentino, donde se encuentra oferta variada.' },
      { question: '¿Con qué frecuencia se hacen ferias generales?', answer: 'Las ferias generales suelen realizarse semanalmente o quincenalmente en cada localidad. Algunas plazas importantes tienen ferias todos los jueves o viernes del año.' },
      { question: '¿Quién puede participar en una feria general?', answer: 'Cualquier productor puede consignar hacienda y cualquier comprador puede participar. Se requiere inscripción previa y documentación sanitaria (guía de traslado, RENSPA).' },
    ],
  },
  {
    slug: 'especial',
    name: 'especial',
    displayName: 'Especiales',
    intro: 'Los remates especiales son eventos de alto nivel que reúnen hacienda seleccionada de cabañas y establecimientos destacados. Se caracterizan por ofrecer genética superior, animales de pedigrí, reproductores elite y lotes premium. Estos remates suelen realizarse en fechas específicas del calendario ganadero, coincidiendo con exposiciones, ferias o aniversarios de cabañas. La hacienda ofrecida cuenta con información genética detallada, evaluaciones productivas (DEPs) y garantías de calidad. Los remates especiales atraen a compradores de todo el país que buscan mejorar la genética de sus rodeos. Las principales razas comercializadas incluyen Angus, Hereford, Braford, Brangus y sus cruzas. Las consignatarias y cabañas organizadoras invierten en marketing, catálogos detallados y transmisiones en vivo para estos eventos.',
    faqs: [
      { question: '¿Qué diferencia un remate especial de uno general?', answer: 'Los remates especiales ofrecen hacienda seleccionada de alta calidad genética, generalmente de cabañas reconocidas. Incluyen información detallada (pedigrí, DEPs) y se realizan en fechas específicas.' },
      { question: '¿Qué tipo de hacienda se vende en remates especiales?', answer: 'Se comercializan toros padres, vaquillonas y vacas de pedigrí, reproductores elite, embriones y semen. También lotes de invernada premium de cabañas.' },
      { question: '¿Cuándo se realizan los remates especiales?', answer: 'Coinciden con exposiciones rurales (Palermo, Corrientes), aniversarios de cabañas, o fechas fijas del calendario (primavera para toros, otoño para vientres).' },
    ],
  },
  {
    slug: 'reproductores',
    name: 'reproductores',
    displayName: 'Reproductores',
    intro: 'Los remates de reproductores concentran la oferta de toros, padrillos y vientres de alta genética. Son eventos fundamentales para la mejora de los rodeos argentinos, donde cabañas y establecimientos de cría ofrecen su mejor producción. Los toros son la inversión más importante de un establecimiento ganadero, ya que un reproductor puede dejar cientos de crías durante su vida útil. Estos remates incluyen información genética completa: pedigrí, DEPs (Diferencias Esperadas de Progenie), circunferencia escrotal, aptitud reproductiva y evaluaciones fenotípicas. Las principales razas comercializadas son Angus, Hereford, Braford, Brangus, Limousin y Charolais. Los remates de reproductores se concentran en primavera (septiembre-noviembre), previo al servicio de verano, y son transmitidos en vivo para alcanzar compradores de todo el país.',
    faqs: [
      { question: '¿Qué son los DEPs en un remate de reproductores?', answer: 'Los DEPs (Diferencias Esperadas de Progenie) son valores genéticos que predicen cómo serán las crías de un reproductor. Incluyen peso al nacer, facilidad de parto, peso al destete y otras características productivas.' },
      { question: '¿Cuándo es la temporada de remates de toros?', answer: 'La principal temporada es primavera (septiembre-noviembre), antes del servicio de verano. Algunos remates se realizan en otoño para servicio de invierno.' },
      { question: '¿Qué garantías incluyen los reproductores en remate?', answer: 'Los reproductores vendidos en remate incluyen: certificado de aptitud reproductiva, revisación veterinaria, certificado de pureza racial (si corresponde) y garantía de fertilidad.' },
    ],
  },
]

const auctions = rematesData as Auction[]
const TODAY = new Date().toISOString().slice(0, 10)

type Props = { params: Promise<{ tipo: string }> }

function getTypeConfig(slug: string): TypeConfig | undefined {
  return TYPES.find(t => t.slug === slug)
}

export async function generateStaticParams() {
  return TYPES.map(t => ({ tipo: t.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo } = await params
  const config = getTypeConfig(tipo)
  if (!config) return {}

  const upcoming = auctions.filter(
    a => a.type === config.name && a.date >= TODAY && a.status === 'scheduled'
  )
  const totalHeads = upcoming.reduce((s, r) => s + (r.estimatedHeads ?? 0), 0)

  const title = `Remates de ${config.displayName} en Argentina — Calendario ${new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`
  const description = `${upcoming.length} remates de ${config.name} próximos con ${totalHeads.toLocaleString('es-AR')} cabezas estimadas. Calendario actualizado de subastas de ${config.name} en todo el país.`

  return {
    title,
    description,
    keywords: [
      `remates ${config.name}`,
      `remates de ${config.name}`,
      `subastas ${config.name}`,
      `feria ${config.name}`,
      `hacienda ${config.name}`,
      `comprar ${config.name}`,
      `calendario remates ${config.name}`,
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_AR',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/tipo/${config.slug}`,
    },
  }
}

function AuctionCard({ auction }: { auction: Auction }) {
  const slug = getCanonicalSlug(auction.consignatariaName)

  return (
    <Link
      href={slug ? `/consignatarias/${slug}` : '#'}
      className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono uppercase px-1.5 py-0.5 rounded border ${TYPE_COLORS[auction.type] ?? 'border-zinc-600 text-zinc-400'}`}>
              {TYPE_LABELS[auction.type] ?? auction.type}
            </span>
            {auction.mainCategory && (
              <span className="text-xs text-zinc-500">
                {CAT_LABELS[auction.mainCategory]}
              </span>
            )}
          </div>
          <h3 className="text-white font-medium truncate">{auction.consignatariaName}</h3>
          <p className="text-sm text-zinc-400">{getCity(auction.location)}, {getProvinceCode(auction.province)}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-white">{formatDateShort(auction.date)}</div>
          {auction.estimatedHeads && (
            <div className="text-xs text-zinc-500">{auction.estimatedHeads.toLocaleString('es-AR')} cab.</div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function TipoRematesPage({ params }: Props) {
  const { tipo } = await params
  const config = getTypeConfig(tipo)
  if (!config) notFound()

  const upcoming = auctions
    .filter(a => a.type === config.name && a.date >= TODAY && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalHeads = upcoming.reduce((s, r) => s + (r.estimatedHeads ?? 0), 0)
  const provinces = [...new Set(upcoming.map(a => a.province))].length

  const breadcrumbs = [
    { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
    { name: 'Remates', url: 'https://www.consignatarias.com.ar' },
    { name: `Remates de ${config.displayName}`, url: `https://www.consignatarias.com.ar/remates/tipo/${config.slug}` },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQPageSchema items={config.faqs} />

      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span>/</span>
            <span className="text-zinc-300">Remates de {config.displayName}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Remates de {config.displayName} en Argentina
          </h1>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 md:gap-8 text-sm">
            <div>
              <span className="text-zinc-500">Próximos remates:</span>{' '}
              <span className="text-white font-medium">{upcoming.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Cabezas estimadas:</span>{' '}
              <span className="text-white font-medium">{totalHeads.toLocaleString('es-AR')}</span>
            </div>
            <div>
              <span className="text-zinc-500">Provincias:</span>{' '}
              <span className="text-white font-medium">{provinces}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* SEO Intro */}
        <section className="mb-8">
          <p className="text-zinc-400 leading-relaxed">{config.intro}</p>
        </section>

        {/* Auction List */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Próximos remates de {config.name}
          </h2>
          
          {upcoming.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.slice(0, 30).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="martillo"
              title={`No hay remates de ${config.name} programados próximamente.`}
              cta={
                <Link href="/" className="text-sky-500 hover:text-sky-400 inline-block">
                  Ver todos los remates →
                </Link>
              }
            />
          )}

          {upcoming.length > 30 && (
            <div className="mt-6 text-center">
              <Link 
                href={`/?tipo=${config.name}`}
                className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-400"
              >
                Ver todos los {upcoming.length} remates de {config.name} →
              </Link>
            </div>
          )}
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Preguntas frecuentes sobre remates de {config.name}
          </h2>
          <div className="space-y-4">
            {config.faqs.map((faq, i) => (
              <details 
                key={i}
                className="group bg-zinc-900/50 border border-zinc-800 rounded-lg"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50">
                  <span className="font-medium text-white">{faq.question}</span>
                  <svg 
                    className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-zinc-400">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-links: By Province */}
        {(() => {
          // Get provinces with 3+ auctions of this type
          const provinceCounts = upcoming.reduce((acc, a) => {
            acc[a.province] = (acc[a.province] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const topProvinces = Object.entries(provinceCounts)
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
          
          if (topProvinces.length === 0) return null
          
          return (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-white mb-4">
                Remates de {config.name} por provincia
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {topProvinces.map(([province, count]) => {
                  const provinceSlug = province.toLowerCase().replace(/\s+/g, '-')
                  return (
                    <Link
                      key={province}
                      href={`/remates/${provinceSlug}/${config.slug}`}
                      className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-zinc-300">{province}</span>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {count} remates
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* Other Types */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Otros tipos de remate
          </h2>
          <div className="flex flex-wrap gap-2">
            {TYPES.filter(t => t.slug !== config.slug).map(t => (
              <Link
                key={t.slug}
                href={`/remates/tipo/${t.slug}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300 transition-colors"
              >
                {t.displayName}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
