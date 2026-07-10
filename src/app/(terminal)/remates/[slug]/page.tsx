import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  isRemateProvinceSlug,
  rematesProvinceSlugsWithAuctions,
  rematesProvinceMetadata,
  RematesProvinceView,
} from '../_views/RematesProvinceView'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import marketPrices from '@/lib/data/market-prices.json'
import existenciasData from '@/lib/data/existencias-bovinas.json'
import { getAllProfiles, consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import { getConsignatariaProfile } from '@/lib/dal/consignatarias'
import { normalizeUrl } from '@/lib/utils/url'
import { BreadcrumbSchema, EventSchema, VideoObjectSchema } from '@/components/seo/JsonLd'
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

type Remate = typeof rematesData[0]

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

// mainCategory labels — the dominant hacienda category at the auction.
const CATEGORY_LABELS: Record<string, string> = {
  terneros: 'Terneros / terneras',
  novillos: 'Novillos',
  novillitos: 'Novillitos',
  vaca_gorda: 'Vaca gorda',
  vaquillonas: 'Vaquillonas',
  toros: 'Toros',
  mixto: 'Categorías mixtas',
}

// Especialidad labels (consignataria "persona" field).
const ESPECIALIDAD_LABELS: Record<string, string> = {
  cria: 'Cría',
  invernada: 'Invernada',
  general: 'General',
  reproductores: 'Reproductores',
  lechera: 'Lechera',
  mixto: 'Mixto',
}

// INMAG reference series (Índice Novillo Mercado Agroganadero), $/kg vivo.
interface InmagPoint { date: string; value: number; volume?: number }
const INMAG_SERIES = ((marketPrices as { inmag?: { series?: InmagPoint[] } }).inmag?.series ?? []) as InmagPoint[]
const INMAG_CURRENT = (marketPrices as { inmag?: { current?: number } }).inmag?.current ?? null
const INMAG_UNIT = (marketPrices as { inmag?: { unit?: string } }).inmag?.unit ?? '$/kg vivo'

// Latest INMAG close on or before a given date (the market reference a
// buyer/seller would have had at the auction). Returns null if out of range.
function inmagAtDate(date: string): InmagPoint | null {
  let best: InmagPoint | null = null
  for (const p of INMAG_SERIES) {
    if (p.date <= date && (!best || p.date > best.date)) best = p
  }
  return best
}

function formatArs(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

// MAG per-category reference price. market-prices.json `categories` is keyed by
// these slugs; vaca_gorda maps to "vacas"; mixto has no single key (use INMAG).
const CATEGORY_PRICE_KEY: Record<string, string | null> = {
  terneros: 'terneros', novillos: 'novillos', novillitos: 'novillitos',
  vaca_gorda: 'vacas', vaquillonas: 'vaquillonas', toros: 'toros', mixto: null,
}
const MAG_CATEGORIES = (marketPrices as { categories?: Record<string, { current?: number; change?: number }> }).categories ?? {}
const MAG_DATE = (marketPrices as { lastUpdate?: string }).lastUpdate ?? null

// Province → region → dominant breed (semi-unique reference per page).
const PROVINCE_REGION: Record<string, 'NEA' | 'NOA' | 'PAMPA' | 'PATAGONIA'> = {
  'CORRIENTES': 'NEA', 'CHACO': 'NEA', 'FORMOSA': 'NEA', 'MISIONES': 'NEA',
  'SALTA': 'NOA', 'JUJUY': 'NOA', 'SANTIAGO DEL ESTERO': 'NOA', 'TUCUMAN': 'NOA', 'LA RIOJA': 'NOA', 'CATAMARCA': 'NOA',
  'BUENOS AIRES': 'PAMPA', 'CORDOBA': 'PAMPA', 'SANTA FE': 'PAMPA', 'LA PAMPA': 'PAMPA', 'SAN LUIS': 'PAMPA', 'ENTRE RIOS': 'PAMPA',
  'NEUQUEN': 'PATAGONIA', 'RIO NEGRO': 'PATAGONIA', 'CHUBUT': 'PATAGONIA', 'SANTA CRUZ': 'PATAGONIA', 'TIERRA DEL FUEGO': 'PATAGONIA',
}
const REGION_BREED: Record<string, { breed: string; secondary: string; blurb: string }> = {
  NEA: { breed: 'Braford', secondary: 'Brangus', blurb: 'En el NEA predomina el Braford —raza sintética británico-índica (Hereford × Brahman) que combina la calidad carnicera del Hereford con la rusticidad y la resistencia al calor y a los ectoparásitos del subtrópico húmedo.' },
  NOA: { breed: 'Brangus', secondary: 'Brahman', blurb: 'En el NOA predomina el Brangus —cruza de Aberdeen Angus y Brahman que suma precocidad y calidad de res a la adaptación al ambiente subtropical seco.' },
  PAMPA: { breed: 'Aberdeen Angus', secondary: 'Hereford', blurb: 'En la región pampeana domina el Aberdeen Angus —el recurso genético mayoritario del país (cerca del 50% de los animales puros), valorado por su precocidad, fertilidad y marmóreo.' },
  PATAGONIA: { breed: 'Hereford', secondary: 'Angus', blurb: 'En la Patagonia predomina el Hereford —raza británica muy adaptada al frío y a los pastizales de la región, destacada por su mansedumbre y rusticidad.' },
}
function regionBreed(province: string) {
  const region = PROVINCE_REGION[(province || '').toUpperCase()]
  return region ? REGION_BREED[region] : null
}

// City = first segment of the location string before the comma.
function cityOf(r: Remate): string {
  return (r.location?.split(',')[0] || r.location || '').trim()
}

// Natural, data-derived one-liner built from the remate's own fields — unique
// per page (consignataria + type + category + city + date + heads all vary).
function remateSummary(r: Remate): string {
  const t = (TYPE_LABELS[r.type] || r.type || '').toLowerCase()
  const cat = r.mainCategory ? (CATEGORY_LABELS[r.mainCategory] || '').toLowerCase() : ''
  const city = cityOf(r)
  const prov = PROVINCE_NAMES[r.province] || r.province
  const when = formatDate(r.date).replace(/ \d{4}$/, '')
  const catClause = cat && r.mainCategory !== 'mixto' ? ` con foco en ${cat}` : ''
  const headsClause = r.estimatedHeads ? `, con unas ${r.estimatedHeads.toLocaleString('es-AR')} cabezas` : ''
  const place = city && city.toLowerCase() !== (prov || '').toLowerCase() ? `${city}, ${prov}` : prov
  return `Remate de ${t}${catClause} organizado por ${r.consignatariaName} en ${place}, el ${when}${headsClause}.`
}

// Related-remate card: a varied anchor + the data-derived summary (unique text).
function RelatedCard({ href, anchor, summary }: { href: string; anchor: string; summary: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
      <div>
        <p className="font-medium text-white">{anchor}</p>
        <p className="text-sm text-slate-400">{summary}</p>
      </div>
      <ArrowLeft className="w-4 h-4 text-slate-500 rotate-180 shrink-0" />
    </Link>
  )
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

// Past-auction slugs and stale URLs bots hit shouldn't trigger SSR invocations.
// All known slugs (remates + provinces) are emitted in generateStaticParams;
// anything else returns 404 at the edge without function cost.
export const dynamicParams = false

export async function generateStaticParams() {
  // Merged route: individual remate slugs + province slugs (province match
  // discriminated at runtime via isRemateProvinceSlug).
  const remateSlugs = rematesData
    .filter(r => r.status === 'scheduled' || r.status === 'completed')
    .map(remate => generateRemateSlug(remate))
  const provinceSlugs = rematesProvinceSlugsWithAuctions()
  const all = Array.from(new Set([...remateSlugs, ...provinceSlugs]))
  return all.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  // Province branch
  if (isRemateProvinceSlug(slug)) {
    const meta = await rematesProvinceMetadata(slug)
    return meta ?? {}
  }

  const remate = findRemateBySlug(slug)

  if (!remate) {
    return {
      title: 'Remate no encontrado',
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

  // Province branch — render the merged-from-[provincia] view
  if (isRemateProvinceSlug(slug)) {
    return <RematesProvinceView provincia={slug} />
  }

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

  // Enriched profile (Supabase): "persona detrás" + region/especialidad/años.
  // Falls back gracefully to null if unavailable.
  const consigEnriched = consigProfile ? await getConsignatariaProfile(consigProfile.canonicalSlug) : null

  // INMAG market context at the auction date — the price reference a
  // buyer/seller had on the day. Real observed series, not derived.
  const inmagRef = inmagAtDate(remate.date)
  const inmagDelta = inmagRef && INMAG_CURRENT
    ? ((INMAG_CURRENT - inmagRef.value) / inmagRef.value) * 100
    : null
  const categoryLabel = remate.mainCategory ? (CATEGORY_LABELS[remate.mainCategory] || null) : null
  
  // ---- Related remates: scoped modules (per-page-unique content + internal
  // links that fix orphans). The slug in remates.json is a VARIANT — resolve
  // to canonical via profiles for stable grouping.
  const currentCanon = consigProfile?.canonicalSlug ?? remate.consignatariaSlug
  const canonOf = (r: Remate): string => {
    const p = profiles.find(pr => pr.canonicalSlug === r.consignatariaSlug || pr.allSlugs.includes(r.consignatariaSlug))
    return p?.canonicalSlug ?? r.consignatariaSlug
  }
  const currentCity = cityOf(remate)
  const provinceHub = `/remates/${remate.province?.toLowerCase().replace(/\s+/g, '-') || ''}`
  const pool: Remate[] = rematesData
    .filter(r => r.id !== remate.id && r.status === 'scheduled' && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const shownIds = new Set<number>()
  const take = (list: Remate[], n: number): Remate[] => {
    const out: Remate[] = []
    for (const r of list) {
      if (shownIds.has(r.id)) continue
      shownIds.add(r.id)
      out.push(r)
      if (out.length >= n) break
    }
    return out
  }
  const consigDisplay = consigProfile?.displayName ?? remate.consignatariaName
  const sameConsignataria = take(pool.filter(r => canonOf(r) === currentCanon), 4)
  const sameCity = pool.filter(r => cityOf(r) === currentCity && currentCity.length > 2)
  const sameProvince = pool.filter(r => r.province === remate.province)
  const nearbyGeo = take([...sameCity, ...sameProvince], 4)
  const sameTypeAll = pool.filter(r => r.type === remate.type)
  const typeRanked = remate.mainCategory
    ? [...sameTypeAll.filter(r => r.mainCategory === remate.mainCategory), ...sameTypeAll.filter(r => r.mainCategory !== remate.mainCategory)]
    : sameTypeAll
  const sameTypeRemates = take(typeRanked, 3)

  // Per-category MAG reference price (mixto → no single key, falls back to INMAG).
  const priceKey = remate.mainCategory ? CATEGORY_PRICE_KEY[remate.mainCategory] : null
  const catPrice = priceKey ? MAG_CATEGORIES[priceKey] : null
  // Breed reference for the province's region.
  const breed = regionBreed(remate.province)
  // Cattle stock for the province (SENASA).
  const existencias = (existenciasData as unknown as Record<string, { total: number; year: number }>)[(remate.province || '').toUpperCase()] ?? null
  // Data-derived summary for the current remate (unique paragraph on the page).
  const summary = remateSummary(remate)
  
  // WhatsApp share URL
  const shareText = `📢 Remate ${typeName}: ${remate.title}\n📅 ${dateFormatted}\n📍 ${remate.location}\n🔗 https://www.consignatarias.com.ar/remates/${slug}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Remates', url: 'https://www.consignatarias.com.ar/remates' },
          { name: provinceName, url: `https://www.consignatarias.com.ar/remates/${remate.province?.toLowerCase().replace(/\s+/g, '-') || ''}` },
          { name: remate.title, url: `https://www.consignatarias.com.ar/remates/${slug}` },
        ]}
      />

      <EventSchema
        name={remate.title}
        description={remate.description || `Remate ${typeName.toLowerCase()} organizado por ${remate.consignatariaName}`}
        startDate={`${remate.date}T${remate.time || '10:00'}:00-03:00`}
        endDate={`${remate.date}T${remate.time ? String(parseInt(remate.time.split(':')[0]) + 4).padStart(2, '0') + ':00' : '16:00'}:00-03:00`}
        location={{
          name: remate.location?.trim() || provinceName || 'Argentina',
          address: `${remate.location}, ${provinceName}, Argentina`,
        }}
        organizer={remate.consignatariaName}
        url={`https://www.consignatarias.com.ar/remates/${slug}`}
        eventAttendanceMode="offline"
      />

      {/* Video/live schema for remates with a YouTube stream. isLive is gated to
          non-past dates so we never claim a BroadcastEvent for a finished auction. */}
      {remate.youtubeUrl && (() => {
        const m = remate.youtubeUrl.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/)
        const videoId = m && m[7]?.length === 11 ? m[7] : null
        return (
          <VideoObjectSchema
            name={`Remate ${typeName}: ${remate.title}`}
            description={remate.description || `Transmisión del remate ${typeName.toLowerCase()} organizado por ${remate.consignatariaName} en ${provinceName}.`}
            thumbnailUrl={videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : 'https://www.consignatarias.com.ar/og-image.png'}
            uploadDate={`${remate.date}T${remate.time || '10:00'}:00-03:00`}
            contentUrl={normalizeUrl(remate.youtubeUrl) || remate.youtubeUrl}
            embedUrl={videoId ? `https://www.youtube.com/embed/${videoId}` : undefined}
            publisher={remate.consignatariaName}
            isLive={!isPast}
          />
        )
      })()}

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
          
          {/* Status badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {isToday && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Hoy
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700 text-slate-400 text-sm font-medium">
                Finalizado
              </span>
            )}
            {remate.youtubeUrl && !isPast && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm font-medium border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                🔴 Transmisión en vivo
              </span>
            )}
          </div>
          
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
                  <Calendar className="w-6 h-6 text-sky-400" />
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
                      href={consignatariaProfilePath(remate.consignatariaSlug)}
                      className="text-white font-medium hover:text-sky-400 transition-colors"
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
                  <Tag className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tipo</p>
                  <Link 
                    href={`/remates/tipo/${remate.type}`}
                    className="text-white font-medium hover:text-sky-400 transition-colors"
                  >
                    {typeName}
                  </Link>
                </div>
              </div>
              
              {/* Main category (dominant hacienda category) */}
              {categoryLabel && (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-800">
                    <Tag className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Categoría principal</p>
                    <p className="text-white font-medium">{categoryLabel}</p>
                  </div>
                </div>
              )}

              {/* Estimated heads */}
              {remate.estimatedHeads && (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-800">
                    <Users className="w-6 h-6 text-accent" />
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
            
            {/* YouTube Live Section - Prominent when available */}
            {remate.youtubeUrl && (
              <div className="mx-6 mb-6 rounded-xl overflow-hidden border border-red-500/30 bg-gradient-to-br from-red-950/20 to-slate-900">
                {/* YouTube embed */}
                <div className="aspect-video bg-black">
                  {(() => {
                    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
                    const match = remate.youtubeUrl?.match(regExp)
                    const videoId = (match && match[7]?.length === 11) ? match[7] : null
                    
                    if (videoId) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                          title={`Transmisión ${remate.title}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )
                    }
                    return null
                  })()}
                </div>
                {/* Live banner */}
                <div className="p-4 flex items-center justify-between bg-red-950/30">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-white font-bold text-sm">TRANSMISIÓN EN VIVO</span>
                    </span>
                    <span className="text-slate-400 text-sm hidden sm:inline">
                      Mirá el remate desde cualquier lugar
                    </span>
                  </div>
                  <a
                    href={normalizeUrl(remate.youtubeUrl) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    Abrir en YouTube
                  </a>
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="px-6 pb-6 flex flex-wrap gap-3">
              {remate.catalogUrl && (
                <a
                  href={normalizeUrl(remate.catalogUrl) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver catálogo
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
                  href={normalizeUrl(remate.sourceUrl) || '#'}
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
          
          {/* INMAG market context — real observed reference price */}
          {inmagRef && (
            <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-xl font-bold text-white mb-1">Referencia de mercado</h2>
              <p className="text-sm text-slate-500 mb-4">
                INMAG — Índice Novillo Mercado Agroganadero ({INMAG_UNIT})
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-800/50 p-4">
                  <p className="text-sm text-slate-500 mb-1">
                    {isPast ? 'Al cierre del remate' : 'Referencia más reciente'}
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    ${formatArs(inmagRef.value)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Cierre del {formatShortDate(inmagRef.date)}</p>
                </div>
                {isPast && INMAG_CURRENT && inmagDelta !== null && (
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-sm text-slate-500 mb-1">Hoy</p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      ${formatArs(INMAG_CURRENT)}
                    </p>
                    <p className={`text-xs mt-1 tabular-nums ${inmagDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {inmagDelta >= 0 ? '+' : ''}{inmagDelta.toFixed(1)}% desde el remate
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-4">
                Precio de referencia del novillo en pie. Los valores efectivos por categoría
                ({categoryLabel ? categoryLabel.toLowerCase() : 'según lote'}) pueden diferir.{' '}
                <Link href="/mercado/inmag" className="text-sky-400 hover:underline">Ver evolución del INMAG →</Link>
              </p>
            </div>
          )}

          {/* Contexto del remate — data-derived summary + per-category price + breed */}
          <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-bold text-white mb-3">Contexto del remate</h2>
            <p className="text-slate-300 leading-relaxed">{summary}</p>
            {catPrice?.current ? (
              <p className="text-slate-400 text-sm mt-3">
                Referencia de precio para <span className="text-slate-200">{categoryLabel}</span>:{' '}
                <span className="text-white tabular-nums">${formatArs(catPrice.current)}/kg</span>
                {typeof catPrice.change === 'number' && (
                  <span className={catPrice.change >= 0 ? 'text-emerald-400' : 'text-red-400'}> ({catPrice.change >= 0 ? '+' : ''}{catPrice.change.toFixed(1)}%)</span>
                )}
                {MAG_DATE && <span className="text-slate-600"> · MAG, {MAG_DATE}</span>}
              </p>
            ) : null}
            {breed && (
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                {breed.blurb} <span className="text-slate-500">También frecuente en la zona: {breed.secondary}.</span>
              </p>
            )}
            {existencias && (
              <p className="text-slate-500 text-sm mt-3">
                Existencias bovinas en {provinceName}:{' '}
                <span className="text-slate-300 tabular-nums">{existencias.total.toLocaleString('es-AR')}</span> cabezas
                <span className="text-slate-600"> · SENASA {existencias.year}</span>
              </p>
            )}
          </div>

          {/* Consignataria profile card */}
          {consigProfile && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Sobre la consignataria</h2>
              <Link
                href={consignatariaProfilePath(remate.consignatariaSlug)}
                className="block bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                    {consigProfile.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-white">{consigProfile.displayName}</p>
                    {consigEnriched?.referenteNombre && (
                      <p className="text-slate-400 text-sm">
                        {consigEnriched.referenteNombre}
                        {consigEnriched.referenteCargo ? ` · ${consigEnriched.referenteCargo}` : ''}
                      </p>
                    )}
                    {(consigEnriched?.regionOperativa || consigEnriched?.especialidad || consigEnriched?.anosOficio) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {consigEnriched.regionOperativa && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">{consigEnriched.regionOperativa}</span>
                        )}
                        {consigEnriched.especialidad && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">
                            {ESPECIALIDAD_LABELS[consigEnriched.especialidad] || consigEnriched.especialidad}
                          </span>
                        )}
                        {consigEnriched.anosOficio ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">{consigEnriched.anosOficio} años de oficio</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                {consigEnriched?.bioReferente && (
                  <p className="text-slate-400 text-sm leading-relaxed mt-4 line-clamp-3">{consigEnriched.bioReferente}</p>
                )}
                <p className="text-sky-400 text-sm mt-3">Ver perfil completo →</p>
              </Link>
            </div>
          )}
          
          {/* Related: same consignataria */}
          {sameConsignataria.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Próximos remates de {consigDisplay}</h2>
              <div className="grid gap-3">
                {sameConsignataria.map(r => (
                  <RelatedCard
                    key={r.id}
                    href={`/remates/${generateRemateSlug(r)}`}
                    anchor={`${r.title} — ${cityOf(r)}, ${formatDate(r.date).split(' ').slice(1, 4).join(' ')}`}
                    summary={remateSummary(r)}
                  />
                ))}
              </div>
              <Link href={consignatariaProfilePath(remate.consignatariaSlug)} className="inline-block mt-3 text-sky-400 text-sm hover:underline">
                Ver todos los remates de {consigDisplay} →
              </Link>
            </div>
          )}

          {/* Related: same province (geographic) */}
          {nearbyGeo.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Próximos remates en {provinceName}</h2>
              <div className="grid gap-3">
                {nearbyGeo.map(r => (
                  <RelatedCard
                    key={r.id}
                    href={`/remates/${generateRemateSlug(r)}`}
                    anchor={`Remate en ${cityOf(r)} · ${TYPE_LABELS[r.type] || r.type}`}
                    summary={remateSummary(r)}
                  />
                ))}
              </div>
              <Link href={provinceHub} className="inline-block mt-3 text-sky-400 text-sm hover:underline">
                Ver el calendario de remates en {provinceName} →
              </Link>
            </div>
          )}

          {/* Related: same type */}
          {sameTypeRemates.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Otros remates de {typeName.toLowerCase()}</h2>
              <div className="grid gap-3">
                {sameTypeRemates.map(r => (
                  <RelatedCard
                    key={r.id}
                    href={`/remates/${generateRemateSlug(r)}`}
                    anchor={`${TYPE_LABELS[r.type] || r.type} de ${r.consignatariaName}`}
                    summary={remateSummary(r)}
                  />
                ))}
              </div>
              <Link href={`/remates/tipo/${remate.type}`} className="inline-block mt-3 text-sky-400 text-sm hover:underline">
                Ver todos los remates de {typeName.toLowerCase()} →
              </Link>
            </div>
          )}

          {/* PRO Alert Prompt (once, after the related modules) */}
          {(sameConsignataria.length > 0 || nearbyGeo.length > 0 || sameTypeRemates.length > 0) && (
            <div className="mt-4">
              <ProUpgradePrompt
                benefit="No te pierdas remates como este. Alertas en tu email."
                context="remate-detail"
                variant="inline"
              />
            </div>
          )}
          
          {/* DT-e Upload CTA (Lock-in: user-provided data) - show on past/today remates */}
          {(isPast || isToday) && (
            <div className="mt-8 bg-slate-900 rounded-xl border border-sky-800/50 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
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
          <div className="mt-8 bg-gradient-to-r from-sky-900/50 to-purple-900/50 rounded-xl border border-sky-800/50 p-6 text-center">
            <p className="text-lg font-semibold text-white mb-2">
              ¿Organizás remates?
            </p>
            <p className="text-slate-300 mb-4">
              Publicá tus remates en consignatarias.com.ar y llegá a más compradores.
            </p>
            <Link
              href="/planes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
