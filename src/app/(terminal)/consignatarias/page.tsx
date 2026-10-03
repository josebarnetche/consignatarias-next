import { jsonLd } from '@/lib/seo/json-ld'
import { OfrecerGuia } from '@/components/guias/OfrecerGuia'
import { Metadata } from 'next'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getFeaturedSlugs } from '@/lib/featured'
import ConsignatariasDirectoryClient from './ConsignatariasDirectoryClient'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { FaqList } from '@/components/seo/FaqList'
import { FECHA_DATOS, fechaLarga } from '@/lib/datos-frescura'
import {
  PROVINCE_MAP as CONSIG_PROVINCE_MAP,
  PROVINCE_DISPLAY as CONSIG_PROVINCE_DISPLAY,
} from './_views/ProvinceView'

const profiles = getAllProfiles()
const totalConsignatarias = profiles.length

// FAQ items targeting high-value search queries
const CONSIGNATARIAS_FAQ = [
  {
    question: '¿Qué es una consignataria de hacienda?',
    answer: 'Una consignataria de hacienda es una empresa intermediaria especializada en la comercialización de ganado. Organiza remates ganaderos donde productores consignan sus animales para venta. La consignataria se encarga de publicitar el remate, recibir la hacienda, organizar la subasta y garantizar el cobro, cobrando una comisión por sus servicios.',
  },
  {
    question: '¿Cuánto cobra de comisión una consignataria de hacienda?',
    answer: 'La comisión estándar de una consignataria de hacienda en Argentina es del 3% al 5% sobre el valor de venta, aunque puede variar según la operación. En remates especiales de reproductores o cabaña, la comisión puede ser mayor (hasta 8-10%). La comisión se cobra tanto al vendedor como al comprador en algunas operaciones.',
  },
  {
    question: '¿Cómo elegir una consignataria de hacienda?',
    answer: 'Para elegir una consignataria, considerá: 1) Trayectoria y reputación en la zona, 2) Volumen de operaciones y cantidad de remates, 3) Especialización en el tipo de hacienda que vendés (cría, invernada, reproductores), 4) Cobertura geográfica y logística, 5) Condiciones de pago y garantías. En consignatarias.com.ar podés comparar perfiles y ver el historial de remates de cada una.',
  },
  {
    question: '¿Cuál es la diferencia entre consignataria y rematador?',
    answer: 'La consignataria es la empresa responsable de organizar el remate, recibir la hacienda y garantizar la operación comercial. El rematador (o martillero) es la persona física con matrícula habilitante que conduce la subasta y adjudica la hacienda al mejor postor. Una consignataria puede tener varios rematadores, o contratar rematadores externos para sus remates.',
  },
  {
    question: '¿Qué tipos de remates ganaderos existen?',
    answer: 'Los principales tipos son: Remate General (hacienda mixta de distintas categorías), Remate de Invernada (terneros y vaquillonas para engorde), Remate de Cría (vientres preñados y reproductores), Remate Especial (animales de pedigrí o cabaña), y Remate de Hacienda Gorda (animales terminados para faena). Cada tipo tiene características y público objetivo diferente.',
  },
  {
    question: '¿Se puede participar en un remate ganadero online?',
    answer: 'Sí, la mayoría de las consignatarias argentinas ofrecen participación remota en sus remates. Podés ver la transmisión en vivo por TV (Canal Rural, Todo Agro) o streaming web, y ofertar por teléfono o plataforma digital. Para participar, debés registrarte previamente con la consignataria y obtener un número de postor.',
  },
  {
    question: '¿Las consignatarias están reguladas?',
    answer: 'Sí, las consignatarias de hacienda en Argentina están reguladas y deben inscribirse en el Registro de Consignatarios. Los rematadores necesitan matrícula habilitante de cada provincia donde operan. La Cámara Argentina de Consignatarios de Ganado (CACG) nuclea a las principales consignatarias y promueve buenas prácticas en el sector.',
  },
]

// Regenerate hourly for fresh TODAY
export const revalidate = false // Cost optimization: static at build time

export const metadata: Metadata = {
  title: `Consignatarias de Hacienda Argentina 2026 | Directorio Completo (${totalConsignatarias})`,
  description: `Directorio de ${totalConsignatarias} consignatarias de hacienda en Argentina. Calendario de remates ganaderos, provincias de operación, tipos de remate. Datos actualizados 2026.`,
  keywords: [
    'consignatarias argentina',
    'consignatarias de hacienda',
    'consignatarias de hacienda argentina',
    'directorio consignatarias',
    'remates ganaderos argentina',
    'calendario remates ganaderos',
    'subastas ganaderas',
    'consignatario de hacienda',
    'remates de hacienda',
    'ferias ganaderas argentina',
  ],
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: `Consignatarias de Hacienda Argentina | ${totalConsignatarias} en Directorio`,
    description: `Directorio completo de consignatarias de hacienda con calendario de remates ganaderos. ${totalConsignatarias} consignatarias activas en Argentina.`,
    url: 'https://www.consignatarias.com.ar/consignatarias',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/consignatarias',
  },
}

// Generate ItemList schema for consignatarias
function ConsignatariasItemListSchema({ entries }: { entries: Array<{ slug: string; displayName: string; auctionCount: number }> }) {
  const topItems = entries.slice(0, 10)
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Consignatarias de Hacienda Argentina',
    description: `Directorio de ${totalConsignatarias} consignatarias de hacienda con actividad en Argentina`,
    numberOfItems: totalConsignatarias,
    itemListElement: topItems.map((c, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        '@id': `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
        name: c.displayName,
        url: `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
    />
  )
}

export default async function ConsignatariasDirectoryPage() {
  const auctions = rematesData as Auction[]
  const today = new Date().toISOString().slice(0, 10)

  // PRO firms (featured=true OR active subscription) — single source of truth.
  const featured = await getFeaturedSlugs()

  const entries = profiles.map(p => {
    const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
    const upcoming = pAuctions.filter(a => a.date >= today).length
    const provinces = [...new Set(pAuctions.map(a => a.province))]
    const types = [...new Set(pAuctions.map(a => a.type))]
    return {
      slug: p.canonicalSlug,
      displayName: p.displayName,
      auctionCount: pAuctions.length,
      upcoming,
      provinces,
      types,
      isPro: featured.has(p.canonicalSlug),
    }
  }).sort((a, b) =>
    // Mismo orden que la vista por defecto del directorio (sortBy 'upcoming' en
    // ConsignatariasDirectoryClient): PRO, próximos remates, remates totales.
    // El ItemList del schema toma los primeros de acá y tiene que coincidir con
    // lo que el usuario ve arriba.
    (Number(b.isPro) - Number(a.isPro)) || (b.upcoming - a.upcoming) || (b.auctionCount - a.auctionCount)
  )

  // Calculate stats for intro
  const totalRemates = entries.reduce((sum, e) => sum + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((sum, e) => sum + e.upcoming, 0)
  const actualizado = fechaLarga()

  // SSG-crawleable province links: count consignatarias per province (only the
  // 13 provinces with real /consignatarias/[provincia] pages). A count > 0
  // implies the province page is statically generated. GSC demand
  // (provincialPages) puts entre-rios first; the rest fall back to count.
  const CONSIG_GSC_PRIORITY: Record<string, number> = { 'entre-rios': 1 }
  const provinceLinks = Object.entries(CONSIG_PROVINCE_MAP)
    .map(([slug, provinceName]) => ({
      slug,
      name: CONSIG_PROVINCE_DISPLAY[slug] ?? provinceName,
      count: entries.filter((e) => e.provinces.includes(provinceName)).length,
    }))
    .filter((p) => p.count > 0)
    .sort(
      (a, b) =>
        (CONSIG_GSC_PRIORITY[b.slug] ?? 0) - (CONSIG_GSC_PRIORITY[a.slug] ?? 0) ||
        b.count - a.count,
    )

  return (
    <>
      <SectionBreadcrumbSchema section="consignatarias" sectionName="Consignatarias" />
      <FAQPageSchema items={CONSIGNATARIAS_FAQ} />
      <ConsignatariasItemListSchema entries={entries} />

      {/* Encabezado: qué es y qué hacer, en una línea. El banner de la guía de
          apertura que iba arriba de todo se fue: le hablaba al que quiere ABRIR
          una consignataria, no al productor que busca con quién operar. La oferta
          de la guía sigue al pie (OfrecerGuia), después del directorio. */}
      <header className="mx-auto max-w-5xl px-4 pt-6 pb-2 sm:px-6">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Consignatarias de hacienda en Argentina</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          Las {totalConsignatarias} consignatarias que rematan hacienda en el país, con su próximo remate y
          dónde operan. Buscá por nombre o elegí tu provincia.
        </p>
        {actualizado && (
          <p className="mt-1 text-sm text-zinc-500">
            Actualizado el <time dateTime={FECHA_DATOS ?? undefined}>{actualizado}</time>.
          </p>
        )}
      </header>

      <ConsignatariasDirectoryClient entries={entries} provinceLinks={provinceLinks} />

      {/* Texto descriptivo (SEO): abajo, para el que quiera leerlo. */}
      <section className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
        <div className="terminal-panel p-panel text-sm leading-relaxed text-zinc-400">
          <h2 className="mb-2 text-base font-semibold text-ink">Sobre este directorio</h2>
          <p className="mb-2">
            Listado de <strong className="text-zinc-200">{totalConsignatarias} consignatarias de hacienda</strong> con
            actividad en Argentina: hay <strong className="text-zinc-200">{totalRemates} remates</strong> en el
            sistema, <strong className="text-zinc-200">{totalUpcoming} próximos</strong>.
          </p>
          <p>
            Cada consignataria tiene un perfil con su calendario anual de remates, los tipos que hace (general,
            especial, invernada, reproductores), las provincias donde opera y el cronograma completo. Los datos se
            actualizan todos los días desde fuentes públicas{actualizado ? ` (última actualización: ${actualizado})` : ''}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
        <FaqList items={CONSIGNATARIAS_FAQ} />
      </section>

      {/* Después del directorio: el que recorrió las firmas y piensa en abrir la suya */}
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <OfrecerGuia
          desde="directorio"
          titulo="¿Pensás abrir la tuya? Lo que el directorio no muestra"
          loQueAgrega={[
            'El paso a paso para habilitarse: matrícula de martillero, sociedad y ARCA, SIOCAL (ex RUCA) y SENASA, con costos y plazos.',
            'El circuito completo de un remate feria, día por día, y la liquidación renglón por renglón.',
            'Cobranza, plazos y el descalce financiero explicado con números; seis defaults reales con nombre, fecha y monto.',
            'Un plan de marketing digital para conseguir los primeros consignantes.',
          ]}
          gratisAca="El directorio, los perfiles y el calendario de remates siguen siendo gratis. La guía es para el que quiere estar en esta lista con firma propia."
        />
      </div>
    </>
  )
}
