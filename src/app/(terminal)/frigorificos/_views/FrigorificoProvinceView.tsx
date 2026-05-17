import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'

/* ============================================================
   FRIGORIFICO PROVINCE VIEW — used when /frigorificos/[slug]
   matches a province slug. Lives in _views/ so the underscore
   tells Next.js to NOT treat as a route segment.
   ============================================================ */

interface ProvinceConfig {
  slug: string
  name: string
  displayName: string
  intro: string
}

const PROVINCES: ProvinceConfig[] = [
  { slug: 'buenos-aires', name: 'BUENOS AIRES', displayName: 'Buenos Aires', intro: 'Buenos Aires concentra la mayor cantidad de plantas frigoríficas de Argentina, siendo el corazón de la industria cárnica nacional. Desde los grandes establecimientos del conurbano como Coto, Gorina, Rioplatense y Ecocarnes hasta las plantas del interior provincial, la infraestructura frigorífica bonaerense procesa la mayor parte de la faena bovina del país. Las plantas habilitadas por MAGYP operan bajo estrictos estándares sanitarios, con certificaciones para exportación a mercados exigentes como la Unión Europea, Estados Unidos y China. La proximidad al Puerto de Buenos Aires facilita la logística de exportación, mientras que la red vial provincial garantiza el abastecimiento del mercado interno.' },
  { slug: 'santa-fe', name: 'SANTA FE', displayName: 'Santa Fe', intro: 'Santa Fe es una provincia clave en la industria frigorífica argentina, con plantas de primer nivel como Swift Argentina, FRIAR y Finlar operando en su territorio. La infraestructura frigorífica santafesina combina grandes establecimientos exportadores con plantas de ciclo completo que abastecen el mercado interno. Rosario, la tercera ciudad del país, funciona como polo logístico de la industria cárnica, conectando la producción con los principales mercados. Los frigoríficos santafesinos están habilitados por MAGYP y muchos cuentan con certificaciones para exportación, consolidando a la provincia como referente de la cadena de valor cárnica.' },
  { slug: 'cordoba', name: 'CORDOBA', displayName: 'Córdoba', intro: 'Córdoba cuenta con una importante infraestructura frigorífica que procesa la producción ganadera del centro del país. Las plantas habilitadas por MAGYP en la provincia operan tanto para el mercado interno como para exportación, con establecimientos distribuidos en las principales ciudades cordobesas. La ubicación geográfica central de Córdoba la convierte en un punto estratégico para la distribución de productos cárnicos a todo el país. Los frigoríficos cordobeses cumplen con los estándares sanitarios nacionales e internacionales, contribuyendo significativamente a la cadena de valor de la carne argentina.' },
  { slug: 'entre-rios', name: 'ENTRE RIOS', displayName: 'Entre Ríos', intro: 'Entre Ríos posee una red de plantas frigoríficas que procesan la producción ganadera mesopotámica. La tradición ganadera entrerriana se complementa con frigoríficos modernos habilitados por MAGYP, varios de ellos con capacidad exportadora. La ubicación entre los ríos Paraná y Uruguay facilita la conectividad con puertos fluviales y mercados regionales. Los establecimientos frigoríficos de Entre Ríos cumplen con rigurosos protocolos sanitarios y contribuyen al procesamiento de hacienda de alta calidad proveniente de los campos entrerrianos.' },
  { slug: 'la-pampa', name: 'LA PAMPA', displayName: 'La Pampa', intro: 'La Pampa cuenta con plantas frigoríficas que procesan la hacienda de la región central argentina. Los establecimientos habilitados por MAGYP en la provincia operan bajo estándares sanitarios rigurosos, atendiendo tanto el mercado interno como nichos de exportación. La ganadería pampeana, reconocida por la calidad de su hacienda, encuentra en los frigoríficos locales un eslabón fundamental de la cadena productiva. La infraestructura frigorífica provincial se ha modernizado en las últimas décadas para cumplir con los requisitos de los mercados más exigentes.' },
  { slug: 'chaco', name: 'CHACO', displayName: 'Chaco', intro: 'Chaco posee plantas frigoríficas que procesan la producción ganadera del norte argentino. Los establecimientos habilitados por MAGYP en la provincia atienden la creciente actividad ganadera chaqueña, contribuyendo al agregado de valor local. La industria frigorífica del Chaco ha crecido en paralelo con el desarrollo de la ganadería provincial, ofreciendo capacidad de faena para la hacienda criada en los campos del Impenetrable y las zonas productivas del este provincial.' },
  { slug: 'corrientes', name: 'CORRIENTES', displayName: 'Corrientes', intro: 'Corrientes, una de las provincias con mayor stock ganadero del país, cuenta con plantas frigoríficas que procesan parte de su importante producción. Los establecimientos habilitados por MAGYP operan bajo estándares sanitarios nacionales, contribuyendo a la cadena de valor de la ganadería correntina. La ubicación estratégica de la provincia en el NEA permite la conexión con mercados regionales y nacionales. Los frigoríficos correntinos procesan hacienda de razas adaptadas al clima subtropical, agregando valor a la producción local.' },
  { slug: 'santiago-del-estero', name: 'SANTIAGO DEL ESTERO', displayName: 'Santiago del Estero', intro: 'Santiago del Estero cuenta con plantas frigoríficas como Forres Beltrán que procesan la creciente producción ganadera provincial. Los establecimientos habilitados por MAGYP operan con estándares sanitarios rigurosos, atendiendo el mercado regional y nacional. La expansión de la ganadería santiagueña ha impulsado el desarrollo de infraestructura frigorífica, agregando valor a la hacienda criada en los campos del Chaco Seco y las zonas de riego.' },
  { slug: 'formosa', name: 'FORMOSA', displayName: 'Formosa', intro: 'Formosa posee plantas frigoríficas que atienden la producción ganadera del norte argentino. Los establecimientos habilitados por MAGYP procesan hacienda adaptada al clima subtropical, contribuyendo al desarrollo de la cadena de valor cárnica provincial. La industria frigorífica formoseña opera bajo estándares sanitarios nacionales, ofreciendo capacidad de faena para productores de la región.' },
  { slug: 'misiones', name: 'MISIONES', displayName: 'Misiones', intro: 'Misiones cuenta con establecimientos frigoríficos habilitados por MAGYP que atienden la producción ganadera provincial. Si bien la ganadería misionera es de menor escala, los frigoríficos locales cumplen un rol importante en el procesamiento y comercialización de hacienda, complementando la economía regional basada en la forestación y la yerba mate.' },
  { slug: 'tucuman', name: 'TUCUMAN', displayName: 'Tucumán', intro: 'Tucumán posee plantas frigoríficas habilitadas por MAGYP que procesan hacienda de la región noroeste. Los establecimientos operan bajo estándares sanitarios nacionales, atendiendo el mercado regional y contribuyendo a la diversificación productiva de la provincia, tradicionalmente enfocada en caña de azúcar y citrus.' },
  { slug: 'salta', name: 'SALTA', displayName: 'Salta', intro: 'Salta cuenta con plantas frigoríficas habilitadas por MAGYP que procesan la producción ganadera del norte argentino. Los establecimientos operan con estándares sanitarios rigurosos, atendiendo el mercado regional y nacional. La ganadería salteña, presente principalmente en los valles y el Chaco salteño, encuentra en los frigoríficos locales infraestructura para el procesamiento de su producción.' },
  { slug: 'jujuy', name: 'JUJUY', displayName: 'Jujuy', intro: 'Jujuy posee establecimientos frigoríficos habilitados por MAGYP que atienden la producción ganadera provincial. Los frigoríficos jujeños operan bajo estándares sanitarios nacionales, contribuyendo al procesamiento de hacienda criada en los valles y quebradas de la provincia.' },
  { slug: 'catamarca', name: 'CATAMARCA', displayName: 'Catamarca', intro: 'Catamarca cuenta con plantas frigoríficas habilitadas por MAGYP para el procesamiento de hacienda local. Los establecimientos operan atendiendo el mercado regional, contribuyendo a la cadena de valor ganadera de la provincia.' },
  { slug: 'mendoza', name: 'MENDOZA', displayName: 'Mendoza', intro: 'Mendoza posee plantas frigoríficas habilitadas por MAGYP que procesan hacienda de la región cuyana. Los establecimientos operan bajo estándares sanitarios nacionales, atendiendo el importante mercado de consumo de la provincia y contribuyendo al abastecimiento regional.' },
  { slug: 'san-juan', name: 'SAN JUAN', displayName: 'San Juan', intro: 'San Juan cuenta con establecimientos frigoríficos habilitados por MAGYP para el procesamiento de hacienda. Los frigoríficos sanjuaninos atienden el mercado local y regional, cumpliendo con los estándares sanitarios nacionales.' },
  { slug: 'san-luis', name: 'SAN LUIS', displayName: 'San Luis', intro: 'San Luis posee plantas frigoríficas que procesan la producción ganadera provincial. Los establecimientos habilitados por MAGYP operan bajo estándares sanitarios rigurosos, atendiendo el mercado regional y contribuyendo a la cadena de valor de la ganadería puntana, que ocupa un lugar destacado en la economía provincial.' },
  { slug: 'neuquen', name: 'NEUQUEN', displayName: 'Neuquén', intro: 'Neuquén cuenta con establecimientos frigoríficos habilitados por MAGYP que procesan hacienda de la región patagónica norte. Los frigoríficos neuquinos atienden el mercado regional, contribuyendo al procesamiento de ganado bovino, ovino y caprino de la zona.' },
  { slug: 'rio-negro', name: 'RIO NEGRO', displayName: 'Río Negro', intro: 'Río Negro posee plantas frigoríficas habilitadas por MAGYP que procesan hacienda patagónica. Los establecimientos operan bajo estándares sanitarios nacionales, atendiendo el mercado regional y contribuyendo al procesamiento de carne bovina y ovina de alta calidad.' },
  { slug: 'chubut', name: 'CHUBUT', displayName: 'Chubut', intro: 'Chubut cuenta con establecimientos frigoríficos habilitados por MAGYP, especializados en el procesamiento de ganado ovino y bovino patagónico. Los frigoríficos chubutenses operan bajo estándares sanitarios rigurosos, con capacidad exportadora para productos de alta calidad como el cordero patagónico.' },
  { slug: 'santa-cruz', name: 'SANTA CRUZ', displayName: 'Santa Cruz', intro: 'Santa Cruz posee plantas frigoríficas habilitadas por MAGYP especializadas en el procesamiento de ganado ovino. Los establecimientos operan bajo estándares sanitarios nacionales e internacionales, con capacidad de exportación de cordero patagónico a mercados exigentes.' },
  { slug: 'tierra-del-fuego', name: 'TIERRA DEL FUEGO', displayName: 'Tierra del Fuego', intro: 'Tierra del Fuego cuenta con establecimientos frigoríficos habilitados por MAGYP para el procesamiento de hacienda ovina. Los frigoríficos fueguinos operan bajo estándares sanitarios nacionales, atendiendo el mercado local y la producción de cordero fueguino.' },
]

const PROVINCE_MAP = new Map(PROVINCES.map(p => [p.slug, p]))

interface Frigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
}

const frigorificos = frigorificosData as Frigorifico[]

export function isFrigorificoProvinceSlug(slug: string): boolean {
  return PROVINCE_MAP.has(slug)
}

export function frigorificoProvinceSlugs(): string[] {
  const provincesWithFrigorificos = new Set(frigorificos.map(f => f.province))
  return PROVINCES
    .filter(p => provincesWithFrigorificos.has(p.name))
    .map(p => p.slug)
}

export async function frigorificoProvinceMetadata(provincia: string) {
  const config = PROVINCE_MAP.get(provincia)
  if (!config) return null
  const provinceFrigorificos = frigorificos.filter(f => f.province === config.name)
  return {
    title: `Frigoríficos en ${config.displayName} | ${provinceFrigorificos.length} Plantas MAGYP`,
    description: `Directorio de ${provinceFrigorificos.length} frigoríficos habilitados por MAGYP en ${config.displayName}. Plantas de faena con matrícula, CUIT y etapa de habilitación. Base de datos oficial actualizada.`,
    keywords: [
      `frigoríficos ${config.displayName.toLowerCase()}`,
      `plantas frigoríficas ${config.displayName.toLowerCase()}`,
      `faena ${config.displayName.toLowerCase()}`,
      `MAGYP ${config.displayName.toLowerCase()}`,
      'frigoríficos argentina',
      'plantas de faena',
    ],
    openGraph: {
      title: `Frigoríficos en ${config.displayName}`,
      description: `${provinceFrigorificos.length} frigoríficos habilitados por MAGYP en ${config.displayName}. Directorio oficial con matrícula y datos de contacto.`,
      url: `https://www.consignatarias.com.ar/frigorificos/${provincia}`,
      type: 'website' as const,
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/frigorificos/${provincia}`,
    },
  }
}

const STAGE_LABELS: Record<number, string> = { 1: 'Ciclo I', 2: 'Ciclo II', 3: 'Ciclo III' }
const STAGE_COLORS: Record<number, string> = {
  1: 'border-green-500 text-green-400',
  2: 'border-blue-500 text-blue-400',
  3: 'border-yellow-500 text-yellow-400',
}

function FrigorificoRow({ frigorifico }: { frigorifico: Frigorifico }) {
  return (
    <div className="border-b border-terminal-border hover:bg-zinc-800/50 transition-colors">
      <div className="md:hidden p-3 space-y-1.5">
        <div>
          <Link
            href={`/frigorificos/${frigorifico.cuit}`}
            className="font-terminal font-medium text-data text-zinc-200 hover:text-accent transition-colors hover:underline"
          >
            {frigorifico.name}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xxs text-zinc-500">CUIT: {frigorifico.cuit}</span>
          <span className="text-xxs text-zinc-500">Mat: {frigorifico.matricula}</span>
          <span className={`terminal-tag ${STAGE_COLORS[frigorifico.stage] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
            {STAGE_LABELS[frigorifico.stage] || `Etapa ${frigorifico.stage}`}
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-0 px-cell py-1.5">
        <span className="flex-1 min-w-0 text-data font-terminal truncate">
          <Link href={`/frigorificos/${frigorifico.cuit}`} className="text-zinc-200 hover:text-accent hover:underline transition-colors">
            {frigorifico.name}
          </Link>
        </span>
        <span className="w-[130px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-400">
          {frigorifico.cuit}
        </span>
        <span className="w-[80px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-400 text-right pr-4">
          {frigorifico.matricula}
        </span>
        <span className={`terminal-tag ${STAGE_COLORS[frigorifico.stage] || 'border-zinc-500 text-zinc-400'} text-[10px] w-[70px] text-center`}>
          {STAGE_LABELS[frigorifico.stage] || `Etapa ${frigorifico.stage}`}
        </span>
      </div>
    </div>
  )
}

export function FrigorificoProvinceView({ provincia }: { provincia: string }) {
  const config = PROVINCE_MAP.get(provincia)
  if (!config) return null

  const provinceFrigorificos = frigorificos
    .filter(f => f.province === config.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const stageCount = provinceFrigorificos.reduce((acc, f) => {
    acc[f.stage] = (acc[f.stage] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Frigoríficos en ${config.displayName}`,
    description: `Directorio de ${provinceFrigorificos.length} frigoríficos habilitados por MAGYP en ${config.displayName}, Argentina`,
    numberOfItems: provinceFrigorificos.length,
    itemListElement: provinceFrigorificos.slice(0, 50).map((frigorifico, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: frigorifico.name,
        identifier: frigorifico.cuit,
        url: `https://www.consignatarias.com.ar/frigorificos/${frigorifico.cuit}`,
        address: { '@type': 'PostalAddress', addressRegion: config.displayName, addressCountry: 'AR' },
      },
    })),
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Frigoríficos', url: 'https://www.consignatarias.com.ar/frigorificos' },
          { name: config.displayName, url: `https://www.consignatarias.com.ar/frigorificos/${provincia}` },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-0">
        <div className="mb-2">
          <Link href="/frigorificos" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
            &larr; Ver todos los frigoríficos
          </Link>
        </div>

        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="section-heading text-zinc-200 text-sm tracking-widest">FRIGORÍFICOS</span>
              <span className="text-terminal-border hidden sm:inline">&mdash;</span>
              <span className="text-xxs text-zinc-500 uppercase tracking-wider hidden sm:inline">{config.displayName}</span>
            </div>
            <span className="text-xxs tabular-nums text-zinc-500 font-terminal">{provinceFrigorificos.length} plantas</span>
          </div>

          <div className="border-b border-terminal-border px-panel py-2 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xxs text-zinc-500 uppercase">Total:</span>
              <span className="text-data tabular-nums text-zinc-300 font-terminal">{provinceFrigorificos.length}</span>
              <span className="text-xxs text-zinc-500">plantas</span>
            </div>
            {Object.entries(stageCount).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-1.5">
                <span className="text-terminal-border text-xxs select-none">|</span>
                <span className={`terminal-tag ${STAGE_COLORS[Number(stage)] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
                  {STAGE_LABELS[Number(stage)] || `Etapa ${stage}`}
                </span>
                <span className="text-data tabular-nums text-zinc-300 font-terminal">{count}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-terminal-border px-panel py-4">
            <h1 className="text-lg font-terminal text-zinc-200 mb-3">Frigoríficos en {config.displayName}</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{config.intro}</p>
          </div>

          <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
            <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Nombre</span>
            <span className="w-[130px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">CUIT</span>
            <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-4">Matrícula</span>
            <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-center">Ciclo</span>
          </div>

          <div className="divide-y-0">
            {provinceFrigorificos.map(frigorifico => (
              <FrigorificoRow key={frigorifico.cuit} frigorifico={frigorifico} />
            ))}
          </div>

          {provinceFrigorificos.length === 0 && (
            <div className="px-panel py-8 text-center">
              <p className="text-data text-zinc-500 font-terminal">No hay frigoríficos registrados en {config.displayName}.</p>
            </div>
          )}

          <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
            <span className="text-xxs text-zinc-500 font-terminal">{provinceFrigorificos.length} planta{provinceFrigorificos.length !== 1 ? 's' : ''} en {config.displayName}</span>
            <span className="text-xxs text-zinc-700 font-terminal hidden sm:inline">Datos MAGYP • Orden alfabético</span>
          </div>
        </div>

        <div className="mt-4 terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">Otras provincias</span>
          </div>
          <div className="px-panel py-3 flex flex-wrap gap-2">
            {PROVINCES
              .filter(p => p.slug !== provincia && frigorificos.some(f => f.province === p.name))
              .map(p => (
                <Link key={p.slug} href={`/frigorificos/${p.slug}`} className="text-xxs font-terminal text-zinc-400 hover:text-accent transition-colors">
                  {p.displayName}
                </Link>
              ))}
          </div>
        </div>

        <div className="mt-3">
          <Link href="/frigorificos" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">
            &larr; Ver todos los frigoríficos
          </Link>
        </div>
      </div>
    </>
  )
}
