import { Metadata } from 'next'
import Link from 'next/link'
import { rematesProvinceSlugsWithAuctions } from '../../../remates/_views/RematesProvinceView'
import { notFound } from 'next/navigation'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import existencias from '@/lib/data/existencias-bovinas.json'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { rematePath } from '@/lib/remate-slug'
import {
  CATEGORIAS_GEO,
  CATEGORIAS_GEO_SLUGS,
  PROVINCIAS_GEO,
  PROVINCIAS_GEO_SLUGS,
  proximosRematesGeo,
  type CategoriaGeoSlug,
} from '@/lib/precios-geo'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { ProvinceCluster } from '@/components/seo/ProvinceCluster'
import { AnswerBlock } from '@/components/seo/AnswerBlock'
import { DataStamp } from '@/components/seo/DataStamp'
import { CitaBlock } from '@/components/seo/CitaBlock'
import PriceWhatsAppShare from '@/components/share/PriceWhatsAppShare'
import { MethodologyMicroBlock } from '@/components/seo/MethodologyMicroBlock'
import { PriceCTA } from '@/components/PriceCTA'
import { EmptyState } from '@/components/ui'

/* ============================================================
   /precios/[categoria]/[provincia] — geo × category long-tail.
   HONEST design: the reference price is NATIONAL (INMAG, formed
   at Cañuelas). This page answers "precio del novillo en Corrientes"
   with: national reference + that province's real context
   (existencias, supply share at MAG, local remates, consignatarias).
   ============================================================ */

type CategorySlug = CategoriaGeoSlug

const CATEGORIES = CATEGORIAS_GEO
const PROVINCES = PROVINCIAS_GEO
const ALL_CATEGORIES = CATEGORIAS_GEO_SLUGS
const ALL_PROVINCES = PROVINCIAS_GEO_SLUGS
const fmt = (n: number) => n.toLocaleString('es-AR')

/* ────────────────────────────────────────────────────────────────────────
   Diferencial regional ESTIMADO (base / basis). NO es un precio observado.

   Ancla empírica: Diez 2020 (p.29) midió Liniers ~8,63% por encima del precio
   en el Sudoeste Bonaerense a 660 km (27/05/2020) — equivalente a ~7,9% de
   descuento en origen. Iriarte 2008 (p.103-104): "precio interior = precio
   Liniers − flete − gastos de comercialización".

   Modelo: descuento lineal por distancia, calibrado para reproducir el dato de
   Diez a 660 km. Es UN punto, un día, una región → extrapolación gruesa. El
   precio real se forma en los remates en origen. Por eso se publica etiquetado
   como estimación, con método y fuente a la vista (valor #1 + #5 del proyecto).
   ──────────────────────────────────────────────────────────────────────── */
const BASIS_DISCOUNT_PER_KM = 7.944 / 660 // ≈0,0120 puntos % de descuento por km
function regionalBasis(referencePrice: number, km: number) {
  const discountPct = Math.min(BASIS_DISCOUNT_PER_KM * km, 25) // cap defensivo
  return {
    discountPct: Math.round(discountPct * 10) / 10,
    localEstimate: Math.round(referencePrice * (1 - discountPct / 100)),
  }
}

export function generateStaticParams() {
  return ALL_CATEGORIES.flatMap((categoria) =>
    ALL_PROVINCES.map((provincia) => ({ categoria, provincia })),
  )
}

function isValid(categoria: string, provincia: string): boolean {
  return ALL_CATEGORIES.includes(categoria as CategorySlug) && provincia in PROVINCES
}

const provinciaAuctions = (name: string) => (rematesData as Auction[]).filter((a) => a.province === name)

const existenciasMap = existencias as unknown as Record<string, { total: number; year: number } | undefined>

function getContext(categoria: CategorySlug, provincia: string) {
  const cat = CATEGORIES[categoria]
  const prov = PROVINCES[provincia]
  const priceData = (marketPrices.categories as Record<string, { current: number; prev: number; change: number }>)[categoria]
  const price = Math.round(priceData.current)

  // Province supply share at the MAG (origin of cattle sold at Cañuelas)
  const supply = (marketPrices.provinceEntry?.provinces as { province: string; percentage: number }[] | undefined)?.find(
    (p) => p.province === prov.name,
  )
  const existencia = existenciasMap[prov.name]?.total ?? null

  // Local remate activity for this category's relevant sale-types
  const upcoming = proximosRematesGeo(categoria, provincia)
  const provAuctions = provinciaAuctions(prov.name)
  const consignatarias = [...new Set(provAuctions.map((a) => a.consignatariaName).filter(Boolean))] as string[]
  // Lo local de verdad: cuánta actividad de remates tuvo la provincia en los últimos
  // 90 días. El precio es nacional; la plaza no.
  const hoy = new Date().toISOString().slice(0, 10)
  const hace90 = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
  const recientes = provAuctions.filter((a) => a.date >= hace90 && a.date < hoy)
  const recientesCategoria = recientes.filter((a) => cat.remateTypes.includes(a.type)).length

  // Diferencial regional estimado (descuento vs referencia nacional por distancia)
  const basis = regionalBasis(price, prov.km)

  return {
    cat, prov, price, change: priceData.change, supply, existencia, upcoming, consignatarias, basis,
    recientes: recientes.length, recientesCategoria,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; provincia: string }>
}): Promise<Metadata> {
  const { categoria, provincia } = await params
  if (!isValid(categoria, provincia)) return { title: 'No encontrado' }
  const { cat, prov, price, basis } = getContext(categoria as CategorySlug, provincia)

  // El número es el INMAG NACIONAL: el title no lo presenta como si fuera el precio de
  // la provincia. La description lo dice con nombre propio y suma el estimado en origen.
  const title = `${cat.singular.charAt(0).toUpperCase() + cat.singular.slice(1)} en ${prov.display}: precio de referencia y en origen`
  const description = `${cat.title} en ${prov.display}: referencia nacional $${fmt(price)}/kg (INMAG, ${INMAG_DATE}) y estimado en origen ~$${fmt(basis.localEstimate)}/kg. Remates y consignatarias.`

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
      images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
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
  // Solo 13 provincias tienen página de remates (Neuquén y Tucumán no): no enlazar a un 404.
  const remateProvinciaConPagina = rematesProvinceSlugsWithAuctions().includes(provincia)

  const { cat, prov, price, change, supply, existencia, upcoming, consignatarias, basis, recientes, recientesCategoria } = getContext(
    categoria as CategorySlug,
    provincia,
  )
  const lastUpdate = marketPrices.lastUpdate
  const changeStr = `${change >= 0 ? '+' : ''}${change}%`
  const changeColor = change >= 0 ? '#34d399' : '#f87171'
  const promedioPeso = price * cat.promedioKg
  // Geo citation — the estimate label travels WITH the origin number (brand rule #1).
  const citation = `INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, ${INMAG_DATE} — referencia nacional $${fmt(price)}/kg; estimado en origen ${prov.display} ~$${fmt(basis.localEstimate)}/kg vivo de ${cat.singular} (estimación por distancia, no precio observado)`

  const faqItems = [
    {
      question: `¿Cuánto vale el kilo vivo de ${cat.singular} en ${prov.display}?`,
      answer: `El precio de referencia del kilo vivo de ${cat.singular} es $${fmt(price)} (INMAG, ${INMAG_DATE}). Es un valor nacional: se forma en el Mercado Agroganadero de Cañuelas. En ${prov.display} el precio realizado puede diferir de esa referencia por flete, costos de comercialización y distancia a los centros de consumo y exportación; en provincias alejadas suele ubicarse por debajo. El precio local se forma en los remates en origen.`,
    },
    {
      question: `¿Dónde se forma el precio del ${cat.singular} en Argentina?`,
      answer: `El precio de referencia se forma en el Mercado Agroganadero (Cañuelas, ex Liniers) y se publica como INMAG. ${prov.display}${supply ? ` aportó el ${supply.percentage}% de la hacienda operada en el MAG en la última rueda` : ' comercializa su hacienda mayormente vía remates en origen y ferias locales'}.`,
    },
    {
      question: `¿Cuánto sale un ${cat.singular} en ${prov.display}?`,
      answer: `Un ${cat.singular} promedio de ${cat.promedioKg} kg ronda los $${fmt(promedioPeso)} a precio de referencia ($${fmt(price)}/kg × ${cat.promedioKg} kg). El valor final depende de peso, terminación y de la plaza/remate donde se venda.`,
    },
    {
      question: `¿Cuánto se paga el ${cat.singular} en origen en ${prov.display}?`,
      answer: `Estimación (modelo por distancia, no precio observado): el ${cat.singular} en origen en ${prov.display} rondaría ~$${fmt(basis.localEstimate)}/kg, aproximadamente ${basis.discountPct}% por debajo de la referencia nacional ($${fmt(price)}/kg, INMAG). El diferencial se explica por flete, costos de comercialización y distancia a los centros de consumo y exportación: Cañuelas cotiza por encima del interior (Iriarte 2008; Diez 2020 midió 8,63% a 660 km). El precio real se fija en los remates en origen y varía según kilaje, terminación y demanda.`,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema
        section={`precios/${categoria}/${provincia}`}
        sectionName={`Precio ${cat.title} en ${prov.display}`}
      />
      <FAQPageSchema items={faqItems} />
      <SpeakableSchema
        url={`https://www.consignatarias.com.ar/precios/${categoria}/${provincia}`}
        headline={`Precio del ${cat.singular} en ${prov.display}: referencia nacional y valor estimado en origen`}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span className="mx-2">/</span>
          <Link href={`/precios/${categoria}`} className="hover:text-zinc-300">{cat.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{prov.display}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Precio del {cat.singular} en {prov.display}: referencia nacional y valor estimado en origen
        </h1>
        <p className="text-zinc-400 text-sm mb-3">
          <DataStamp isoDate={lastUpdate} /> · INMAG, Mercado Agroganadero
        </p>
        <AnswerBlock
          question={`Precio del ${cat.singular} en ${prov.display} hoy`}
          answer={
            <>
              El kilo vivo de {cat.singular} cotiza <strong className="text-ink">${fmt(price)}/kg</strong> de
              referencia nacional (INMAG, formado en el Mercado Agroganadero de Cañuelas; {INMAG_DATE}, {changeStr}{' '}
              semanal). En {prov.display}, a ~{fmt(prov.km)} km del mercado, el valor estimado en origen es{' '}
              <strong className="text-ink">~${fmt(basis.localEstimate)}/kg</strong> (≈ −{basis.discountPct}%), por
              flete y costos de comercialización. El precio real se forma en los remates en origen.
            </>
          }
        />
        <p className="text-xxs text-zinc-600 mb-6 -mt-3 max-w-2xl">
          Estimación por distancia, no precio observado ·{' '}
          <a href="#diferencial-regional" className="underline underline-offset-2 hover:text-zinc-400">ver método</a>
        </p>
        <CitaBlock citation={citation} sourceUrl={`https://www.consignatarias.com.ar/precios/${categoria}/${provincia}`} />
        <PriceWhatsAppShare
          singular={cat.singular}
          provinciaDisplay={prov.display}
          price={price}
          change={change}
          localEstimate={basis.localEstimate}
          discountPct={basis.discountPct}
          lastUpdate={lastUpdate}
          url={`https://www.consignatarias.com.ar/precios/${categoria}/${provincia}`}
          className="mb-6"
        />

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

        {/* Estimated regional basis — clearly labeled ESTIMATE (not observed) */}
        <div id="diferencial-regional" className="terminal-panel mb-6 scroll-mt-24" style={{ borderColor: 'rgba(251,191,36,0.35)' }}>
          <div className="terminal-panel-header flex items-center justify-between" style={{ color: '#fbbf24', borderBottomColor: 'rgba(251,191,36,0.35)' }}>
            <span>Diferencial regional estimado</span>
            <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">estimación · no precio observado</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-terminal-border">
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Referencia nacional</div>
              <div className="text-zinc-100 text-2xl font-terminal tabular-nums">${fmt(price)}</div>
              <div className="text-zinc-600 text-xxs">INMAG · Cañuelas</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Estimado en origen</div>
              <div className="text-2xl font-terminal tabular-nums" style={{ color: '#fbbf24' }}>${fmt(basis.localEstimate)}</div>
              <div className="text-zinc-600 text-xxs">$/kg vivo · {prov.display}</div>
            </div>
            <div className="bg-terminal-panel px-4 py-4">
              <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Diferencial</div>
              <div className="text-2xl font-terminal tabular-nums" style={{ color: '#f87171' }}>−{basis.discountPct}%</div>
              <div className="text-zinc-600 text-xxs">a ~{fmt(prov.km)} km del MAG</div>
            </div>
          </div>
          <div className="px-panel py-4 text-sm text-zinc-400 leading-relaxed space-y-2">
            <p>
              Cañuelas cotiza por encima del interior: el precio en origen ≈{' '}
              <span className="text-zinc-200">referencia − flete − costos de comercialización − distancia</span> a
              los centros de consumo y exportación. Estimamos {prov.display} en{' '}
              <strong className="text-zinc-200">~${fmt(basis.localEstimate)}/kg</strong> ({basis.discountPct}% por
              debajo de la referencia nacional).
            </p>
            <MethodologyMicroBlock summary="Método y fuentes del diferencial">
              Modelo lineal por distancia, anclado en <strong className="text-zinc-500">Diez 2020</strong> (Liniers
              +8,63% sobre el Sudoeste Bonaerense a 660 km) y en la fórmula de{' '}
              <strong className="text-zinc-500">Iriarte 2008</strong> (precio interior = precio Liniers − flete −
              gastos de comercialización). Es una <strong className="text-zinc-500">estimación propia</strong>, no un
              precio transado: surge de un dato puntual extrapolado por distancia. El precio real se forma en los{' '}
              {remateProvinciaConPagina ? (
                <Link href={`/remates/${provincia}`} className="text-accent/80 hover:text-accent-bright underline underline-offset-2">remates en origen</Link>
              ) : 'remates en origen'}{' '}
              y depende de kilaje, terminación y demanda del día.
            </MethodologyMicroBlock>
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
            {recientes > 0 && (
              <p>
                Remates en la provincia en los últimos 90 días:{' '}
                <strong className="text-zinc-200">{fmt(recientes)}</strong>
                {recientesCategoria > 0 && <> ({fmt(recientesCategoria)} de los tipos donde se vende {cat.singular})</>}
                .
              </p>
            )}
            {supply && (
              <p>
                Aporte a la oferta del Mercado Agroganadero en la última rueda:{' '}
                <strong className="text-zinc-200">{supply.percentage}%</strong> de la hacienda operada.
              </p>
            )}
            <p>
              El INMAG es la <strong className="text-zinc-200">referencia nacional</strong>, formada en Cañuelas
              (donde se concentra la hacienda de las provincias cercanas). El precio que efectivamente se paga en{' '}
              {prov.display} <strong className="text-zinc-200">no es idéntico a esa referencia</strong>: difiere por
              flete, costos de comercialización y distancia a los centros de consumo y exportación — en provincias
              alejadas suele ubicarse por debajo. El precio local real se forma en los{' '}
              <strong className="text-zinc-200">remates en origen</strong>.
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
                  href={rematePath(a)}
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
            <EmptyState
              icon="martillo"
              compact
              title={`No hay remates de ${cat.title.toLowerCase()} programados en ${prov.display} en este momento.`}
              cta={
                remateProvinciaConPagina ? (
                  <Link href={`/remates/${provincia}`} className="text-accent hover:text-accent-bright">
                    Ver todos los remates en {prov.display} →
                  </Link>
                ) : (
                  <Link href="/remates" className="text-accent hover:text-accent-bright">
                    Ver el calendario de remates de todo el país →
                  </Link>
                )
              }
            />
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

        <PriceCTA />

        <ProvinceCluster province={prov.name} />

        <p className="text-zinc-600 text-xxs text-center mt-6">
          Fuente: INMAG (Mercado Agroganadero) · existencias SENASA · Actualizado {lastUpdate}.
        </p>
      </div>
    </>
  )
}
