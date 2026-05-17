import { Metadata } from 'next'
import ReporteSemanalClient from './ReporteSemanalClient'
import { SectionBreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'
import { RequirePro } from '@/components/RequirePro'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Reporte Semanal del Mercado Ganadero',
  description: 'Descargá el reporte semanal con precios INMAG, próximos remates y tendencias del mercado ganadero argentino.',
  openGraph: {
    title: 'Reporte Semanal del Mercado Ganadero',
    description: 'Precios INMAG, próximos remates y tendencias. Descargá gratis.',
    url: 'https://www.consignatarias.com.ar/reporte-semanal',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/reporte-semanal',
  },
}

export default function ReporteSemanalPage() {
  const auctions = rematesData as Auction[]
  const today = new Date().toISOString().slice(0, 10)
  
  // Today's remates
  const rematesHoy = auctions
    .filter(a => a.date === today)
    .sort((a, b) => (b.estimatedHeads || 0) - (a.estimatedHeads || 0))
  
  // Next 7 days
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().slice(0, 10)
  
  const upcomingRemates = auctions
    .filter(a => a.date >= today && a.date <= nextWeekStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Stats
  const totalCabezas = upcomingRemates.reduce((s, a) => s + (a.estimatedHeads || 0), 0)
  const provincias = [...new Set(upcomingRemates.map(a => a.province))]
  const consignatarias = [...new Set(upcomingRemates.map(a => a.consignatariaName))]

  const reportData = {
    fecha: new Date().toLocaleDateString('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    inmag: marketPrices.inmag,
    categories: marketPrices.categories,
    usdBlue: marketPrices.usdBlue,
    corn: marketPrices.corn,
    rematesHoy: rematesHoy.map(r => ({
      fecha: r.date,
      consignataria: r.consignatariaName,
      ubicacion: r.location,
      tipo: r.type,
      cabezas: r.estimatedHeads,
    })),
    remates: {
      total: upcomingRemates.length,
      cabezas: totalCabezas,
      provincias: provincias.length,
      consignatarias: consignatarias.length,
      top5: upcomingRemates.slice(0, 5).map(r => ({
        fecha: r.date,
        consignataria: r.consignatariaName,
        ubicacion: r.location,
        tipo: r.type,
        cabezas: r.estimatedHeads,
      }))
    }
  }

  return (
    <>
      <SectionBreadcrumbSchema section="reporte-semanal" sectionName="Reporte Semanal" />
      <WebApplicationSchema
        name="Reporte Semanal del Mercado Ganadero"
        description="Generador de reportes semanales con precios INMAG, próximos remates y tendencias del mercado ganadero argentino. Descarga en PDF."
        url="https://www.consignatarias.com.ar/reporte-semanal"
        applicationCategory="FinanceApplication"
        features={[
          'Precios INMAG en tiempo real',
          'Próximos remates de la semana',
          'Tendencias del mercado',
          'Descarga en PDF',
        ]}
      />
      <div className="px-4 py-6">
        <RequirePro
          feature="Descargar el reporte semanal del mercado en PDF"
          redirectTo="/reporte-semanal"
        >
          <ReporteSemanalClient data={reportData} />
        </RequirePro>
      </div>
    </>
  )
}
