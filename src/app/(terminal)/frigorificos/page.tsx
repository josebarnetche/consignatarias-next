import { Metadata } from 'next'
import FrigorificosClient from './FrigorificosClient'
import frigorificosData from '@/lib/data/frigorificos.json'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Directorio de Frigoríficos MAGYP Argentina',
  description: 'Base de datos completa de 364 plantas frigoríficas habilitadas por MAGYP. Busca por nombre, filtra por provincia o etapa habilitada.',
  keywords: [
    'frigorificos argentina',
    'plantas frigorificas MAGYP',
    'directorio frigorificos',
    'plantas faena habilitadas',
    'ciclo II ciclo III',
  ],
  openGraph: {
    title: 'Directorio de 364 Frigoríficos Argentina | Consignatarias.com.ar',
    description: 'Plantas frigoríficas habilitadas por MAGYP. Datos oficiales: CUIT, matrícula, provincia, etapa.',
    url: 'https://www.consignatarias.com.ar/frigorificos',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos',
  },
}

export default function FrigorificosPage() {
  const totalFrigorificos = frigorificosData.length

  return (
    <>
      <SectionBreadcrumbSchema section="frigorificos" sectionName="Frigorificos" />
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-3xl">
        <h2 className="text-zinc-200 text-lg font-medium mb-2">Directorio de plantas frigorificas de Argentina</h2>
        <p>
          Directorio completo de plantas frigorificas habilitadas por el Ministerio de Agricultura,
          Ganaderia y Pesca (MAGYP) de Argentina. Incluye {totalFrigorificos} establecimientos con datos
          oficiales: razon social, CUIT, matricula, provincia, localidad, clasificacion por etapa (Transito
          Federal, Ciclo I, Ciclo II, Ciclo III) y tipo de faena (bovinos, porcinos, ovinos, aves). Los datos
          provienen del registro oficial de SENASA/MAGYP.
        </p>
      </section>
      <FrigorificosClient />
    </>
  )
}
