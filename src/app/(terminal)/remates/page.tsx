import { Metadata } from 'next'
import RematesClient from './RematesClient'
import rematesData from '@/lib/data/remates.json'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

// Month names in Spanish
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date()
  const monthName = MONTHS_ES[now.getMonth()]
  const year = now.getFullYear()
  const totalAuctions = rematesData.length
  
  return {
    title: `Remates Ganaderos ${monthName} ${year} — Calendario Argentina`,
    description: `Calendario de ${totalAuctions} remates ganaderos en Argentina, ${monthName} ${year}. Filtrá por provincia, tipo de remate y fecha. Actualizado diariamente.`,
    keywords: [
      'remates ganaderos',
      'calendario remates',
      `remates ${monthName.toLowerCase()} ${year}`,
      'subastas hacienda',
      'remates invernada',
      'remates cria',
      'consignatarias argentina',
    ],
    openGraph: {
      title: `Remates Ganaderos ${monthName} ${year} | Consignatarias.com.ar`,
      description: `Calendario de ${totalAuctions} remates ganaderos en Argentina. Filtros por provincia, tipo y fecha.`,
      url: 'https://www.consignatarias.com.ar/remates',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates',
    },
  }
}

export default function RematesPage() {
  const totalAuctions = rematesData.length
  const totalProfiles = getAllProfiles().length
  const provinces = new Set(rematesData.map((r) => r.province))
  const totalProvinces = provinces.size

  return (
    <>
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-3xl">
        <h2 className="text-zinc-200 text-lg font-medium mb-2">Calendario de remates ganaderos de Argentina</h2>
        <p>
          Calendario unificado con {totalAuctions} remates de hacienda de {totalProfiles} consignatarias
          en {totalProvinces} provincias argentinas. Los datos se actualizan automaticamente cada dia a las
          14:00 (hora argentina) desde fuentes como la Camara Argentina de Consignatarios (CACG), Colombo
          y Colombo, Ivan L. O&apos;Farrell, Cooperativa Lehmann, UMC Haciendas Villaguay y otras. Filtra
          por provincia, tipo de remate (invernada, cria, general, reproductores, especial), categoria de
          hacienda o periodo. Cada remate incluye fecha, hora, ubicacion, consignataria responsable, cabezas
          estimadas y links a catalogos y transmisiones en vivo.
        </p>
      </section>
      <RematesClient />
    </>
  )
}
