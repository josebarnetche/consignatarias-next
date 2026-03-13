import { Metadata } from 'next'
import CalendarExportClient from './CalendarExportClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Exportar Calendario de Remates | Consignatarias.com.ar',
  description: 'Descargá el calendario de remates ganaderos en formato iCal. Sincronizá automáticamente con Google Calendar, Apple Calendar o Outlook.',
  openGraph: {
    title: 'Exportar Calendario de Remates | Consignatarias.com.ar',
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
      <CalendarExportClient />
    </>
  )
}
