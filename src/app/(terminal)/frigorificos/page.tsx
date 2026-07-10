import { Metadata } from 'next'
import { Suspense } from 'react'
import FrigorificosClient from './FrigorificosClient'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import { SectionBreadcrumbSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import NewsletterSignup from '@/components/NewsletterSignup'
import { FaenaStats } from '@/components/FaenaStats'
import { MagActivity } from '@/components/MagActivity'
import { getSenasaScrapedDate, getSenasaHabilitadosCount } from '@/lib/data/senasa-habilitados'
import { frigorificoProvinceSlugs } from './_views/FrigorificoProvinceView'
import SinceLastVisit from '@/components/landing/SinceLastVisit'
import FreshnessStamp from '@/components/landing/FreshnessStamp'

const totalFrigorificos = frigorificosData.length

// Answer-first number for the money query "listado de frigoríficos habilitados por SENASA".
// N = conteo del dataset SENASA (CUIT distintos en el registro oficial Ciclo I/II/III),
// NO el total del directorio (que incluye históricos sin verificación). Es el dato honesto
// que responde "cuántos hay habilitados". Coincide con senasaActiveCount.
const habilitadosCount = getSenasaHabilitadosCount()
const senasaScrapedDate = getSenasaScrapedDate()

// Snapshot server para "Desde tu última visita" (mismo patrón que /overview).
const TODAY = new Date().toISOString().slice(0, 10)
const inmagSeries = marketPrices.inmag.series
const inmagSnapshotDate = inmagSeries[inmagSeries.length - 1]?.date ?? marketPrices.lastUpdate
const rematesUpcomingSnapshot = rematesData
  .filter((r) => r.date >= TODAY && r.status === 'scheduled')
  .map((r) => ({ date: r.date }))
const senasaActiveCount = frigorificosData.filter(f => (f as { senasaActive?: boolean }).senasaActive === true).length
const senasaInactiveCount = frigorificosData.filter(f => (f as { senasaActive?: boolean }).senasaActive === false).length

// ── Grilla de listados provinciales (completa el cluster /frigorificos/{provincia}) ──
// Solo se enlazan provincias con ruta real (slug en frigoricoProvinceSlugs); el resto
// del directorio (CABA, "sin determinar", La Rioja) no tiene vista propia → se omite.
const PROVINCE_DISPLAY: Record<string, string> = {
  'BUENOS AIRES': 'Buenos Aires', 'SANTA FE': 'Santa Fe', 'CORDOBA': 'Córdoba',
  'ENTRE RIOS': 'Entre Ríos', 'LA PAMPA': 'La Pampa', 'CHACO': 'Chaco',
  'CORRIENTES': 'Corrientes', 'SANTIAGO DEL ESTERO': 'Santiago del Estero',
  'FORMOSA': 'Formosa', 'MISIONES': 'Misiones', 'TUCUMAN': 'Tucumán', 'SALTA': 'Salta',
  'JUJUY': 'Jujuy', 'CATAMARCA': 'Catamarca', 'MENDOZA': 'Mendoza', 'SAN JUAN': 'San Juan',
  'SAN LUIS': 'San Luis', 'NEUQUEN': 'Neuquén', 'RIO NEGRO': 'Río Negro', 'CHUBUT': 'Chubut',
  'SANTA CRUZ': 'Santa Cruz', 'TIERRA DEL FUEGO': 'Tierra del Fuego',
}
const validProvinceSlugs = new Set(frigorificoProvinceSlugs())
const provinceCounts = frigorificosData.reduce<Record<string, number>>((acc, f) => {
  const p = (f as { province?: string }).province
  if (p) acc[p] = (acc[p] ?? 0) + 1
  return acc
}, {})
const provinceGrid = Object.entries(provinceCounts)
  .map(([name, count]) => ({
    name,
    count,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    display: PROVINCE_DISPLAY[name] ?? name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  }))
  .filter((p) => validProvinceSlugs.has(p.slug))
  .sort((a, b) => b.count - a.count)

// ── FAQ real (las preguntas que la IA/buscador recibe sobre este listado) ──
const FRIGORIFICOS_FAQ = [
  {
    question: '¿Cuántos frigoríficos habilitados por SENASA hay en Argentina?',
    answer: `${habilitadosCount} establecimientos con CUIT distinto figuran en el registro oficial de SENASA/MAGYP (Ciclo I - Matadero Frigorífico, Ciclo II - Elaborador, Ciclo III - Dador de Frío), según el relevamiento al ${senasaScrapedDate}. El listado completo es filtrable por provincia, matrícula y ciclo, con CUIT.`,
  },
  {
    question: '¿Cómo verifico si un frigorífico está habilitado por SENASA?',
    answer: `Se busca el establecimiento por CUIT o matrícula y se contrasta contra el registro público de SENASA (aps2.senasa.gov.ar, Ciclo I/II/III). En este directorio, al ${senasaScrapedDate}, ${senasaActiveCount.toLocaleString('es-AR')} figuran como habilitados activos (su CUIT aparece hoy en el registro oficial) y ${senasaInactiveCount.toLocaleString('es-AR')} sin verificación (CUIT que no aparece en el relevamiento vigente).`,
  },
  {
    question: '¿Qué significa el ciclo I, II y III de un frigorífico?',
    answer: 'Ciclo I (Matadero Frigorífico): faena animales y produce/almacena carne con frío. Ciclo II (Elaborador): procesa carne y menudencias sin faenar (chacinados, cortes, elaborados). Ciclo III (Dador de Frío): opera cámaras frigoríficas para depósito de carnes y menudencias, sin faena ni elaboración. Un establecimiento puede tener más de un ciclo habilitado.',
  },
]

export const metadata: Metadata = {
  // Exact-match the money query "listado de frigoríficos habilitados por senasa" (already
  // ~9.6% CTR at pos 5.5). Moved the count INTO the lead (it was truncating off the end as
  // "(364)") and dropped the redundant "· Argentina". Description adds the live
  // "X verificados activos hoy" freshness hook. v1.40 CTR pass.
  title: `Listado de Frigoríficos Habilitados por SENASA: ${habilitadosCount} por Provincia`,
  description: `Argentina tiene ${habilitadosCount} frigoríficos habilitados por SENASA/MAGYP (Ciclo I/II/III). Listado oficial completo, filtrable por provincia, con CUIT y matrícula. Verificación al ${senasaScrapedDate}.`,
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
    title: `Listado de Frigoríficos Habilitados por SENASA | ${habilitadosCount} por Provincia`,
    description: `Listado oficial de ${habilitadosCount} frigoríficos habilitados por SENASA/MAGYP en Argentina, filtrable por provincia y ciclo (I/II/III), con CUIT y matrícula. Verificado al ${senasaScrapedDate}.`,
    url: 'https://www.consignatarias.com.ar/frigorificos',
    type: 'website',
    images: [{ url: '/og-frigorificos.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos',
  },
}

// Generate ItemList schema for rich snippets
function FrigorificosItemListSchema() {
  // First ~50 establecimientos habilitados activos (CUIT vigente en el registro SENASA).
  const topItems = frigorificosData
    .filter((f) => (f as { senasaActive?: boolean }).senasaActive === true)
    .slice(0, 50)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Frigoríficos habilitados por SENASA en Argentina',
    description: `Listado de ${habilitadosCount} frigoríficos y mataderos con habilitación vigente SENASA/MAGYP (Ciclo I/II/III) en Argentina`,
    numberOfItems: habilitadosCount,
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
      <SinceLastVisit
        snapshot={{
          inmagDate: inmagSnapshotDate,
          inmagValue: marketPrices.inmag.current,
          inmagChange: marketPrices.inmag.change,
          rematesUpcoming: rematesUpcomingSnapshot,
          lastUpdate: marketPrices.lastUpdate,
        }}
      />
      <SectionBreadcrumbSchema section="frigorificos" sectionName="Frigoríficos" />
      <FrigorificosItemListSchema />
      <FAQPageSchema items={FRIGORIFICOS_FAQ} />
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/frigorificos"
        headline={`Listado de ${habilitadosCount} frigoríficos habilitados por SENASA en Argentina`}
      />

      {/* SEO-optimized intro section — answer-first */}
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-4xl">
        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Listado de frigoríficos habilitados por SENASA en Argentina
        </h1>
        <p className="mb-3 speakable-content">
          Argentina tiene <strong className="text-zinc-200">{habilitadosCount} frigoríficos habilitados por SENASA</strong> (registro
          oficial SENASA/MAGYP, Ciclo I/II/III, relevado el {senasaScrapedDate}); este es el listado oficial
          completo, filtrable por provincia y ciclo (I/II/III), con CUIT y matrícula.
        </p>
        <p className="mb-3">
          El directorio indexa <strong className="text-zinc-200">{totalFrigorificos.toLocaleString('es-AR')} establecimientos</strong> en
          total —{senasaActiveCount.toLocaleString('es-AR')} con habilitación vigente y {senasaInactiveCount.toLocaleString('es-AR')} sin
          verificación hoy en el registro oficial— entre plantas de faena bovina, porcina, ovina y aviar.
        </p>
        <p className="text-zinc-500 text-xs">
          Datos oficiales actualizados: razón social, CUIT, matrícula, ubicación y clasificación por etapa
          (Tránsito Federal, Ciclo I, Ciclo II, Ciclo III). Fuente: Registro Nacional de Establecimientos SENASA/MAGYP.
        </p>

        {/* Listados provinciales — completa el cluster /frigorificos/{provincia} */}
        <nav aria-label="Frigoríficos por provincia" className="mt-4">
          <h2 className="text-zinc-300 text-sm font-medium mb-2">Frigoríficos habilitados por provincia</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {provinceGrid.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/frigorificos/${p.slug}`}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900/40 hover:border-accent/40 hover:bg-accent/5 transition-colors"
                >
                  <span className="text-zinc-300 text-xs truncate">{p.display}</span>
                  <span className="text-zinc-500 text-xxs tabular-nums shrink-0">{p.count.toLocaleString('es-AR')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

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
              <div className="mt-1.5">
                <FreshnessStamp updatedAt={marketPrices.lastUpdate} />
              </div>
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

      {/* FAQ — respuestas citables (mismo contenido que FAQPageSchema) */}
      <section className="px-4 mt-6 mb-8 max-w-4xl" aria-label="Preguntas frecuentes sobre frigoríficos habilitados por SENASA">
        <h2 className="text-zinc-200 text-base font-semibold mb-3">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FRIGORIFICOS_FAQ.map((item) => (
            <details key={item.question} className="group border border-zinc-800 rounded-lg bg-zinc-900/40 px-4 py-3">
              <summary className="text-zinc-200 text-sm font-medium cursor-pointer list-none flex items-center justify-between gap-2">
                {item.question}
                <span className="text-zinc-600 text-xs group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-zinc-400 text-sm leading-relaxed mt-2">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
