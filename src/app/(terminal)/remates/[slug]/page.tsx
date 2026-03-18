import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema, EventSchema } from '@/components/seo/JsonLd'
import { AddToCalendarButton } from '@/components/ui/AddToCalendarButton'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
// DteCTA inline implementation for remate pages (lock-in strategy)
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  ArrowLeft,
  ExternalLink,
  Share2,
  Tag,
  Users
} from 'lucide-react'

// Generate slug from remate data
function generateRemateSlug(remate: typeof rematesData[0]): string {
  const parts = [
    remate.consignatariaSlug || 'remate',
    remate.type || 'general',
    remate.province?.toLowerCase().replace(/\s+/g, '-') || 'argentina',
    remate.date,
  ]
  return parts.join('-')
}

// Parse slug back to search params
function parseRemateSlug(slug: string): { consignatariaSlug: string; type: string; province: string; date: string } | null {
  const match = slug.match(/^(.+?)-(.+?)-(.+?)-(\d{4}-\d{2}-\d{2})$/)
  if (!match) return null
  return {
    consignatariaSlug: match[1],
    type: match[2],
    province: match[3].toUpperCase().replace(/-/g, ' '),
    date: match[4],
  }
}

// Find remate by slug
function findRemateBySlug(slug: string): typeof rematesData[0] | null {
  // First try exact slug match
  const remate = rematesData.find(r => generateRemateSlug(r) === slug)
  if (remate) return remate
  
  // Try parsing the slug and matching fields
  const parsed = parseRemateSlug(slug)
  if (!parsed) return null
  
  return rematesData.find(r => 
    r.consignatariaSlug === parsed.consignatariaSlug &&
    r.type === parsed.type &&
    r.date === parsed.date
  ) || null
}

// Type labels
const TYPE_LABELS: Record<string, string> = {
  invernada: 'Invernada',
  cria: 'Cría',
  general: 'General',
  especial: 'Especial',
  reproductores: 'Reproductores',
}

// Province display names
const PROVINCE_NAMES: Record<string, string> = {
  'BUENOS AIRES': 'Buenos Aires',
  'CORRIENTES': 'Corrientes',
  'ENTRE RIOS': 'Entre Ríos',
  'SANTA FE': 'Santa Fe',
  'CORDOBA': 'Córdoba',
  'LA PAMPA': 'La Pampa',
  'CHACO': 'Chaco',
  'FORMOSA': 'Formosa',
  'SANTIAGO DEL ESTERO': 'Santiago del Estero',
  'SALTA': 'Salta',
  'SAN LUIS': 'San Luis',
  'MISIONES': 'Misiones',
  'TUCUMAN': 'Tucumán',
  'NEUQUEN': 'Neuquén',
  'RIO NEGRO': 'Río Negro',
  'CHUBUT': 'Chubut',
  'SANTA CRUZ': 'Santa Cruz',
  'JUJUY': 'Jujuy',
  'MENDOZA': 'Mendoza',
  'CATAMARCA': 'Catamarca',
  'LA RIOJA': 'La Rioja',
  'SAN JUAN': 'San Juan',
  'TIERRA DEL FUEGO': 'Tierra del Fuego',
}

// Month names in Spanish
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const day = DAYS_ES[date.getDay()]
  const dayNum = date.getDate()
  const month = MONTHS_ES[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${dayNum} de ${month} ${year}`
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  // Generate slugs for all scheduled/completed remates
  return rematesData
    .filter(r => r.status === 'scheduled' || r.status === 'completed')
    .map(remate => ({
      slug: generateRemateSlug(remate),
    }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const remate = findRemateBySlug(slug)
  
  if (!remate) {
    return {
      title: 'Remate no encontrado — Consignatarias.com.ar',
    }
  }
  
  const provinceName = PROVINCE_NAMES[remate.province] || remate.province
  const typeName = TYPE_LABELS[remate.type] || remate.type
  const dateFormatted = formatDate(remate.date)
  
  const title = `${remate.title} — ${typeName} en ${provinceName}`
  const description = `Remate ${typeName.toLowerCase()} el ${dateFormatted} en ${remate.location}. Organizado por ${remate.consignatariaName}. ${remate.estimatedHeads ? `Aproximadamente ${remate.estimatedHeads} cabezas.` : ''}`
  
  return {
    title,
    description,
    keywords: [
      'remate ganadero',
      `remate ${typeName.toLowerCase()}`,
      `remate ${provinceName.toLowerCase()}`,
      remate.consignatariaName,
      `remate ${remate.date.slice(0, 7)}`, // year-month
    ],
    openGraph: {
      title,
      description,
      url: `https://www.consignatarias.com.ar/remates/${slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/${slug}`,
    },
  }
}

export default async function RemateDetailPage({ params }: Props) {
  const { slug } = await params
  const remate = findRemateBySlug(slug)
  
  if (!remate) {
    notFound()
  }
  
  const provinceName = PROVINCE_NAMES[remate.province] || remate.province
  const typeName = TYPE_LABELS[remate.type] || remate.type
  const dateFormatted = formatDate(remate.date)
  const today = new Date().toISOString().slice(0, 10)
  const isPast = remate.date < today
  const isToday = remate.date === today
  
  // Get consignataria profile if exists
  const profiles = getAllProfiles()
  const consigProfile = profiles.find(p => p.canonicalSlug === remate.consignatariaSlug || p.allSlugs.includes(remate.consignatariaSlug))
  
  // Get similar remates (same province or same type, upcoming)
  const similarRemates = rematesData
    .filter(r => 
      r.id !== remate.id &&
      r.status === 'scheduled' &&
      r.date >= today &&
      (r.province === remate.province || r.type === remate.type)
    )
    .slice(0, 5)
  
  // WhatsApp share URL
  const shareText = `📢 Remate ${typeName}: ${remate.title}\n📅 ${dateFormatted}\n📍 ${remate.location}\n🔗 https://www.consignatarias.com.ar/remates/${slug}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  
  return (
    <>
      <SectionBreadcrumbSchema
        section="remates"
        sectionName="Remates"
      />
      
      <EventSchema
        name={remate.title}
        description={remate.description || `Remate ${typeName.toLowerCase()} organizado por ${remate.consignatariaName}`}
        startDate={`${remate.date}T${remate.time || '10:00'}:00-03:00`}
        endDate={`${remate.date}T${remate.time ? String(parseInt(remate.time.split(':')[0]) + 4).padStart(2, '0') + ':00' : '16:00'}:00-03:00`}
        location={{
          name: remate.location,
          address: `${remate.location}, ${provinceName}, Argentina`,
        }}
        organizer={remate.consignatariaName}
        url={`https://www.consignatarias.com.ar/remates/${slug}`}
        eventAttendanceMode="offline"
      />
      
      <main className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link 
            href="/remates"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al calendario
          </Link>
          
          {/* Status badge */}
          {isToday && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Hoy
              </span>
            </div>
          )}
          {isPast && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700 text-slate-400 text-sm font-medium">
                Finalizado
              </span>
            </div>
          )}
          
          {/* Main card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {remate.title}
                  </h1>
                  <p className="text-lg text-slate-400">
                    Remate {typeName} • {provinceName}
                  </p>
                </div>
                
                {/* Share button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-3 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                  title="Compartir por WhatsApp"
                >
                  <Share2 className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Details grid */}
            <div className="p-6 grid gap-6 md:grid-cols-2">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-slate-800">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Fecha</p>
                  <p className="text-white font-medium">{dateFormatted}</p>
                  {remate.time && (
                    <p className="text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {remate.time} hs
                    </p>
                  )}
                </div>
              </div>
              
              {/* Location */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-slate-800">
                  <MapPin className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Ubicación</p>
                  <p className="text-white font-medium">{remate.location}</p>
                  <p className="text-slate-400">{provinceName}</p>
                </div>
              </div>
              
              {/* Consignataria */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-slate-800">
                  <Building2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Organiza</p>
                  {consigProfile ? (
                    <Link 
                      href={`/consignatarias/${remate.consignatariaSlug}`}
                      className="text-white font-medium hover:text-blue-400 transition-colors"
                    >
                      {remate.consignatariaName}
                    </Link>
                  ) : (
                    <p className="text-white font-medium">{remate.consignatariaName}</p>
                  )}
                </div>
              </div>
              
              {/* Type */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-slate-800">
                  <Tag className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tipo</p>
                  <Link 
                    href={`/remates/tipo/${remate.type}`}
                    className="text-white font-medium hover:text-blue-400 transition-colors"
                  >
                    {typeName}
                  </Link>
                </div>
              </div>
              
              {/* Estimated heads */}
              {remate.estimatedHeads && (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-800">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Cabezas estimadas</p>
                    <p className="text-white font-medium">{remate.estimatedHeads.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Description */}
            {remate.description && (
              <div className="px-6 pb-6">
                <p className="text-slate-400">{remate.description}</p>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="px-6 pb-6 flex flex-wrap gap-3">
              {remate.catalogUrl && (
                <a
                  href={remate.catalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver catálogo
                </a>
              )}
              {remate.youtubeUrl && (
                <a
                  href={remate.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver transmisión
                </a>
              )}
              {!isPast && (
                <AddToCalendarButton
                  title={remate.title}
                  description={remate.description || `Remate ${typeName.toLowerCase()} organizado por ${remate.consignatariaName}`}
                  location={`${remate.location}, ${provinceName}, Argentina`}
                  startDate={remate.date}
                  startTime={remate.time}
                  organizer={remate.consignatariaName}
                  url={`https://www.consignatarias.com.ar/remates/${slug}`}
                  className="text-sm !py-2"
                />
              )}
              {remate.sourceUrl && (
                <a
                  href={remate.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Fuente original
                </a>
              )}
            </div>
          </div>
          
          {/* Consignataria profile card */}
          {consigProfile && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Sobre la consignataria</h2>
              <Link 
                href={`/consignatarias/${remate.consignatariaSlug}`}
                className="block bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl font-bold text-white">
                    {consigProfile.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{consigProfile.displayName}</p>
                    <p className="text-slate-400">Ver perfil completo →</p>
                  </div>
                </div>
              </Link>
            </div>
          )}
          
          {/* Similar remates */}
          {similarRemates.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Remates similares próximos</h2>
              <div className="grid gap-3">
                {similarRemates.map(r => {
                  const rSlug = generateRemateSlug(r)
                  const rProvince = PROVINCE_NAMES[r.province] || r.province
                  const rType = TYPE_LABELS[r.type] || r.type
                  return (
                    <Link
                      key={r.id}
                      href={`/remates/${rSlug}`}
                      className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">{r.title}</p>
                        <p className="text-sm text-slate-400">
                          {rType} • {rProvince} • {formatDate(r.date).split(' ').slice(0, 4).join(' ')}
                        </p>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-slate-500 rotate-180" />
                    </Link>
                  )
                })}
              </div>
              
              {/* PRO Alert Prompt */}
              <div className="mt-4">
                <ProUpgradePrompt
                  benefit="Recibí alertas para remates de este tipo"
                  context="remate-detail"
                  variant="inline"
                />
              </div>
            </div>
          )}
          
          {/* DT-e Upload CTA (Lock-in: user-provided data) - show on past/today remates */}
          {(isPast || isToday) && (
            <div className="mt-8 bg-slate-900 rounded-xl border border-cyan-800/50 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-white font-semibold">
                      ¿Participaste en este remate?
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Subí tus DT-e (Documentos de Tránsito Electrónico) y llevá un registro completo de tus operaciones ganaderas.
                  </p>
                </div>
                <Link
                  href="/mi-cuenta/guias"
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Subir DT-e
                </Link>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-800/50 p-6 text-center">
            <p className="text-lg font-semibold text-white mb-2">
              ¿Organizás remates?
            </p>
            <p className="text-slate-300 mb-4">
              Publicá tus remates en consignatarias.com.ar y llegá a más compradores.
            </p>
            <Link
              href="/planes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
