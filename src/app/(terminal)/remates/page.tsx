import { Metadata } from 'next'
import Link from 'next/link'
import RematesClient from './RematesClient'
import NextRemateCountdown from '@/components/remates/NextRemateCountdown'
import rematesData from '@/lib/data/remates.json'
import { getAllProfiles, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema, FAQPageSchema, RematesListSchema, DatasetSchema } from '@/components/seo/JsonLd'
import NewsletterSignup from '@/components/NewsletterSignup'
import { Breadcrumb } from '@/components/ui'
import { EXPO, REMATES_EXPO, expoVigente, posicionNacional } from '@/lib/data/expo-mercedes'

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
      title: `Remates Ganaderos ${monthName} ${year}`,
      description: `Calendario de ${totalAuctions} remates ganaderos en Argentina. Filtros por provincia, tipo y fecha.`,
      url: 'https://www.consignatarias.com.ar/remates',
      type: 'website',
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
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

  // Próximo remate: el primero con date>=hoy, ordenado por date+time. El cómputo
  // del countdown vive en el cliente (Date.now()), así que acá solo elegimos el
  // remate; la hora exacta la resuelve el componente.
  const next = rematesData
    .filter((r) => r.date >= today && r.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0]
  const nextRemate = next
    ? {
        consignatariaName: next.consignatariaName,
        date: next.date,
        time: next.time ?? undefined,
        province: next.province || undefined,
        slug: getCanonicalSlug(next.consignatariaSlug) ?? next.consignatariaSlug,
      }
    : null

  return (
    <>
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />
      <FAQPageSchema items={FAQ_ITEMS} />
      <RematesListSchema remates={upcomingRemates} />
      <DatasetSchema
        name="Calendario de Remates Ganaderos Argentina"
        description="Base de datos actualizada de remates ganaderos de múltiples consignatarias argentinas"
        url="https://www.consignatarias.com.ar/remates"
        keywords={['remates ganaderos', 'subastas hacienda', 'consignatarias argentina']}
      />
      {/* Breadcrumb visual (§3.2). El JSON-LD ya lo emite SectionBreadcrumbSchema
          arriba, así que acá schema={false} para no duplicar structured data. */}
      <div className="px-4 pt-3">
        <Breadcrumb items={[{ name: 'Remates' }]} schema={false} />
      </div>
      {nextRemate && (
        <div className="px-4 pt-2">
          <NextRemateCountdown nextRemate={nextRemate} />
        </div>
      )}
      <section className="px-4 pt-3 pb-2 text-zinc-400 text-sm leading-relaxed max-w-3xl">
        <h2 className="text-zinc-200 text-lg font-medium mb-1">Calendario de remates ganaderos de Argentina</h2>
        <p>
          {totalAuctions} remates de hacienda de {totalProfiles} consignatarias en {totalProvinces} provincias,
          actualizado todos los días a las 14:00. Filtrá abajo por provincia, tipo, fecha o consignataria.
        </p>

        {/* Destacado de la Expo de Mercedes. Va acá arriba —no al pie— porque un
            destacado bajo el fold no lo ve nadie, y se apaga solo pasado el último
            remate: un evento vencido en la portada envejece todo lo demás. */}
        {expoVigente() && (
          <Link
            href="/remates/expo-rural-mercedes"
            className="mt-4 block rounded-lg border border-accent/40 bg-accent/[0.05] p-4 transition-colors hover:bg-accent/[0.09]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-accent">
              {EXPO.entidad} · {EXPO.provincia}
            </p>
            <p className="mt-1.5 text-base font-medium text-zinc-100">
              {REMATES_EXPO.length} remates de {posicionNacional().firmas} firmas en dos semanas
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              La rueda de la {EXPO.edicion}ª Expo de Mercedes: fuera de Palermo y Expoagro, la mayor
              concentración de consignatarias del país. Ver el cronograma completo →
            </p>
          </Link>
        )}

        {/* Explorar (links SEO a páginas dedicadas). El filtrado interactivo vive en
            la barra de abajo — acá solo navegación a las páginas indexables. */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-zinc-500 text-xs self-center mr-1">Por provincia:</span>
          <Link
            href="/remates/buenos-aires"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Buenos Aires
          </Link>
          <Link
            href="/remates/cordoba"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Córdoba
          </Link>
          <Link
            href="/remates/santa-fe"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Santa Fe
          </Link>
          <Link
            href="/remates/entre-rios"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Entre Ríos
          </Link>
          <Link
            href="/remates/corrientes"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Corrientes
          </Link>
        </div>
        
        {/* Type quick links */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-zinc-500 text-xs self-center mr-1">Por tipo:</span>
          <Link
            href="/remates/tipo/invernada"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Invernada
          </Link>
          <Link
            href="/remates/tipo/cria"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Cría
          </Link>
          <Link
            href="/remates/tipo/general"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            General
          </Link>
          <Link
            href="/remates/tipo/reproductores"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Reproductores
          </Link>
          <Link
            href="/remates/tipo/especial"
            className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 rounded text-xs text-zinc-400 hover:text-zinc-300 motion-hover"
          >
            Especial
          </Link>
        </div>
      </section>
      
      {/* Email capture for remates */}
      <section className="px-4 py-3 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-zinc-400 text-sm whitespace-nowrap">Recibí el resumen semanal de remates:</span>
          <NewsletterSignup 
            source="remates" 
            buttonText="Suscribirme"
            placeholder="tu@email.com"
            compact
          />
        </div>
      </section>
      {/* RematesClient ya no usa useSearchParams → renderiza SSR (lista en el
          HTML servido, visible para crawlers). Sin Suspense/fallback. */}
      <RematesClient />
    </>
  )
}
