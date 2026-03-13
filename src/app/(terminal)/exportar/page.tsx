import { Metadata } from 'next'
import ExportarClient from './ExportarClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Exportar Datos de Remates | Consignatarias.com.ar',
  description: 'Descargá los datos de remates ganaderos en formato CSV o JSON. Filtros por provincia, tipo y fecha.',
  openGraph: {
    title: 'Exportar Datos de Remates | Consignatarias.com.ar',
    description: 'Descargá remates en CSV o JSON para análisis.',
    url: 'https://www.consignatarias.com.ar/exportar',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/exportar',
  },
}

export default function ExportarPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="exportar" sectionName="Exportar" />
      <ExportarClient />
    </>
  )
}
