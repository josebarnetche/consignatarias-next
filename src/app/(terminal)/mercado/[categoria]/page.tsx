import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import marketData from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import Breadcrumb from '@/components/ui/Breadcrumb'
import VentaLeadCapture from '@/components/leads/VentaLeadCapture'
import { CategoryPriceHistory } from '@/components/market/CategoryPriceHistory'
import LoginGate from '@/components/LoginGate'
import { PriceRangeTable } from '@/components/market/PriceRangeTable'
import { PriceCTA } from '@/components/PriceCTA'
import { OfrecerInforme } from '@/components/productos/OfrecerInforme'
import { Stat, Delta } from '@/components/ui'
import SellZoneAlertSignup from '@/components/SellZoneAlertSignup'
import SellZoneBadge from '@/components/SellZoneBadge'
import { FAQPageSchema, DefinedTermSetSchema, SpeakableSchema, DatasetSchema } from '@/components/seo/JsonLd'
import { DESCARGA_PRECIOS, FUENTE_MAG, LICENCIA_PROPIA } from '@/lib/seo/schemas'
import { FaqList } from '@/components/seo/FaqList'
import { PRECIO_A_VR } from '@/components/precios/BandaVrCategoria'

export const revalidate = 86400 // daily rebuild via Vercel (mirrors scraper cadence)

// es-AR thousands formatting for the live number, reused across SERP + schemas + copy
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

// Gender-agreeing article: vaca/vaquillona = "una", the rest = "un". Same rule as generateMetadata.
const articleFor = (slug: string) => (slug === 'vacas' || slug === 'vaquillonas' ? 'una' : 'un')

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

const fmtTitulo = (n: number) => n.toLocaleString('es-AR')

/** Title, description y H1 por categoría. Cortos (≤60 / ≤155) y con el dato concreto. */
function tituloMercado(categoria: string, config: CategoryConfig, price: number) {
  if (categoria === 'toros') {
    return {
      title: `Precio del toro hoy: $${fmtTitulo(price)}/kg vivo y cuánto vale uno`,
      description: `Cuánto vale un toro hoy: $${fmtTitulo(price)} por kilo vivo en el Mercado Agroganadero; uno de 600 kg ronda los $${fmtTitulo(price * 600)}. Qué mueve el precio y cómo vino el año.`,
      h1: `Precio del toro hoy: $${fmtTitulo(price)}/kg vivo`,
    }
  }
  if (categoria === 'terneros') {
    return {
      title: 'Precio del ternero en el año: la zafra y cuándo vender',
      description: 'En qué meses baja y sube el precio del ternero, por qué la zafra de marzo a mayo lo aprieta y dónde se forma el precio de verdad: los remates de invernada.',
      h1: 'Terneros: cómo se mueve el precio en el año',
    }
  }
  return {
    title: `${config.namePlural}: evolución del precio y estacionalidad`,
    description: `Cómo se movió el precio del ${config.name.toLowerCase()} en el Mercado Agroganadero, qué lo mueve y en qué meses suele subir o bajar. Con el precio de hoy.`,
    h1: `${config.namePlural}: evolución del precio y estacionalidad`,
  }
}

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
  const price = Math.round(cat?.current ?? 0)

  // Esta página es la de histórico y estacionalidad. "Precio del X hoy" lo
  // responde /precios/[categoria] (la canónica, con la banda de lo que se pagó).
  // Excepción: TOROS. Search Console (28 días a sep-2026) muestra que /mercado/toros
  // es la que gana "precio del toro" (3.746 impresiones, posición 4,7) y /precios/toros
  // casi no aparece: esa se queda con la intención de precio.
  const { title, description } = tituloMercado(categoria, config, price)

  return {
    title,
    description,
    keywords: config.keywords,
    openGraph: {
      images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
      title,
      description,
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

// Dataset del precio de la categoría. Antes iba además un Product/Offer con seller
// MAG, InStock y NewCondition: el sitio no vende hacienda (markup engañoso, riesgo de
// acción manual), y su "Variación Diaria" contradecía el texto ("semanal"). El
// ternero es una estimación propia (el MAG no opera terneros): no se atribuye al MAG.
function CategoryPriceSchema({ config, price }: { config: CategoryConfig; price: number }) {
  const esEstimacion = config.slug === 'terneros'
  return (
    <DatasetSchema
      name={esEstimacion ? `Precio ${config.name} Argentina — estimación de referencia` : `Precio ${config.name} Argentina`}
      description={`Cotización diaria de ${config.namePlural.toLowerCase()}${esEstimacion ? ' (estimación derivada del INMAG)' : ' en el Mercado Agroganadero de Cañuelas'}. ${config.definition}`}
      url={`https://www.consignatarias.com.ar/mercado/${config.slug}`}
      keywords={config.keywords}
      dateModified={INMAG_DATE}
      temporalCoverage={INMAG_DATE}
      variableMeasured={{ name: `Precio ${config.name}`, unitText: 'ARS/kg vivo', value: price, observationDate: INMAG_DATE }}
      distribution={[DESCARGA_PRECIOS]}
      {...(esEstimacion ? { license: LICENCIA_PROPIA } : { license: null, fuente: FUENTE_MAG })}
    />
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

  // Live-number citability layer — everything derived from CATEGORY_CONFIG + the JSON.
  const lastUpdate = marketData.lastUpdate
  const article = articleFor(categoria)
  const changeStr = `${change >= 0 ? '+' : ''}${change}%`
  const nameLower = config.name.toLowerCase()
  const pluralLower = config.namePlural.toLowerCase()
  // Answer-first sentence: the exact number + date up front, optimized for featured snippet / voz.
  // El ternero no es un precio observado (INMAG × 1,10: el MAG no opera terneros).
  const esEstimado = categoria === 'terneros'
  const answerFirst = esEstimado
    ? `El Mercado Agroganadero no opera terneros, así que no hay un precio observado ahí. Nuestra estimación de hoy es $${fmt(price)} por kilo vivo (INMAG × 1,10). Actualizado el ${lastUpdate}.`
    : `Hoy ${article} ${nameLower} cotiza a $${fmt(price)} por kilo vivo en el Mercado Agroganadero (${changeStr} semanal). Actualizado el ${lastUpdate}.`
  const slugVr = PRECIO_A_VR[categoria]

  // FAQ — questions mirror the head-query strings; answers lead with the live number + date.
  const faqItems = [
    {
      question: `¿Cuánto vale ${article} ${nameLower} hoy en Argentina?`,
      answer: esEstimado
        ? `${answerFirst} El precio real del ternero lo marcan los remates de invernada.`
        : `${answerFirst} Precio observado del Mercado Agroganadero de Cañuelas, en pesos por kilo vivo.`,
    },
    {
      question: `¿Qué determina el precio ${article === 'una' ? 'de la' : 'del'} ${nameLower}?`,
      answer: `El precio ${article === 'una' ? 'de la' : 'del'} ${nameLower} lo determinan: ${config.priceFactors.join('; ')}. Hoy cotiza $${fmt(price)}/kg vivo (${changeStr} semanal, ${lastUpdate}).`,
    },
    {
      question: `¿Para qué se ${article === 'una' ? 'compran' : 'compran'} ${pluralLower}?`,
      answer: `Principales destinos: ${config.useCases.join('; ')}. Referencia de precio actual: $${fmt(price)}/kg vivo (${lastUpdate}).`,
    },
    {
      question: `¿Qué es ${article} ${nameLower}?`,
      answer: config.definition,
    },
  ]

  // DefinedTerm — the category entity as a citable, resolvable definition with the live price.
  const definedTerms = [
    {
      name: config.name,
      description: `${config.definition} Precio de referencia hoy: $${fmt(price)}/kg vivo en el Mercado Agroganadero (${changeStr} semanal, ${lastUpdate}).`,
      url: `https://www.consignatarias.com.ar/mercado/${categoria}`,
    },
  ]

  return (
    <>
      <CategoryPriceSchema config={config} price={price} />
      <FAQPageSchema items={faqItems} />
      <DefinedTermSetSchema
        name={`Precio ${config.name} — Argentina`}
        description={`Definición y precio de referencia ${article === 'una' ? 'de la' : 'del'} ${nameLower} en el mercado ganadero argentino, actualizado a diario.`}
        url={`https://www.consignatarias.com.ar/mercado/${categoria}`}
        terms={definedTerms}
      />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/mercado/${categoria}`}
        headline={answerFirst}
      />

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
            {tituloMercado(categoria, config, Math.round(price)).h1}
          </h1>

          {/* Answer-first: la respuesta a "¿cuánto sale/cuesta ...?" en la 1ª oración,
              con el número vivo + fecha. Citable (featured snippet / voz). */}
          <p className="speakable-content text-zinc-200 text-base md:text-lg leading-relaxed max-w-2xl mb-2">
            {answerFirst}
          </p>

          <p className="text-zinc-400 max-w-2xl">
            {config.description}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {/* En toros esta página ES la de "precio de hoy" (ver tituloMercado). */}
            {categoria !== 'toros' && (
              <Link href={`/precios/${categoria}`} className="font-medium text-accent hover:underline">
                Precio {article === 'una' ? 'de la' : 'del'} {nameLower} hoy →
              </Link>
            )}
            <Link href={slugVr ? `/vr/${slugVr}` : '/vr'} className="text-accent hover:underline">
              {slugVr ? `A cuánto se vendió ${article === 'una' ? 'la' : 'el'} ${nameLower}, por peso →` : 'Lo que realmente se pagó, por categoría y peso →'}
            </Link>
          </p>
        </header>

        {/* Price Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <Stat
            label={esEstimado ? `${config.name} — estimado, kg vivo` : `${config.name} — kg vivo`}
            value={`$${priceFormatted}`}
            sub="/kg vivo"
            delta={change !== 0 ? change : null}
            tone="positive"
            size="text-4xl md:text-5xl font-bold"
          />

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            <div>
              {esEstimado ? (
                <>Estimación: <span className="text-zinc-400">INMAG × 1,10 — el Mercado Agroganadero no opera terneros; no es un precio observado</span></>
              ) : (
                <>Fuente: <span className="text-zinc-400">Mercado Agroganadero</span></>
              )}
            </div>
            {volume && (
              <div>
                Volumen: <span className="text-zinc-400">{volume.toLocaleString('es-AR')} cab.</span>
              </div>
            )}
            {vsInmag && !esEstimado && (
              <div className="flex items-center gap-1">
                vs INMAG: <Delta change={Number(vsInmag)} format={(abs) => abs.toFixed(1)} />
              </div>
            )}
          </div>
        </div>

        {/* Semáforo de venta (estado de hoy) + captura de la alerta (avisame cuando
            cambie): el par señal-gratis + retorno. Pico de intención, debajo del precio. */}
        <div className="mb-4">
          <SellZoneBadge categoriaLabel={config.name.toLowerCase()} className="w-full sm:w-auto sm:inline-block" />
        </div>
        <div className="mb-6">
          <SellZoneAlertSignup
            categoria={categoria}
            categoriaLabel={config.name.toLowerCase()}
            page={`/mercado/${categoria}`}
          />
        </div>

        {/* Chart — evolución histórica del precio $/kg vivo de la categoría */}
        <div className="mb-8">
          <LoginGate feature="El histórico de la categoría" minHeight={320}>
          <CategoryPriceHistory category={config.namePlural} currentPrice={price} />
          </LoginGate>
        </div>

        {/* Observed sub-category price ranges (real MAG rueda data) */}
        <PriceRangeTable categoria={categoria} namePlural={config.namePlural} />

        {/* El parte semanal, después del precio, el semáforo y los rangos observados: la
            página ya entregó su valor. Esta familia tenía alerta y captura de venta pero
            ningún puente al producto de mercado (medido 31-ago: /informes/parte-semanal, 0
            sesiones). Regla de OfrecerInforme: lo que la pantalla no da, y qué sigue gratis. */}
        <div className="mb-6">
          <OfrecerInforme
            producto="parte-semanal-mercado"
            desde={`/mercado/${categoria}`}
            titulo={`¿Lo del ${config.name.toLowerCase()} esta semana fue señal o ruido?`}
            loQueAgrega={[
              'El cierre de la semana en PDF, cada lunes, con la lectura de si el movimiento fue señal o ruido.',
              `Dónde quedó el ${config.name.toLowerCase()} contra su propio promedio, y qué categorías se apartaron del suyo.`,
              'Once años de contexto y los remates de los próximos siete días.',
            ]}
            gratisAca="El precio del día, el semáforo, los rangos observados y la alerta de zona de venta de esta página son gratis y van a seguir siéndolo."
          />
        </div>

        <PriceCTA />

        {/* Definition */}
        {/* Captura de venta comisionista — el visitante mira el precio de esta
            categoría → intención de venderla. presetCategory oculta el selector. */}
        <section className="mb-8">
          <VentaLeadCapture source={`mercado:${categoria}`} presetCategory={categoria} />
        </section>

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
                <span className="text-accent mt-1">•</span>
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
                <span className="text-accent mt-1">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Las mismas preguntas del FAQPageSchema, visibles. */}
        <FaqList items={faqItems} className="mb-8" />

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
              className="px-3 py-1.5 bg-sky-900/50 hover:bg-sky-800/50 text-accent text-sm rounded-md transition-colors"
            >
              INMAG
            </Link>
          </div>
        </section>
      </article>
    </>
  )
}
