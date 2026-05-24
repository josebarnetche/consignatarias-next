import { Metadata } from 'next'
import { Suspense } from 'react'
import FrigorificosClient from './FrigorificosClient'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import NewsletterSignup from '@/components/NewsletterSignup'
import { FaenaStats } from '@/components/FaenaStats'
import { MagActivity } from '@/components/MagActivity'
import { getSenasaScrapedDate } from '@/lib/data/senasa-habilitados'

const totalFrigorificos = frigorificosData.length
const senasaActiveCount = frigorificosData.filter(f => (f as { senasaActive?: boolean }).senasaActive === true).length
const senasaInactiveCount = frigorificosData.filter(f => (f as { senasaActive?: boolean }).senasaActive === false).length

export const metadata: Metadata = {
  // Exact-match the money query "listado de frigoríficos habilitados por senasa"
  // (was pos ~6 with high impressions). "Listado" + "SENASA" front-loaded.
  title: `Listado de Frigoríficos Habilitados por SENASA 2026 · Argentina (${totalFrigorificos})`,
  description: `Listado completo de ${totalFrigorificos} frigoríficos y mataderos habilitados por SENASA/MAGYP en Argentina. Buscá por provincia, matrícula y etapa de habilitación (Ciclo I/II/III). Registro oficial actualizado 2026.`,
  keywords: [
    'frigorificos argentina',
    'frigorificos habilitados',
    'mataderos argentina',
    'plantas frigorificas MAGYP',
    'directorio frigorificos SENASA',
    'frigorificos habilitados SENASA',
    'plantas de faena argentina',
    'frigorificos por provincia',
    'ciclo I ciclo II ciclo III',
    'establecimientos faena bovina',
  ],
  openGraph: {
    title: `Frigoríficos Habilitados Argentina 2026 | ${totalFrigorificos} Plantas MAGYP`,
    description: `Directorio completo de frigoríficos y mataderos habilitados en Argentina. ${totalFrigorificos} establecimientos con datos oficiales SENASA: CUIT, matrícula, provincia, etapa de habilitación.`,
    url: 'https://www.consignatarias.com.ar/frigorificos',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos',
  },
}

// Generate ItemList schema for rich snippets
function FrigorificosItemListSchema() {
  // Take first 10 frigorificos for schema (Google recommends max 10-20 items)
  const topItems = frigorificosData.slice(0, 10)
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Frigoríficos Habilitados Argentina',
    description: `Directorio de ${totalFrigorificos} frigoríficos y mataderos con habilitación MAGYP/SENASA en Argentina`,
    numberOfItems: totalFrigorificos,
    itemListElement: topItems.map((f: { cuit: string; name: string; matricula: string }, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        '@id': `https://www.consignatarias.com.ar/frigorificos/${f.cuit}`,
        name: f.name,
        url: `https://www.consignatarias.com.ar/frigorificos/${f.cuit}`,
        identifier: f.matricula,
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

export default function FrigorificosPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="frigorificos" sectionName="Frigoríficos" />
      <FrigorificosItemListSchema />
      
      {/* SEO-optimized intro section */}
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-4xl">
        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Listado de Frigoríficos Habilitados por SENASA en Argentina
        </h1>
        <p className="mb-3">
          Listado completo de <strong className="text-zinc-200">{totalFrigorificos} frigoríficos y mataderos</strong> con
          habilitación oficial SENASA/MAGYP en Argentina. Incluye establecimientos de faena bovina, porcina,
          ovina y aviar en las <strong className="text-zinc-200">24 provincias</strong>.
        </p>
        <p className="text-zinc-500 text-xs">
          Datos oficiales actualizados: razón social, CUIT, matrícula, ubicación y clasificación por etapa 
          (Tránsito Federal, Ciclo I, Ciclo II, Ciclo III). Fuente: Registro Nacional de Establecimientos SENASA/MAGYP.
        </p>
        
        {/* Email capture CTA */}
        <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-zinc-300 text-sm font-medium">
                📊 Recibí el reporte mensual de faena
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Faena nacional, variación interanual y tendencias del mercado. Una vez por mes.
              </p>
            </div>
            <NewsletterSignup 
              source="frigorificos" 
              buttonText="Suscribirme" 
              placeholder="tu@email.com"
              compact
            />
          </div>
        </div>
        
        {/* Faena nacional — fuente oficial (datos.gob.ar) */}
        <div className="mt-4">
          <Suspense fallback={<div className="h-32 animate-pulse bg-zinc-900/50 rounded-lg" />}>
            <FaenaStats />
          </Suspense>
        </div>

        {/* Actividad MAG — nuestro relevamiento diario (scrapeado) */}
        <div className="mt-4">
          <MagActivity />
        </div>
      </section>

      {/* SENASA verification transparency banner */}
      <section className="px-4 mb-3 max-w-6xl mx-auto">
        <div className="terminal-panel">
          <div className="px-panel py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-live" />
                <span className="text-xxs font-terminal uppercase tracking-wider text-positive">
                  Verificación SENASA · al {getSenasaScrapedDate()}
                </span>
              </div>
              <p className="text-data font-terminal text-zinc-400 mt-1 leading-relaxed">
                <span className="text-positive tabular-nums">{senasaActiveCount.toLocaleString('es-AR')}</span> habilitados activos ·{' '}
                <span className="text-zinc-500 tabular-nums">{senasaInactiveCount.toLocaleString('es-AR')}</span> sin verificación (CUIT no aparece hoy en el registro oficial Ciclo I/II/III).
              </p>
            </div>
            <Link
              href="/planes"
              className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright border border-accent/30 rounded-terminal px-3 py-1.5 shrink-0 transition-colors hover:bg-accent/10"
            >
              Detalle SENASA con PRO →
            </Link>
          </div>
        </div>
      </section>

      <FrigorificosClient />
    </>
  )
}
