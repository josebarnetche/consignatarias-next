import { Metadata } from 'next'
import CalendarExportClient from './CalendarExportClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { RequirePro } from '@/components/RequirePro'

export const metadata: Metadata = {
  title: 'Exportar Calendario de Remates',
  description: 'Descargá el calendario de remates ganaderos en formato iCal. Sincronizá automáticamente con Google Calendar, Apple Calendar o Outlook.',
  openGraph: {
    title: 'Exportar Calendario de Remates',
    description: 'Sincronizá los remates ganaderos con tu calendario. Google Calendar, Apple Calendar, Outlook.',
    url: 'https://www.consignatarias.com.ar/calendario-exportar',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/calendario-exportar',
  },
}

export default function CalendarioExportarPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="calendario-exportar" sectionName="Exportar Calendario" />
      <div className="px-4 py-6">
        <RequirePro
          feature="Sincronizar todos los remates con tu calendario (iCal)"
          redirectTo="/calendario-exportar"
        >
          <CalendarExportClient />
        </RequirePro>
      </div>
    </>
  )
}
