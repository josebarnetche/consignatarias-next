import { Metadata } from 'next'
import { Suspense } from 'react'
import FrigorificosClient from './FrigorificosClient'
import frigorificosData from '@/lib/data/frigorificos.json'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import NewsletterSignup from '@/components/NewsletterSignup'
import { FaenaStats } from '@/components/FaenaStats'

const totalFrigorificos = frigorificosData.length

export const metadata: Metadata = {
  title: `Frigoríficos Habilitados Argentina 2026 | Directorio MAGYP Completo (${totalFrigorificos})`,
  description: `Directorio completo de ${totalFrigorificos} frigoríficos y mataderos habilitados por MAGYP/SENASA en Argentina. Buscar por provincia, matrícula, etapa de habilitación. Datos oficiales actualizados 2026.`,
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
          Directorio de Frigoríficos Habilitados en Argentina
        </h1>
        <p className="mb-3">
          Listado completo de <strong className="text-zinc-200">{totalFrigorificos} frigoríficos y mataderos</strong> con 
          habilitación oficial MAGYP (SENASA) en Argentina. Incluye establecimientos de faena bovina, porcina, 
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
                📊 Recibí el reporte semanal de faena
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Volúmenes por frigorífico, precios INMAG y tendencias del mercado.
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
        
        {/* Live faena stats from government API */}
        <div className="mt-4">
          <Suspense fallback={<div className="h-32 animate-pulse bg-zinc-900/50 rounded-lg" />}>
            <FaenaStats />
          </Suspense>
        </div>
      </section>
      
      <FrigorificosClient />
    </>
  )
}
