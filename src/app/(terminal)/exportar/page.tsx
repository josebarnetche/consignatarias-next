import { Metadata } from 'next'
import ExportarClient from './ExportarClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import { RequirePro } from '@/components/RequirePro'

export const metadata: Metadata = {
  title: 'Exportar Datos de Remates',
  description: 'Descargá los datos de remates ganaderos en formato CSV o JSON. Filtros por provincia, tipo y fecha.',
  openGraph: {
    title: 'Exportar Datos de Remates',
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
      <WebApplicationSchema
        name="Exportar Datos de Remates"
        description="Herramienta para descargar datos de remates ganaderos en formato CSV o JSON con filtros avanzados."
        url="https://www.consignatarias.com.ar/exportar"
        applicationCategory="DeveloperApplication"
        features={[
          'Exportación CSV',
          'Exportación JSON',
          'Filtro por provincia',
          'Filtro por tipo de remate',
          'Filtro por fecha',
          'Descarga ilimitada para PRO',
        ]}
      />
      <div className="px-4 py-6">
        <RequirePro
          feature="Exportar el calendario completo en CSV o JSON"
          redirectTo="/exportar"
        >
          <ExportarClient />
        </RequirePro>
      </div>
    </>
  )
}
