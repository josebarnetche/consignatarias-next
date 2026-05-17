import type { Metadata } from 'next'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import {
  formatDateShort,
  getCity,
  TYPE_LABELS,
  TYPE_COLORS,
  CAT_LABELS,
} from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  PROVINCE MAPPING                                                    */
/* ------------------------------------------------------------------ */

interface ProvinceConfig {
  slug: string
  name: string        // uppercase, matches remates.json
  displayName: string // title case for display
  intro: string       // SEO intro paragraph
}

const PROVINCES: ProvinceConfig[] = [
  {
    slug: 'buenos-aires',
    name: 'BUENOS AIRES',
    displayName: 'Buenos Aires',
    intro: 'Buenos Aires es la principal provincia ganadera de Argentina, concentrando la mayor cantidad de remates de hacienda del país. Las principales plazas de remate incluyen San Nicolás de los Arroyos, Carhué, Rauch, Salliquelló, Saladillo, Olavarría, Tandil, Coronel Brandsen, Ayacucho, Las Flores y Chivilcoy, entre muchas otras localidades distribuidas en toda la provincia. Consignatarias de larga trayectoria como Sáenz Valiente Bullrich y Cía., Colombo y Magliano, Pedro Noel Irey, Ganadera Salliquelló, Sivero y Cía., Martín G. Lalor, Campos y Ganados, Darwash, Jauregui Lorda, Ferias Rauch, Monasterio Tattersall, Wallace Hnos. y muchas más operan regularmente en las ferias bonaerenses. La provincia se destaca por sus remates de invernada, subastas especiales de reproductores y ferias generales de hacienda. Buenos Aires también es sede de los principales eventos del sector como Expoagro y la Exposición Rural de Palermo, que convocan a consignatarias y productores de todo el país. La diversidad de categorías ofrecidas — terneros, novillos, vaquillonas, vacas y toros — refleja la importancia de la ganadería bonaerense en el mercado nacional.',
  },
  {
    slug: 'cordoba',
    name: 'CORDOBA',
    displayName: 'Córdoba',
    intro: 'Córdoba es una de las provincias con mayor actividad ganadera del centro de Argentina, con una importante tradición en remates de hacienda. Las principales plazas se concentran en Río Cuarto, Marcos Juárez, Sampacho, Huinca Renancó y San Basilio, localidades que funcionan como centros de comercialización regional. Entre las consignatarias más activas se encuentran Bressan y Cía., Eduardo A. Travaglia y Cía., Alfredo Sebastián Mondino, Agricultores Federados Argentinos y Ferias Rodeo Huinca. La provincia se caracteriza por una importante oferta de remates de invernada, ideales para el engorde de hacienda en los campos cordobeses, así como subastas generales y especiales que incluyen reproductores de calidad. La cercanía con otras provincias ganaderas como San Luis, La Pampa y Santa Fe genera una dinámica comercial intensa, con compradores y vendedores que participan de las ferias cordobesas regularmente. Córdoba combina la tradición ganadera del sur provincial con la innovación productiva, ofreciendo un calendario activo durante todo el año.',
  },
  {
    slug: 'san-luis',
    name: 'SAN LUIS',
    displayName: 'San Luis',
    intro: 'San Luis ocupa un lugar destacado en la ganadería del centro-oeste argentino, con un calendario sostenido de remates a lo largo del año. Las principales plazas de remate se ubican en Villa Mercedes — la segunda ciudad de la provincia y epicentro ganadero —, Buena Esperanza, La Toma y la ciudad de San Luis. Las consignatarias con mayor presencia en la provincia incluyen a Eduardo A. Travaglia y Cía., Alfredo Sebastián Mondino y Bressan y Cía., que operan tanto en San Luis como en Córdoba. La actividad ganadera puntana se concentra principalmente en remates de invernada y ferias generales, con una oferta variada que incluye terneros, novillos, vaquillonas y reproductores. La ubicación geográfica de San Luis, en la transición entre la pampa húmeda y el oeste semiárido, le otorga características productivas únicas. Villa Mercedes, en particular, es reconocida como una de las plazas ganaderas más importantes del interior del país, con ferias que atraen a compradores de múltiples provincias. Los remates especiales y de reproductores complementan la oferta regular, posicionando a San Luis como un actor relevante en el comercio ganadero nacional.',
  },
  {
    slug: 'santa-fe',
    name: 'SANTA FE',
    displayName: 'Santa Fe',
    intro: 'Santa Fe es una provincia clave en la ganadería argentina, combinando producción tambera y cárnica con un activo calendario de remates. Las plazas de remate se distribuyen en localidades como Helvecia, Felicia, Totoras, Rafaela, Esperanza, Providencia, San Cristóbal, Cañada Rosquín, Emilia, Pilar, Centeno, Progreso, Suardi, Armstrong, Romang y Santo Domingo, entre otras. Entre las consignatarias destacadas operan la Cooperativa Guillermo Lehmann — con sede en Rafaela y una de las más tradicionales de la zona —, Colombo y Colombo, Agricultores Federados Argentinos, Pepa Knubel y Ferrero, y la Sociedad Rural de Rafaela. Santa Fe también es sede de Agroactiva, una de las ferias agropecuarias más importantes del país, y del mercado Rosgan que opera desde la Bolsa de Comercio de Rosario. La provincia se destaca por remates de invernada y ferias generales, con una importante participación de cooperativas que fortalecen el modelo asociativo. La zona centro-norte santafesina es particularmente activa, con ferias semanales que comercializan hacienda de cría e invernada durante todo el año.',
  },
  {
    slug: 'chaco',
    name: 'CHACO',
    displayName: 'Chaco',
    intro: 'Chaco es una de las principales provincias ganaderas del norte argentino (NEA), con una importante tradición en la cría de ganado bovino. Los remates se realizan en localidades como Machagai, la capital chaqueña, Margarita Belén y la Sociedad Rural de Villa Ángela. Entre las consignatarias y organizaciones con presencia activa se destacan Ivan L. O\'Farrell Consignataria, Tradición Ganadera / Porro, la Sociedad Rural del Chaco y el Ministerio de Producción del Chaco, que impulsa eventos y ferias ganaderas para el desarrollo del sector. La ganadería chaqueña se orienta principalmente a la cría, aprovechando los pastizales naturales y los campos del Impenetrable para la producción de terneros que luego se destinan a la invernada en otras provincias. Los remates generales son los más frecuentes, con una oferta que incluye categorías mixtas. La provincia ha experimentado un crecimiento sostenido en su stock ganadero y en la calidad genética de la hacienda ofrecida, lo que se refleja en un calendario de remates cada vez más activo y diversificado.',
  },
  {
    slug: 'entre-rios',
    name: 'ENTRE RIOS',
    displayName: 'Entre Ríos',
    intro: 'Entre Ríos es una provincia con fuerte tradición ganadera, ubicada en la Mesopotamia argentina entre los ríos Paraná y Uruguay. Las principales plazas de remate se encuentran en Villaguay, Rosario del Tala, Hasenkamp, General Ramírez, La Paz, María Grande, Colón, Villa Elisa, Gualeguaychú y Federal. Entre las consignatarias más activas operan UMC SA - Haciendas Villaguay, Cooperativa La Ganadera de General Ramírez, Consignataria Hasenkamp, Etchevehere Rural, Sáenz Valiente Bullrich y Cía., y la Sociedad Rural de Gualeguaychú. La provincia se caracteriza por una variada oferta que incluye remates generales, especiales, de invernada y de reproductores. Entre Ríos combina zonas de cría en el norte provincial con áreas de invernada en el sur, generando un flujo constante de hacienda que se comercializa en las ferias locales. Las ferias televisadas y los remates especiales de otoño y primavera son eventos destacados del calendario entrerriano, convocando a compradores de toda la región.',
  },
  {
    slug: 'corrientes',
    name: 'CORRIENTES',
    displayName: 'Corrientes',
    intro: 'Corrientes es una de las provincias con mayor stock ganadero del país, ubicada en el noreste argentino. Su tradición criadora la convierte en una plaza fundamental del mercado ganadero nacional. Los remates se realizan en localidades como Mercedes, Chavarría, Caa Catí, Bella Vista, Goya, Sauce, Riachuelo y la capital correntina. Entre las consignatarias y organizaciones que operan en la provincia se encuentran Colombo y Magliano, UMC SA - Haciendas Villaguay, IderCor (Instituto de Desarrollo Rural de Corrientes), Gananor Pujol, Reggi y Cía., la Sociedad Rural de Corrientes y Javier Ulises Ávalos. Corrientes se destaca por remates de cría, generales, de invernada y especiales de reproductores, con una oferta que incluye ganado Braford, Brangus y otras razas adaptadas al clima subtropical. La provincia cuenta con extensas superficies de campo natural aptas para la ganadería, y sus ferias atraen compradores de todo el NEA y del Litoral. Los remates en Mercedes y Goya son particularmente reconocidos por la calidad y el volumen de hacienda ofrecida.',
  },
  {
    slug: 'la-pampa',
    name: 'LA PAMPA',
    displayName: 'La Pampa',
    intro: 'La Pampa es una provincia con arraigada tradición ganadera, ubicada en el centro de Argentina entre la pampa húmeda y la región semiárida. Los principales centros de remate se encuentran en General Acha, Victorica, Lonquimay, Toay, Parera, Bernasconi y Algarrobo del Águila. Las consignatarias que operan activamente incluyen a Daniel Blanco y Cía., Ganaderos de Elordi, Nestor Hugo Fuentes, Vicar Ganadera, Ganaderos de General Acha y Trade Food. La provincia combina remates generales con una importante oferta de invernada, especiales y reproductores, reflejando la diversidad productiva pampeana. La zona este de La Pampa, con características similares a la provincia de Buenos Aires, se dedica principalmente a la invernada, mientras que el oeste se orienta a la cría extensiva. Las ferias pampeanas son reconocidas por la calidad de la hacienda ofrecida y por la transparencia en las operaciones comerciales. General Acha y Victorica concentran buena parte de la actividad, actuando como plazas de referencia para productores de toda la provincia y zonas limítrofes.',
  },
  {
    slug: 'misiones',
    name: 'MISIONES',
    displayName: 'Misiones',
    intro: 'Misiones, en el extremo noreste de Argentina, cuenta con una actividad ganadera en crecimiento que complementa su tradicional producción forestal y yerbatera. Los remates se realizan en localidades como Montecarlo, Fachinal y el Parque de las Naciones en Oberá. Entre las organizaciones activas en la comercialización de hacienda se encuentran Nangapiry SA / Asociación Ganadera del Alto Paraná, CRIPCO Oberá y la Sociedad Rural de Misiones. Si bien la ganadería misionera es de menor escala comparada con otras provincias, la región ha experimentado un desarrollo sostenido en los últimos años, con productores que apuestan a razas adaptadas al clima subtropical como Braford y Brangus. Los remates generales y especiales ofrecen hacienda criada en campos que combinan pasturas con monte nativo, una característica particular de la producción misionera. La provincia busca posicionar su ganadería como un complemento productivo sustentable, y las ferias locales son un espacio importante de encuentro para los productores de la zona.',
  },
  {
    slug: 'formosa',
    name: 'FORMOSA',
    displayName: 'Formosa',
    intro: 'Formosa es una provincia del norte argentino con una ganadería en expansión, caracterizada por sistemas de cría extensiva adaptados al clima subtropical. Los remates se realizan en localidades como Comandante Fontana, donde opera Ganaderos de Formosa SRL, una consignataria local que concentra buena parte de la actividad comercial de la provincia. La ganadería formoseña se basa principalmente en razas índicas y sus cruzas, adaptadas a las condiciones de calor y humedad de la región. Los campos formoseños ofrecen grandes extensiones de pastizales naturales aptos para la cría, y la provincia ha avanzado en la mejora genética y sanitaria de sus rodeos. Los remates generales son los más habituales, con oferta de hacienda mixta que incluye terneros, novillos y vacas. Si bien el calendario de remates formoseño es más acotado que el de otras provincias, la tendencia es de crecimiento sostenido, acompañando el desarrollo productivo de la región y la mayor conectividad con los mercados del Litoral y el centro del país.',
  },
  {
    slug: 'neuquen',
    name: 'NEUQUEN',
    displayName: 'Neuquén',
    intro: 'Neuquén es una provincia patagónica con una ganadería orientada principalmente a la cría ovina y caprina, aunque la producción bovina ha crecido en los últimos años, especialmente en el norte provincial y la zona de influencia de la Confluencia. Los remates se realizan en localidades como Chos Malal, Zapala, Centenario y la ciudad de Neuquén, donde operan consignatarias locales y regionales que atienden tanto a productores de la provincia como de zonas limítrofes con Río Negro, La Pampa y Mendoza. La ganadería neuquina se caracteriza por sistemas extensivos en campos de precordillera y estepa, con razas adaptadas al clima seco y frío de la región. Los remates generales incluyen hacienda bovina, ovina y caprina, siendo estos últimos particularmente relevantes en la economía regional. La provincia ha impulsado programas de mejora genética y sanitaria, y las ferias ganaderas locales son un importante punto de encuentro para productores del oeste argentino. El calendario de remates neuquino, si bien más acotado que el de provincias pampeanas, mantiene una actividad regular especialmente en otoño y primavera.',
  },
  {
    slug: 'santiago-del-estero',
    name: 'SANTIAGO DEL ESTERO',
    displayName: 'Santiago del Estero',
    intro: 'Santiago del Estero es una provincia del noroeste argentino con una importante tradición ganadera de cría, aprovechando los extensos campos del Chaco Seco y las zonas de riego del río Dulce y Salado. Los remates se realizan en localidades como Añatuya, Quimilí, Monte Quemado, Fernández, La Banda y la ciudad capital. Las consignatarias que operan en la provincia incluyen organizaciones locales y regionales, así como la Sociedad Rural de Santiago del Estero que promueve la actividad ganadera provincial. La ganadería santiagueña se basa principalmente en razas índicas y sus cruzas (Brahman, Braford, Brangus), adaptadas al clima cálido y seco característico de la región. Los remates generales son los más frecuentes, con una oferta que incluye terneros, novillos, vaquillonas y vacas de descarte. Santiago del Estero ha experimentado un crecimiento sostenido de su stock ganadero, posicionándose como un importante proveedor de terneros para la invernada en provincias del centro y sur del país. Las ferias ganaderas provinciales son un motor económico regional significativo.',
  },
  {
    slug: 'tucuman',
    name: 'TUCUMAN',
    displayName: 'Tucumán',
    intro: 'Tucumán, la provincia más pequeña de Argentina, cuenta con una actividad ganadera que complementa su tradicional producción azucarera y citrícola. Los remates se realizan principalmente en la Sociedad Rural de Tucumán y en localidades del interior como Concepción, Monteros, Aguilares y Tafí del Valle. La ganadería tucumana aprovecha las zonas de piedemonte y llanura no aptas para cultivos, con sistemas mixtos de cría y recría. Las consignatarias que operan en la provincia incluyen firmas locales y organizaciones rurales que concentran la comercialización de hacienda. Las razas predominantes son Braford, Brangus y cruzas índicas, adaptadas al clima subtropical de la región. Los remates generales y especiales ofrecen hacienda de cría, siendo los terneros el principal producto comercializado hacia provincias del centro del país para su terminación. Si bien Tucumán no es una provincia tradicionalmente ganadera, el sector ha mostrado crecimiento en las últimas décadas, diversificando la matriz productiva provincial y generando oportunidades para productores de pequeña y mediana escala.',
  },
]

const PROVINCE_MAP = new Map(PROVINCES.map(p => [p.slug, p]))

function slugToProvince(slug: string): ProvinceConfig | undefined {
  return PROVINCE_MAP.get(slug)
}

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                      */
/* ------------------------------------------------------------------ */

const auctions = rematesData as Auction[]

export function isRemateProvinceSlug(slug: string): boolean {
  return PROVINCES.some(p => p.slug === slug)
}

export function rematesProvinceSlugsWithAuctions(): string[] {
  const provincesWithAuctions = new Set(auctions.map(a => a.province))
  return PROVINCES
    .filter(p => provincesWithAuctions.has(p.name))
    .map(p => p.slug)
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

export async function rematesProvinceMetadata(provincia: string): Promise<Metadata | null> {
  const config = slugToProvince(provincia)
  if (!config) return null

  const provinceAuctions = auctions.filter(a => a.province === config.name)
  const consignatarias = new Set(provinceAuctions.map(a => a.consignatariaName))

  return {
    title: `Remates Ganaderos en ${config.displayName} 2026`,
    description: `Calendario de ${provinceAuctions.length} remates ganaderos en ${config.displayName}. ${consignatarias.size} consignatarias activas. Filtrá por tipo de remate y fecha. Actualizado diariamente.`,
    keywords: [
      `remates ganaderos ${config.displayName.toLowerCase()}`,
      `subastas hacienda ${config.displayName.toLowerCase()}`,
      `ferias ganaderas ${config.displayName.toLowerCase()}`,
      `consignatarias ${config.displayName.toLowerCase()}`,
      'calendario remates',
    ],
    openGraph: {
      title: `Remates Ganaderos en ${config.displayName}`,
      description: `Calendario de ${provinceAuctions.length} remates ganaderos en ${config.displayName}. ${consignatarias.size} consignatarias activas.`,
      url: `https://www.consignatarias.com.ar/remates/${provincia}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/${provincia}`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  AUCTION ROW (server-rendered, simpler than client)                  */
/* ------------------------------------------------------------------ */

function AuctionRowStatic({ auction }: { auction: Auction }) {
  const city = getCity(auction.location)
  const profileSlug = getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug
  const isFeatured = !!(auction as Auction & { featured?: boolean }).featured

  return (
    <div className={`border-b ${isFeatured ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-terminal-border hover:bg-zinc-800/50'} transition-colors relative`}>
      {isFeatured && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400" />}

      {/* Mobile */}
      <div className="md:hidden p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          {isFeatured && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-amber-500/50 bg-amber-500/10">
              <span className="text-amber-400 text-[10px]">★</span>
              <span className="text-amber-400 font-terminal text-[10px] font-bold tracking-wider">PRO</span>
            </span>
          )}
          <span className={`text-data tabular-nums font-terminal ${isFeatured ? 'text-amber-300' : 'text-zinc-300'}`}>
            {formatDateShort(auction.date)}
          </span>
          {auction.time && (
            <span className={`text-data tabular-nums font-terminal ${isFeatured ? 'text-amber-300/70' : 'text-zinc-400'}`}>{auction.time}</span>
          )}
        </div>
        <div>
          <Link
            href={`/consignatarias/${profileSlug}`}
            className={`font-terminal font-medium text-data hover:underline ${isFeatured ? 'text-amber-200' : 'text-zinc-200 hover:text-accent'} transition-colors`}
          >
            {auction.consignatariaName}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xxs text-zinc-500">{city}</span>
          <span className={`terminal-tag ${isFeatured ? 'border-amber-500 text-amber-400' : TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
            {TYPE_LABELS[auction.type] || auction.type.toUpperCase()}
          </span>
          <span className="text-xxs text-zinc-500">{CAT_LABELS[auction.mainCategory]}</span>
          {auction.estimatedHeads != null && (
            <span className="text-data font-terminal tabular-nums text-zinc-400">
              ~{auction.estimatedHeads.toLocaleString('es-AR')} cab
            </span>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-0 px-cell py-1.5" style={isFeatured ? { paddingLeft: '1rem' } : undefined}>
        {isFeatured && (
          <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 border border-amber-500/50 bg-amber-500/10 flex-shrink-0">
            <span className="text-amber-400 text-[10px]">★</span>
            <span className="text-amber-400 font-terminal text-[10px] font-bold tracking-wider">PRO</span>
          </span>
        )}
        <span className={`w-[56px] flex-shrink-0 text-data tabular-nums font-terminal ${isFeatured ? 'text-amber-300 font-medium' : 'text-zinc-300'}`}>
          {formatDateShort(auction.date)}
        </span>
        <span className="w-[52px] flex-shrink-0 text-data tabular-nums font-terminal">
          {auction.time ? (
            <span className={isFeatured ? 'text-amber-300/70' : 'text-zinc-300'}>{auction.time}</span>
          ) : (
            <span className="text-zinc-500">&mdash;</span>
          )}
        </span>
        <span className="flex-1 min-w-0 text-data font-terminal truncate">
          <Link
            href={`/consignatarias/${profileSlug}`}
            className={`hover:underline transition-colors ${isFeatured ? 'text-amber-200 font-medium hover:text-amber-100' : 'text-zinc-200 hover:text-accent'}`}
          >
            {auction.consignatariaName}
          </Link>
        </span>
        <span className={`w-[140px] flex-shrink-0 text-data font-terminal truncate text-right pr-2 ${isFeatured ? 'text-amber-400/50' : 'text-zinc-500'}`}>
          {city}
        </span>
        <span className={`terminal-tag ${isFeatured ? 'border-amber-500 text-amber-400' : TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} text-[10px] mr-2`}>
          {TYPE_LABELS[auction.type] || auction.type.toUpperCase()}
        </span>
        <span className={`w-[42px] flex-shrink-0 text-xxs font-terminal ${isFeatured ? 'text-amber-400/60' : 'text-zinc-500'}`}>
          {CAT_LABELS[auction.mainCategory]}
        </span>
        <span className={`w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-right ${isFeatured ? 'text-amber-300 font-medium' : 'text-zinc-400'}`}>
          {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export async function RematesProvinceView({ provincia }: { provincia: string }) {
  const config = slugToProvince(provincia)
  if (!config) return null

  const provinceAuctions = auctions
    .filter(a => a.province === config.name)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  const today = new Date().toISOString().slice(0, 10)
  const upcomingAuctions = provinceAuctions.filter(a => a.date >= today)
  const pastAuctions = provinceAuctions.filter(a => a.date < today)

  // Stats
  const consignatarias = new Set(provinceAuctions.map(a => a.consignatariaName))
  const cities = new Set(provinceAuctions.map(a => getCity(a.location)).filter(Boolean))
  const types = new Set(provinceAuctions.map(a => a.type))
  const totalHeads = provinceAuctions.reduce((s, a) => s + (a.estimatedHeads ?? 0), 0)

  // JSON-LD ItemList
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Remates Ganaderos en ${config.displayName}`,
    description: `Calendario de remates ganaderos en ${config.displayName}, Argentina`,
    numberOfItems: provinceAuctions.length,
    itemListElement: upcomingAuctions.slice(0, 20).map((auction, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Event',
        name: auction.title,
        description: auction.description,
        startDate: auction.time ? `${auction.date}T${auction.time}:00-03:00` : auction.date,
        location: {
          '@type': 'Place',
          name: getCity(auction.location),
          address: {
            '@type': 'PostalAddress',
            addressLocality: getCity(auction.location),
            addressRegion: config.displayName,
            addressCountry: 'AR',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: auction.consignatariaName,
        },
      },
    })),
  }

  return (
    <>
      {/* JSON-LD: Breadcrumb */}
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Remates', url: 'https://www.consignatarias.com.ar/remates' },
          { name: config.displayName, url: `https://www.consignatarias.com.ar/remates/${provincia}` },
        ]}
      />

      {/* JSON-LD: ItemList of Events */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-0">
        {/* Back link */}
        <div className="mb-2">
          <Link href="/remates" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
            &larr; Ver todos los remates
          </Link>
        </div>

        {/* Main panel */}
        <div className="terminal-panel">
          {/* Panel header */}
          <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="section-heading text-zinc-200 text-sm tracking-widest">REMATES</span>
              <span className="text-terminal-border hidden sm:inline">&mdash;</span>
              <span className="text-xxs text-zinc-500 uppercase tracking-wider hidden sm:inline">
                {config.displayName}
              </span>
            </div>
            <span className="text-xxs tabular-nums text-zinc-500 font-terminal">
              {provinceAuctions.length} registros
            </span>
          </div>

          {/* Stats bar */}
          <div className="border-b border-terminal-border px-panel py-2 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xxs text-zinc-500 uppercase">Total:</span>
              <span className="text-data tabular-nums text-zinc-300 font-terminal">{provinceAuctions.length}</span>
              <span className="text-xxs text-zinc-500">remates</span>
            </div>
            <div className="text-terminal-border text-xxs select-none">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xxs text-zinc-500 uppercase">Consignatarias:</span>
              <span className="text-data tabular-nums text-zinc-300 font-terminal">{consignatarias.size}</span>
            </div>
            <div className="text-terminal-border text-xxs select-none">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xxs text-zinc-500 uppercase">Ciudades:</span>
              <span className="text-data tabular-nums text-zinc-300 font-terminal">{cities.size}</span>
            </div>
            {totalHeads > 0 && (
              <>
                <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 uppercase">Cabezas est.:</span>
                  <span className="text-data tabular-nums text-zinc-300 font-terminal">
                    ~{totalHeads.toLocaleString('es-AR')}
                  </span>
                </div>
              </>
            )}
            <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xxs text-zinc-500 uppercase">Tipos:</span>
              <div className="flex items-center gap-1">
                {[...types].map(t => (
                  <span key={t} className={`terminal-tag ${TYPE_COLORS[t] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
                    {TYPE_LABELS[t] || t.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SEO Intro */}
          <div className="border-b border-terminal-border px-panel py-4">
            <h1 className="text-lg font-terminal text-zinc-200 mb-3">
              Remates Ganaderos en {config.displayName}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {config.intro}
            </p>
          </div>

          {/* Upcoming auctions section */}
          {upcomingAuctions.length > 0 && (
            <>
              <div className="border-b border-terminal-border px-panel py-1.5 bg-terminal-panel">
                <span className="text-xxs font-terminal text-accent uppercase tracking-wider">
                  Proximos remates ({upcomingAuctions.length})
                </span>
              </div>

              {/* Column headers (desktop) */}
              <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
                <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Fecha</span>
                <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Hora</span>
                <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Consignataria</span>
                <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">Plaza</span>
                <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipo</span>
                <span className="w-[42px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Cat.</span>
                <span className="w-[60px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Cab.</span>
              </div>

              <div className="divide-y-0">
                {upcomingAuctions.map(auction => (
                  <AuctionRowStatic key={auction.id} auction={auction} />
                ))}
              </div>
            </>
          )}

          {/* Past auctions section */}
          {pastAuctions.length > 0 && (
            <>
              <div className="border-b border-terminal-border px-panel py-1.5 bg-terminal-panel">
                <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">
                  Remates pasados ({pastAuctions.length})
                </span>
              </div>

              <div className="divide-y-0 opacity-60">
                {pastAuctions.slice(0, 20).map(auction => (
                  <AuctionRowStatic key={auction.id} auction={auction} />
                ))}
                {pastAuctions.length > 20 && (
                  <div className="px-panel py-3 text-center">
                    <span className="text-xxs text-zinc-500 font-terminal">
                      +{pastAuctions.length - 20} remates anteriores
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty state */}
          {provinceAuctions.length === 0 && (
            <div className="px-panel py-8 text-center">
              <p className="text-data text-zinc-500 font-terminal">
                No hay remates registrados en {config.displayName}.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
            <span className="text-xxs text-zinc-500 font-terminal">
              {provinceAuctions.length} resultado{provinceAuctions.length !== 1 ? 's' : ''} en {config.displayName}
            </span>
            <span className="text-xxs text-zinc-700 font-terminal hidden sm:inline">
              Proxima fecha primero
            </span>
          </div>
        </div>

        {/* Cross-links: By Type */}
        {(() => {
          // Get types with 2+ auctions in this province
          const typeCounts = upcomingAuctions.reduce((acc, a) => {
            acc[a.type] = (acc[a.type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const topTypes = Object.entries(typeCounts)
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
          
          if (topTypes.length === 0) return null
          
          return (
            <div className="mt-4">
              <div className="terminal-panel">
                <div className="terminal-panel-header">
                  <span className="section-heading text-zinc-400 text-xs tracking-widest">
                    POR TIPO EN {config.displayName.toUpperCase()}
                  </span>
                </div>
                <div className="p-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {topTypes.map(([type, count]) => (
                    <Link
                      key={type}
                      href={`/remates/${provincia}/${type}`}
                      className="flex items-center justify-between px-3 py-2 bg-terminal-panel border border-terminal-border rounded hover:border-accent/50 transition-colors"
                    >
                      <span className="text-xxs text-zinc-300 font-terminal">
                        {TYPE_LABELS[type] || type.toUpperCase()}
                      </span>
                      <span className="text-xxs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full font-terminal">
                        {count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Back link bottom */}
        <div className="mt-3">
          <Link href="/remates" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
            &larr; Ver todos los remates
          </Link>
        </div>
      </div>
    </>
  )
}
