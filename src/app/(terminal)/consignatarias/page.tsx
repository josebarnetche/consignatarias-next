import { Metadata } from 'next'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import ConsignatariasDirectoryClient from './ConsignatariasDirectoryClient'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function ConsignatariasDirectoryPage() {
  const auctions = rematesData as Auction[]
  const today = new Date().toISOString().slice(0, 10)

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
    }
  }).sort((a, b) => b.auctionCount - a.auctionCount)

  // Calculate stats for intro
  const totalRemates = entries.reduce((sum, e) => sum + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((sum, e) => sum + e.upcoming, 0)

  return (
    <>
      <SectionBreadcrumbSchema section="consignatarias" sectionName="Consignatarias" />
      <FAQPageSchema items={CONSIGNATARIAS_FAQ} />
      <ConsignatariasItemListSchema entries={entries} />
      
      {/* SEO-optimized intro section */}
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-4xl">
        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Directorio de Consignatarias de Hacienda en Argentina
        </h1>
        <p className="mb-3">
          Listado completo de <strong className="text-zinc-200">{totalConsignatarias} consignatarias de hacienda</strong> con 
          actividad en Argentina. Actualmente hay <strong className="text-zinc-200">{totalRemates} remates programados</strong> en 
          el sistema, con <strong className="text-zinc-200">{totalUpcoming} próximos</strong> a realizarse.
        </p>
        <p className="text-zinc-500 text-xs">
          Cada consignataria tiene un perfil dedicado con calendario anual de remates, distribución por tipo 
          (general, especial, invernada, reproductores), provincias de operación y cronograma completo. 
          Datos actualizados diariamente desde fuentes públicas.
        </p>
      </section>
      
      <ConsignatariasDirectoryClient entries={entries} />
    </>
  )
}
