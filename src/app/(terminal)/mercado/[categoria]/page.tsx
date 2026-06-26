import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketData from '@/lib/data/market-prices.json'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { CategoryPriceHistory } from '@/components/market/CategoryPriceHistory'
import { PriceRangeTable } from '@/components/market/PriceRangeTable'
import { PriceCTA } from '@/components/PriceCTA'
import { Stat, Delta } from '@/components/ui'
import SellZoneAlertSignup from '@/components/SellZoneAlertSignup'

/* ================================================================== */
/*  CATEGORY CONFIG                                                    */
/* ================================================================== */

interface CategoryConfig {
  slug: string
  name: string
  namePlural: string
  description: string
  keywords: string[]
  definition: string
  useCases: string[]
  priceFactors: string[]
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  terneros: {
    slug: 'terneros',
    name: 'Ternero',
    namePlural: 'Terneros',
    description: 'Bovino joven destetado, generalmente de 6 a 12 meses de edad. Es la categoría de entrada para la invernada.',
    keywords: [
      'precio ternero argentina',
      'precio ternero hoy',
      'cotización ternero',
      'valor ternero por kilo',
      'precio ternero destete',
      'ternero invernada precio',
      'cuanto vale un ternero',
      'precio ternero 2026',
    ],
    definition: 'El ternero es el bovino joven desde el destete (aproximadamente 6 meses) hasta los 12 meses de edad. Es la categoría más demandada en los remates de invernada, ya que representa el ganado con mayor potencial de engorde.',
    useCases: [
      'Compra para invernada (engorde a feedlot o a campo)',
      'Reposición de rodeo de engorde',
      'Especulación de corto plazo en mercados alcistas',
    ],
    priceFactors: [
      'Peso de destete (menor peso = mayor precio por kg)',
      'Raza y genética (Angus/Hereford premium)',
      'Época del año (mayor demanda en otoño)',
      'Precio del maíz (costo de engorde)',
      'Relación de precios con novillo gordo',
    ],
  },
  novillos: {
    slug: 'novillos',
    name: 'Novillo',
    namePlural: 'Novillos',
    description: 'Bovino macho castrado de más de 2 años, listo para faena. Es la categoría de referencia del mercado (INMAG).',
    keywords: [
      'precio novillo argentina',
      'precio novillo hoy',
      'cotización novillo',
      'valor novillo gordo',
      'precio novillo liniers',
      'inmag precio novillo',
      'novillo especial precio',
      'precio novillo 2026',
    ],
    definition: 'El novillo es el bovino macho castrado destinado a faena, generalmente con más de 2 años y peso superior a 400kg. El precio del novillo (INMAG) es la referencia principal del mercado ganadero argentino.',
    useCases: [
      'Venta a frigoríficos para faena',
      'Referencia de precios para todo el mercado',
      'Exportación de carne vacuna',
    ],
    priceFactors: [
      'Peso de faena (óptimo 420-480kg)',
      'Terminación (gordura y conformación)',
      'Mercados de exportación (demanda china)',
      'Estacionalidad de la oferta',
      'Costos de faena y logística',
    ],
  },
  novillitos: {
    slug: 'novillitos',
    name: 'Novillito',
    namePlural: 'Novillitos',
    description: 'Bovino macho castrado de 1 a 2 años. Categoría intermedia entre ternero y novillo.',
    keywords: [
      'precio novillito argentina',
      'precio novillito hoy',
      'cotización novillito',
      'valor novillito por kilo',
      'novillito invernada precio',
      'precio novillito 2026',
    ],
    definition: 'El novillito es el bovino macho castrado de entre 1 y 2 años de edad, en etapa de crecimiento y engorde. Representa una categoría intermedia con mayor peso que el ternero pero sin alcanzar el peso de faena del novillo.',
    useCases: [
      'Continuación de engorde en feedlot',
      'Terminación a pasto en campos de invernada',
      'Compra para ciclo corto de engorde',
    ],
    priceFactors: [
      'Estado de terminación (flaco vs. terminado)',
      'Tiempo estimado a peso de faena',
      'Genética y frame del animal',
      'Disponibilidad de forraje y grano',
    ],
  },
  vaquillonas: {
    slug: 'vaquillonas',
    name: 'Vaquillona',
    namePlural: 'Vaquillonas',
    description: 'Bovino hembra joven que aún no ha tenido cría. Puede destinarse a faena o reproducción.',
    keywords: [
      'precio vaquillona argentina',
      'precio vaquillona hoy',
      'cotización vaquillona',
      'valor vaquillona por kilo',
      'vaquillona para cría precio',
      'vaquillona faena precio',
      'precio vaquillona 2026',
    ],
    definition: 'La vaquillona es la hembra bovina joven que aún no ha parido. Puede destinarse a engorde para faena o a reproducción como vientre. Es una categoría versátil con demanda tanto de frigoríficos como de productores de cría.',
    useCases: [
      'Engorde para faena (carne de calidad)',
      'Reposición de vientres en rodeos de cría',
      'Inicio de rodeo para nuevos productores',
    ],
    priceFactors: [
      'Destino (faena vs. cría)',
      'Estado reproductivo (preñada = mayor valor)',
      'Conformación y genética',
      'Edad y peso',
    ],
  },
  vacas: {
    slug: 'vacas',
    name: 'Vaca',
    namePlural: 'Vacas',
    description: 'Hembra bovina adulta que ha tenido al menos una cría. Puede estar en producción o destinarse a faena.',
    keywords: [
      'precio vaca argentina',
      'precio vaca hoy',
      'cotización vaca',
      'valor vaca conserva',
      'precio vaca manufactura',
      'vaca de descarte precio',
      'precio vaca 2026',
    ],
    definition: 'La vaca es la hembra bovina adulta que ha parido al menos una vez. En el mercado ganadero, las vacas se clasifican según su destino: conserva/manufactura (para faena y procesados) o vientres con cría al pie (para reproducción).',
    useCases: [
      'Faena para carne de manufactura (hamburguesas, embutidos)',
      'Venta como vientre preñado o con cría',
      'Descarte de rodeos de cría',
    ],
    priceFactors: [
      'Estado corporal y gordura',
      'Edad y dentición',
      'Destino (manufactura vs. cría)',
      'Estado reproductivo',
    ],
  },
  toros: {
    slug: 'toros',
    name: 'Toro',
    namePlural: 'Toros',
    description: 'Bovino macho entero (no castrado). Puede ser reproductor de cabaña o descarte para faena.',
    keywords: [
      'precio toro argentina',
      'precio toro hoy',
      'cotización toro',
      'valor toro reproductor',
      'toro de descarte precio',
      'toro de cabaña precio',
      'precio toro 2026',
    ],
    definition: 'El toro es el bovino macho entero destinado a reproducción o faena. Los toros de cabaña (pedigree) tienen alto valor genético, mientras que los toros de descarte se comercializan para faena.',
    useCases: [
      'Reproducción en rodeos comerciales',
      'Mejoramiento genético (toros de cabaña)',
      'Faena de toros de descarte',
    ],
    priceFactors: [
      'Pedigree y genética (toros de cabaña)',
      'Aptitud reproductiva',
      'Peso y conformación',
      'Edad y estado sanitario',
    ],
  },
}

const VALID_CATEGORIES = Object.keys(CATEGORY_CONFIG)

/* ================================================================== */
/*  METADATA                                                           */
/* ================================================================== */

export async function generateStaticParams() {
  return VALID_CATEGORIES.map((categoria) => ({ categoria }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>
}): Promise<Metadata> {
  const { categoria } = await params
  const config = CATEGORY_CONFIG[categoria]
  if (!config) return {}

  const cat = marketData.categories[categoria as keyof typeof marketData.categories]
  const price = cat?.current ?? 0
  const priceFormatted = price.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  // Question-format title matches the dominant PAA/voice query "¿cuánto vale un/una <cat>?"
  // — these carry impressions at ~0% CTR because the old declarative title didn't mirror
  // the question. Article agrees in gender (vaca/vaquillona = "una"). v1.40 CTR pass.
  const article = categoria === 'vacas' || categoria === 'vaquillonas' ? 'una' : 'un'

  return {
    title: `¿Cuánto vale ${article} ${config.name.toLowerCase()}? $${priceFormatted}/kg hoy`,
    description: `¿Cuánto vale ${article} ${config.name.toLowerCase()} en Argentina hoy? Cotiza $${priceFormatted}/kg vivo en el Mercado Agroganadero, actualizado a diario. Histórico y rango por categoría.`,
    keywords: config.keywords,
    openGraph: {
      title: `Precio ${config.name} Hoy: $${priceFormatted}/kg`,
      description: `Cotización actualizada de ${config.namePlural.toLowerCase()} en Argentina. Precio por kilo vivo, histórico y análisis del mercado ganadero.`,
      url: `https://www.consignatarias.com.ar/mercado/${categoria}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/mercado/${categoria}`,
    },
  }
}

/* ================================================================== */
/*  SCHEMA                                                             */
/* ================================================================== */

function CategoryPriceSchema({ config, price, change }: { config: CategoryConfig; price: number; change: number }) {
  const today = new Date().toISOString().split('T')[0]
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Dataset schema for data attribution
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Precio ${config.name} Argentina`,
    description: `Cotización diaria de ${config.namePlural.toLowerCase()} en el Mercado Agroganadero de Cañuelas. ${config.definition}`,
    url: `https://www.consignatarias.com.ar/mercado/${config.slug}`,
    keywords: config.keywords.join(', '),
    creator: {
      '@type': 'Organization',
      name: 'Mercado Agroganadero de Cañuelas',
    },
    variableMeasured: {
      '@type': 'PropertyValue',
      name: `Precio ${config.name}`,
      value: price,
      unitText: 'ARS/kg vivo',
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'Argentina' },
  }

  // Product + Offer schema for price rich snippets
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${config.name} - Precio por Kilo Vivo Argentina`,
    description: config.definition,
    url: `https://www.consignatarias.com.ar/mercado/${config.slug}`,
    category: 'Livestock/Cattle',
    brand: {
      '@type': 'Organization',
      name: 'Mercado Agroganadero de Cañuelas',
    },
    offers: {
      '@type': 'Offer',
      url: `https://www.consignatarias.com.ar/mercado/${config.slug}`,
      priceCurrency: 'ARS',
      price: price,
      priceValidUntil: validUntil,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: price,
        priceCurrency: 'ARS',
        unitCode: 'KGM',
        unitText: 'kg vivo',
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitCode: 'KGM',
        },
      },
      seller: {
        '@type': 'Organization',
        name: 'Mercado Agroganadero de Cañuelas',
        url: 'https://www.mercadoagroganadero.com.ar',
      },
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Variación Diaria',
        value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      },
      {
        '@type': 'PropertyValue',
        name: 'Fecha de Cotización',
        value: today,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
    </>
  )
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>
}) {
  const { categoria } = await params
  const config = CATEGORY_CONFIG[categoria]
  
  if (!config) {
    notFound()
  }

  const cat = marketData.categories[categoria as keyof typeof marketData.categories]
  const price = cat?.current ?? 0
  const change = cat?.change ?? 0
  const priceFormatted = price.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  const volume = (cat as { latestVolume?: number })?.latestVolume ?? null

  // Get INMAG for comparison
  const inmag = marketData.inmag.current
  const vsInmag = price > 0 && inmag > 0 ? ((price - inmag) / inmag * 100).toFixed(1) : null

  return (
    <>
      <CategoryPriceSchema config={config} price={price} change={change} />

      <article className="px-4 pt-4 pb-8">
        {/* Header */}
        <header className="mb-6">
          <Breadcrumb
            className="mb-2"
            items={[
              { name: 'Mercado', href: '/mercado' },
              { name: config.namePlural },
            ]}
          />

          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
            Precio {config.name} Argentina
          </h1>
          
          <p className="text-zinc-400 max-w-2xl">
            {config.description}
          </p>
        </header>

        {/* Price Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <Stat
            label={`${config.name} — kg vivo`}
            value={`$${priceFormatted}`}
            sub="/kg vivo"
            delta={change !== 0 ? change : null}
            tone="positive"
            size="text-4xl md:text-5xl font-bold"
          />

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            <div>
              Fuente: <span className="text-zinc-400">Mercado Agroganadero</span>
            </div>
            {volume && (
              <div>
                Volumen: <span className="text-zinc-400">{volume.toLocaleString('es-AR')} cab.</span>
              </div>
            )}
            {vsInmag && (
              <div className="flex items-center gap-1">
                vs INMAG: <Delta change={Number(vsInmag)} format={(abs) => abs.toFixed(1)} />
              </div>
            )}
          </div>
        </div>

        {/* Captura sticky en el pico de intención: ya vio el precio de SU categoría,
            le ofrecemos el aviso cuando entre en zona de venta (categoria pre-seteada). */}
        <div className="mb-6">
          <SellZoneAlertSignup
            categoria={categoria}
            categoriaLabel={config.name.toLowerCase()}
            page={`/mercado/${categoria}`}
          />
        </div>

        {/* Chart — evolución histórica del precio $/kg vivo de la categoría */}
        <div className="mb-8">
          <CategoryPriceHistory category={config.namePlural} currentPrice={price} />
        </div>

        {/* Observed sub-category price ranges (real MAG rueda data) */}
        <PriceRangeTable categoria={categoria} namePlural={config.namePlural} />

        <PriceCTA />

        {/* Definition */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">¿Qué es un {config.name.toLowerCase()}?</h2>
          <p className="text-zinc-400 leading-relaxed max-w-3xl">
            {config.definition}
          </p>
        </section>

        {/* Use Cases */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">¿Para qué se compran {config.namePlural.toLowerCase()}?</h2>
          <ul className="space-y-2">
            {config.useCases.map((useCase, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-400">
                <span className="text-emerald-500 mt-1">•</span>
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Price Factors */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Factores que afectan el precio</h2>
          <ul className="space-y-2">
            {config.priceFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-400">
                <span className="text-amber-500 mt-1">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Related Links */}
        <section className="border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Más precios del mercado</h2>
          <div className="flex flex-wrap gap-3">
            {VALID_CATEGORIES.filter(c => c !== categoria).map((cat) => (
              <Link
                key={cat}
                href={`/mercado/${cat}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md transition-colors"
              >
                {CATEGORY_CONFIG[cat].namePlural}
              </Link>
            ))}
            <Link
              href="/mercado/inmag"
              className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 text-sm rounded-md transition-colors"
            >
              INMAG
            </Link>
          </div>
        </section>
      </article>
    </>
  )
}
