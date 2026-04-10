import { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import RematesClient from './RematesClient'
import rematesData from '@/lib/data/remates.json'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema, FAQPageSchema, RematesListSchema } from '@/components/seo/JsonLd'
import NewsletterSignup from '@/components/NewsletterSignup'

// Regenerate hourly for fresh TODAY
export const revalidate = 3600

// Month names in Spanish
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date()
  const monthName = MONTHS_ES[now.getMonth()]
  const year = now.getFullYear()
  const totalAuctions = rematesData.length
  
  return {
    title: `Remates Ganaderos ${monthName} ${year} — Calendario Argentina`,
    description: `Calendario de ${totalAuctions} remates ganaderos en Argentina, ${monthName} ${year}. Filtrá por provincia, tipo de remate y fecha. Actualizado diariamente.`,
    keywords: [
      'remates ganaderos',
      'calendario remates',
      `remates ${monthName.toLowerCase()} ${year}`,
      'subastas hacienda',
      'remates invernada',
      'remates cria',
      'consignatarias argentina',
    ],
    openGraph: {
      title: `Remates Ganaderos ${monthName} ${year} | Consignatarias.com.ar`,
      description: `Calendario de ${totalAuctions} remates ganaderos en Argentina. Filtros por provincia, tipo y fecha.`,
      url: 'https://www.consignatarias.com.ar/remates',
      type: 'website',
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates',
    },
  }
}

// FAQ items for rich snippets
const FAQ_ITEMS = [
  {
    question: '¿Qué es un remate ganadero?',
    answer: 'Un remate ganadero es una subasta pública de hacienda (ganado bovino, ovino, porcino u otros) organizada por una consignataria de hacienda. Los productores consignan sus animales y los compradores ofertan en vivo o por TV/streaming. Es el principal método de comercialización de ganado en Argentina.',
  },
  {
    question: '¿Cómo puedo participar en un remate ganadero?',
    answer: 'Para participar como comprador, debés registrarte previamente en la consignataria organizadora, presentar documentación (CUIT, habilitación SENASA) y obtener una paleta de postor. Podés asistir presencialmente a la feria o participar a través de transmisiones en vivo por TV o internet.',
  },
  {
    question: '¿Qué tipos de remates ganaderos existen?',
    answer: 'Los principales tipos son: remates de invernada (terneros y vaquillonas para engorde), remates de cría (vientres y reproductores), remates generales (hacienda mixta), remates especiales (animales de pedigrí o exposición) y remates de hacienda gorda (animales terminados para faena).',
  },
  {
    question: '¿Cada cuánto se actualizan los datos del calendario?',
    answer: 'El calendario de consignatarias.com.ar se actualiza automáticamente todos los días a las 14:00 hora argentina (ART). Los datos provienen de fuentes oficiales como la Cámara Argentina de Consignatarios de Ganado (CACG) y las propias consignatarias.',
  },
  {
    question: '¿Qué información incluye cada remate del calendario?',
    answer: 'Cada remate incluye: fecha y hora, consignataria responsable, ubicación (localidad y provincia), tipo de remate, categoría de hacienda, cantidad estimada de cabezas, y cuando están disponibles, enlaces al catálogo y transmisión en vivo.',
  },
]

export default function RematesPage() {
  const totalAuctions = rematesData.length
  const totalProfiles = getAllProfiles().length
  const provinces = new Set(rematesData.map((r) => r.province))
  const totalProvinces = provinces.size
  
  // Get upcoming remates for structured data
  const today = new Date().toISOString().slice(0, 10)
  const upcomingRemates = rematesData
    .filter((r) => r.date >= today && r.status === 'scheduled')
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      name: `${r.consignatariaName} - ${r.type}`,
      date: r.date,
      time: r.time || undefined,
      location: r.location,
      province: r.province,
      consignatariaName: r.consignatariaName,
      type: r.type,
      estimatedHeads: r.estimatedHeads ?? undefined,
    }))

  return (
    <>
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />
      <FAQPageSchema items={FAQ_ITEMS} />
      <RematesListSchema remates={upcomingRemates} />
      <section className="px-4 pt-4 pb-2 text-zinc-400 text-sm leading-relaxed max-w-3xl">
        <h2 className="text-zinc-200 text-lg font-medium mb-2">Calendario de remates ganaderos de Argentina</h2>
        <p>
          Calendario unificado con {totalAuctions} remates de hacienda de {totalProfiles} consignatarias
          en {totalProvinces} provincias argentinas. Los datos se actualizan automaticamente cada dia a las
          14:00 (hora argentina) desde fuentes como la Camara Argentina de Consignatarios (CACG), Colombo
          y Colombo, Ivan L. O&apos;Farrell, Cooperativa Lehmann, UMC Haciendas Villaguay y otras. Filtra
          por provincia, tipo de remate (invernada, cria, general, reproductores, especial), categoria de
          hacienda o periodo. Cada remate incluye fecha, hora, ubicacion, consignataria responsable, cabezas
          estimadas y links a catalogos y transmisiones en vivo.
        </p>
        
        {/* Quick time filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Link
            href="/remates/hoy"
            className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded text-sm text-zinc-300 transition-colors"
          >
            📅 Hoy
          </Link>
          <Link
            href="/remates/manana"
            className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded text-sm text-zinc-300 transition-colors"
          >
            📆 Mañana
          </Link>
          <Link
            href="/remates/semana"
            className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded text-sm text-zinc-300 transition-colors"
          >
            🗓️ Esta semana
          </Link>
          <Link
            href="/remates/en-vivo"
            className="px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 border border-red-700/50 rounded text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            En Vivo
          </Link>
        </div>
        
        {/* Province quick links */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-zinc-500 text-xs self-center mr-1">Por provincia:</span>
          <Link
            href="/remates/buenos-aires"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Buenos Aires
          </Link>
          <Link
            href="/remates/cordoba"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Córdoba
          </Link>
          <Link
            href="/remates/santa-fe"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Santa Fe
          </Link>
          <Link
            href="/remates/entre-rios"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Entre Ríos
          </Link>
          <Link
            href="/remates/corrientes"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Corrientes
          </Link>
        </div>
        
        {/* Type quick links */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-zinc-500 text-xs self-center mr-1">Por tipo:</span>
          <Link
            href="/remates/tipo/invernada"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Invernada
          </Link>
          <Link
            href="/remates/tipo/cria"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cría
          </Link>
          <Link
            href="/remates/tipo/general"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            General
          </Link>
          <Link
            href="/remates/tipo/reproductores"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Reproductores
          </Link>
          <Link
            href="/remates/tipo/especial"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Especial
          </Link>
        </div>
        
        {/* City quick links */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-zinc-500 text-xs self-center mr-1">Por ciudad:</span>
          <Link
            href="/remates/ciudad/rio-cuarto-cordoba"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Río Cuarto
          </Link>
          <Link
            href="/remates/ciudad/san-nicolas-de-los-arroyos-buenos-aires"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            San Nicolás
          </Link>
          <Link
            href="/remates/ciudad/san-luis-san-luis"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            San Luis
          </Link>
          <Link
            href="/remates/ciudad/rauch-buenos-aires"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Rauch
          </Link>
          <Link
            href="/remates/ciudad/villaguay-entre-rios"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Villaguay
          </Link>
        </div>
      </section>
      
      {/* Email capture for remates */}
      <section className="px-4 py-3 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-zinc-400 text-sm whitespace-nowrap">📅 Recibí el resumen semanal de remates:</span>
          <NewsletterSignup 
            source="remates" 
            buttonText="Suscribirme"
            placeholder="tu@email.com"
            compact
          />
        </div>
      </section>
      <Suspense fallback={<div className="p-4 text-zinc-500">Cargando remates...</div>}>
        <RematesClient />
      </Suspense>
    </>
  )
}
