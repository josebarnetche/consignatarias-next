import { Metadata } from 'next'
import CalendarExportClient from './CalendarExportClient'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { RequirePro } from '@/components/RequirePro'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import type { RemateCalendario } from '@/components/calendario/multiSelectUtils'

// Solo lo que el exportador usa: remates desde hoy y los campos del .ics. Pasarlo por
// props en vez de importar remates.json en el cliente saca ~700 KB del bundle. Desde
// "hoy" del build: el scrape diario commitea y redeploya, y el cliente igual vuelve a
// filtrar por la fecha del navegador.
function rematesParaExportar(): RemateCalendario[] {
  const hoy = new Date().toISOString().slice(0, 10)
  return (rematesData as Auction[])
    .filter((a) => a.date >= hoy)
    .map((a) => ({
      id: a.id,
      title: a.title,
      consignatariaName: a.consignatariaName,
      consignatariaSlug: a.consignatariaSlug,
      date: a.date,
      time: a.time,
      location: a.location,
      province: a.province,
      type: a.type,
      estimatedHeads: a.estimatedHeads,
      catalogUrl: a.catalogUrl,
      youtubeUrl: a.youtubeUrl,
    }))
}

export const metadata: Metadata = {
  title: 'Exportar Calendario de Remates',
  description: 'Descargá el calendario de remates ganaderos en formato iCal. Sincronizá automáticamente con Google Calendar, Apple Calendar o Outlook.',
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
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
          <CalendarExportClient auctions={rematesParaExportar()} />
        </RequirePro>
      </div>
    </>
  )
}
