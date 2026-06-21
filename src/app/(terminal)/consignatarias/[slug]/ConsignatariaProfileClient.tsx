'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Auction } from '@/lib/db/schema'
import type { EnrichedProfile } from '@/lib/dal/consignatarias'
import type { PublicReview } from '@/lib/dal/reviews'
import ReviewsPanel from './ReviewsPanel'
import type { EntityTier } from '@/lib/features'
import type { AuctionResult } from './page'
import FeatureGate from '@/components/FeatureGate'
import { normalizeUrl } from '@/lib/utils/url'
import { trackProfileView, trackOutboundClick, trackClaimCTA } from '@/lib/analytics'
import {
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_LABELS_SHORT,
  CAT_LABELS,
  CAT_CODES,
  MONTH_NAMES,
  MONTH_FULL,
  formatDateShort,
  getCity,
  getProvinceCode,
  getEffectiveToday,
  getEffectiveStatus,
} from '@/lib/ui/tokens'
import CountdownBadge from '@/components/CountdownBadge'
import ProBadge, { VerifiedBadge } from '@/components/badges/ProBadge'
import VideoGallery, { type ConsignatariaVideo } from '@/components/video/VideoGallery'
import { Accordion } from './_wave2/Accordion'
import { StickyBar } from './_wave2/StickyBar'
import { getLogoUrl, getBrandColor } from '@/lib/data/logo-map'
// DteCTA removed - not relevant for consignatarias viewing their profile
import type { RelatedConsignataria } from '@/lib/dal/consignatarias'
import type { MagEntryData } from './page'

/* ------------------------------------------------------------------ */
/*  COMPLETENESS CALCULATOR                                            */
/* ------------------------------------------------------------------ */

const COMPLETENESS_FIELDS: { key: keyof EnrichedProfile; label: string }[] = [
  { key: 'phone', label: 'telefono' },
  { key: 'email', label: 'email' },
  { key: 'website', label: 'sitio web' },
  { key: 'description', label: 'descripcion' },
  { key: 'logoUrl', label: 'logo' },
  { key: 'whatsapp', label: 'whatsapp' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'category', label: 'categoria' },
]

function calculateCompleteness(profile: EnrichedProfile): { percent: number; missing: string[] } {
  const missing: string[] = []
  for (const f of COMPLETENESS_FIELDS) {
    if (!profile[f.key]) missing.push(f.label)
  }
  const filled = COMPLETENESS_FIELDS.length - missing.length
  return { percent: Math.round((filled / COMPLETENESS_FIELDS.length) * 100), missing }
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ date, time, today }: { date: string; time: string | null; today: string }) {
  const effectiveStatus = getEffectiveStatus(date, time, today)
  const isToday = date === today
  if (effectiveStatus === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5" role="img" aria-label="En vivo">
        <span className="status-dot-live" />
        <span className="text-positive font-terminal text-xxs">EN VIVO</span>
      </span>
    )
  }
  if (effectiveStatus === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5" role="img" aria-label="Finalizado">
        <span className="status-dot-offline" />
        <span className="text-zinc-500 font-terminal text-xxs">FINALIZADO</span>
      </span>
    )
  }
  const scheduledBadge = (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={isToday ? 'Hoy' : 'Programado'}>
      <span className={`status-dot ${isToday ? 'bg-positive animate-pulse-live' : 'bg-sky-400'}`} />
      <span className={`font-terminal text-xxs ${isToday ? 'text-positive' : 'text-sky-400'}`}>
        {isToday ? 'HOY' : 'PROGRAMADO'}
      </span>
    </span>
  )
  if (isToday && time) {
    return <CountdownBadge auctionDate={date} auctionTime={time} fallback={scheduledBadge} />
  }
  return scheduledBadge
}

/* ------------------------------------------------------------------ */
/*  REMATE COUNTDOWN — cuenta regresiva al próximo remate (días/h/min) */
/* ------------------------------------------------------------------ */
function RemateCountdown({ date, time }: { date: string; time: string | null }) {
  const target = useMemo(() => {
    const [y, mo, d] = date.split('-').map(Number)
    const [h, mi] = (time || '11:00').split(':').map(Number)
    const ART_OFFSET_MS = -3 * 60 * 60 * 1000 // ART = UTC-3, sin DST
    return Date.UTC(y, (mo || 1) - 1, d || 1, h || 11, mi || 0, 0, 0) - ART_OFFSET_MS
  }, [date, time])
  const [now, setNow] = useState<number>(() => target - 1) // SSR-safe: arranca "futuro"
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.floor((target - now) / 1000)
  if (diff <= 0) return null
  let label: string
  if (diff < 3600) {
    label = `en ${Math.floor(diff / 60).toString().padStart(2, '0')}:${(diff % 60).toString().padStart(2, '0')}`
  } else if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    label = `en ${h} h ${m} min`
  } else {
    const d = Math.floor(diff / 86400)
    const h = Math.floor((diff % 86400) / 3600)
    label = `en ${d} ${d === 1 ? 'día' : 'días'}${h > 0 ? ` ${h} h` : ''}`
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xxs font-terminal tabular-nums text-accent" role="timer">
      <span className="status-dot bg-accent animate-pulse-live" />
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  AUCTION ROW — responsive                                           */
/* ------------------------------------------------------------------ */

function ProfileAuctionRow({ auction, today }: { auction: Auction; today: string }) {
  const isToday = auction.date === today
  const isPast = auction.date < today
  const city = getCity(auction.location)
  const sourceUrl = normalizeUrl(auction.sourceUrl)
  const catalogUrl = normalizeUrl(auction.catalogUrl)
  const href = sourceUrl || catalogUrl || null

  function handleRowClick() {
    if (href) {
      trackOutboundClick(href, sourceUrl ? 'source' : 'catalog')
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={href ? handleRowClick : undefined}
      onKeyDown={href ? (e) => { if (e.key === 'Enter') handleRowClick() } : undefined}
      className={`group border-b border-terminal-border transition-colors duration-75 ${
        href ? 'hover:bg-zinc-800/50 cursor-pointer' : ''
      } ${isToday ? 'bg-positive/[0.02]' : ''} ${isPast ? 'opacity-50' : ''}`}
    >
      {/* --- MOBILE CARD --- */}
      <div className="md:hidden p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-data tabular-nums font-terminal ${isToday ? 'text-positive font-medium' : 'text-zinc-300'}`}>
              {formatDateShort(auction.date)}
            </span>
            {auction.time && (
              <span className="text-data tabular-nums font-terminal text-zinc-400">{auction.time}</span>
            )}
          </div>
          <StatusBadge date={auction.date} time={auction.time} today={today} />
        </div>
        <div className="text-data font-terminal text-zinc-200 group-hover:text-accent transition-colors truncate">
          {auction.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xxs text-zinc-500">{city}</span>
          <span className="text-xxs text-zinc-500">{auction.province}</span>
          <span className={`terminal-tag ${TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} text-[10px]`}>
            {TYPE_LABELS[auction.type] || auction.type.toUpperCase()}
          </span>
          <span className="text-xxs text-zinc-500">{CAT_LABELS[auction.mainCategory]}</span>
          {auction.estimatedHeads != null && (
            <span className="text-data font-terminal tabular-nums text-zinc-400">
              ~{auction.estimatedHeads.toLocaleString('es-AR')} cab
            </span>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {auction.catalogUrl && (
            <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
              onClick={() => trackOutboundClick(normalizeUrl(auction.catalogUrl) || '', 'catalog')}
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catalogo">Catalogo</a>
          )}
          {auction.youtubeUrl && (
            <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
              onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
              className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmision">YouTube</a>
          )}
        </div>
      </div>

      {/* --- DESKTOP ROW --- */}
      <div className="hidden md:block">
        <div className="flex items-center gap-0 px-cell py-px2">
          <span className={`w-[56px] flex-shrink-0 text-data tabular-nums font-terminal ${
            isToday ? 'text-positive font-medium' : 'text-zinc-300'
          }`}>
            {formatDateShort(auction.date)}
          </span>
          <span className="w-[52px] flex-shrink-0 text-data tabular-nums font-terminal">
            {auction.time ? (
              <span className="text-zinc-300">{auction.time}</span>
            ) : (
              <span className="text-zinc-500">&mdash;</span>
            )}
          </span>
          <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors" title={auction.title}>
            {auction.title}
          </span>
          <span className="w-[140px] flex-shrink-0 text-data font-terminal text-zinc-500 truncate text-right pr-2">
            {city}
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-500 text-right">
            {getProvinceCode(auction.province)}
          </span>
        </div>
        <div className="flex items-center gap-0 px-cell pb-1">
          <span className={`terminal-tag ${TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} mr-1.5 text-[10px]`}>
            {TYPE_LABELS_SHORT[auction.type] || auction.type.toUpperCase()}
          </span>
          <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-zinc-500">
            {CAT_CODES[auction.mainCategory]}
          </span>
          <span className="w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-zinc-400 text-right">
            {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '\u2014'}
          </span>
          <span className="w-[80px] flex-shrink-0 ml-2">
            <StatusBadge date={auction.date} time={auction.time} today={today} />
          </span>
          <span className="flex-1" />
          <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {auction.catalogUrl && (
              <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.catalogUrl) || '', 'catalog')}
                className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catalogo" title="Catalogo">CAT</a>
            )}
            {auction.youtubeUrl && (
              <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
                className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmision" title="YouTube">YT</a>
            )}
            {auction.sourceUrl && (
              <a href={normalizeUrl(auction.sourceUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.sourceUrl) || '', 'source')}
                className="text-xxs font-terminal text-zinc-500 hover:text-zinc-400 transition-colors" aria-label="Ver fuente" title="Fuente">SRC</a>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CALENDAR HEATMAP (12 months)                                       */
/* ------------------------------------------------------------------ */

function CalendarHeatmap({ auctions }: { auctions: Auction[] }) {
  const monthCounts = useMemo(() => {
    const counts = new Array(12).fill(0)
    auctions.forEach(a => {
      const m = new Date(a.date + 'T12:00:00').getMonth()
      counts[m]++
    })
    return counts
  }, [auctions])

  const max = Math.max(...monthCounts, 1)

  return (
    <div className="flex items-end gap-1 h-20">
      {monthCounts.map((count, i) => {
        const pct = (count / max) * 100
        const currentMonth = new Date().getMonth()
        const isCurrent = i === currentMonth
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            {count > 0 && (
              <span className="text-[10px] font-terminal tabular-nums text-zinc-400">{count}</span>
            )}
            <div className="w-full relative" style={{ height: '48px' }}>
              <div
                className="absolute bottom-0 w-full transition-all rounded-terminal"
                style={{
                  height: count > 0 ? `${Math.max(pct, 8)}%` : '2px',
                  background: count > 0
                    ? isCurrent
                      ? 'linear-gradient(to top, var(--accent, #06b6d4), var(--accent-bright, #67e8f9))'
                      : 'linear-gradient(to top, #059669, #34d399)'
                    : '#27272a',
                }}
              />
            </div>
            <span className={`text-[10px] font-terminal ${isCurrent ? 'text-accent font-medium' : 'text-zinc-500'}`}>
              {MONTH_NAMES[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TYPE DISTRIBUTION                                                  */
/* ------------------------------------------------------------------ */

/** Map auction type keys to gradient CSS for bars */
const TYPE_GRADIENT_MAP: Record<string, string> = {
  invernada:     'linear-gradient(to right, #059669, #34d399)',
  cria:          'linear-gradient(to right, #0284c7, #38bdf8)',
  reproductores: 'linear-gradient(to right, #7c3aed, #a78bfa)',
  general:       'linear-gradient(to right, #ca8a04, #facc15)',
  especial:      'linear-gradient(to right, #dc2626, #f87171)',
}

function TypeDistribution({ auctions }: { auctions: Auction[] }) {
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {}
    auctions.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1 })
    return Object.entries(counts)
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as [string, number][]
  }, [auctions])

  const max = typeCounts.length > 0 ? typeCounts[0][1] : 1

  return (
    <div className="space-y-2">
      {typeCounts.map(([type, count]) => {
        const pct = (count / auctions.length) * 100
        const barWidth = (count / max) * 100
        return (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-[80px] flex-shrink-0 text-xxs font-terminal ${(TYPE_COLORS[type] || 'border-zinc-500 text-zinc-400').split(' ')[1]}`}>
              {TYPE_LABELS[type] || type.toUpperCase()}
            </span>
            <div className="flex-1 h-2.5 bg-zinc-900 relative rounded-terminal overflow-hidden">
              <div
                className="h-full rounded-terminal"
                style={{
                  width: `${barWidth}%`,
                  background: TYPE_GRADIENT_MAP[type] || 'linear-gradient(to right, #71717a, #a1a1aa)',
                }}
              />
            </div>
            <span className="w-[60px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-400 text-right">
              {count} ({pct.toFixed(0)}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export interface YouTubeChannelData {
  channelId: string
  channelTitle: string
  channelUrl: string
  subscribers?: number | null
  latestVideo?: {
    videoId: string
    title: string
    publishedAt: string
    thumbnail: string
  }
  lastChecked?: string
}

export interface ExternalResource {
  type: string
  label: string
  url: string
  description?: string
}

interface ConsignatariaProfileClientProps {
  profile: EnrichedProfile
  auctions: Auction[]
  tier: EntityTier
  auctionResults: AuctionResult[]
  youtubeChannel?: YouTubeChannelData
  videos?: ConsignatariaVideo[]
  relatedConsignatarias?: RelatedConsignataria[]
  externalResources?: ExternalResource[]
  magEntry?: MagEntryData
  mediosPagoSlot?: React.ReactNode
  reviews?: PublicReview[]
  reviewStats?: { count: number; avgRating: number | null }
  /** Resumen liviano del último remate reportado, para la tarjeta de precios del hero. */
  latestRemateSummary?: { fuente: string; fecha: string; top: Array<{ label: string; mid: number }> } | null
}

export default function ConsignatariaProfileClient({ profile, auctions, tier, auctionResults, youtubeChannel, videos = [], relatedConsignatarias = [], externalResources = [], magEntry, mediosPagoSlot, reviews = [], reviewStats = { count: 0, avgRating: null }, latestRemateSummary = null }: ConsignatariaProfileClientProps) {
  const today = getEffectiveToday()

  useEffect(() => {
    trackProfileView(profile.canonicalSlug, profile.displayName, auctions.length)

    fetch('/api/profile-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'consignataria',
        entitySlug: profile.canonicalSlug,
      }),
    }).catch(() => {})
  }, [profile.canonicalSlug, profile.displayName, auctions.length])

  const sorted = useMemo(
    () => [...auctions].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
    [auctions]
  )

  const upcoming = useMemo(() => sorted.filter(a => a.date >= today), [sorted, today])
  const provinces = useMemo(() => [...new Set(auctions.map(a => a.province))], [auctions])

  /* Sprint 2: "Historial verificable" — derived from auctions data we already have.
   * Works for every consignataria (whereas MAG lots data requires a name-bridge
   * which isn't populated yet). When lots data lands, this section gains a
   * cabezas-verificadas / kg-promedio row. */
  const historial = useMemo(() => {
    const past = sorted.filter(a => a.date < today)
    // Frecuencia: count remates in last 90 days
    const ninety = new Date()
    ninety.setDate(ninety.getDate() - 90)
    const ninetyStr = ninety.toISOString().slice(0, 10)
    const last90 = past.filter(a => a.date >= ninetyStr)
    // Tipo dominante = mode
    const typeCount = past.reduce<Record<string, number>>((acc, a) => {
      const t = a.type || 'general'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const tipoDominante = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    // Antigüedad: oldest remate date we know about
    const oldestDate = past.length > 0 ? past[0].date : (sorted[0]?.date ?? null)
    // Plazas habituales: top 5 cities by count
    const cityCount = past.reduce<Record<string, number>>((acc, a) => {
      const c = getCity(a.location)
      if (!c) return acc
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {})
    const plazasTop = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c, n]) => ({ city: c, count: n }))
    return {
      pastCount: past.length,
      upcomingCount: upcoming.length,
      last90Count: last90.length,
      monthlyAvg: last90.length / 3, // rough: 3 months
      tipoDominante,
      oldestDate,
      plazasTop,
    }
  }, [sorted, upcoming.length, today])

  // Group by month
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; auctions: Auction[] }[] = []
    const map = new Map<string, Auction[]>()
    for (const a of sorted) {
      const d = new Date(a.date + 'T12:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map.has(key)) {
        map.set(key, [])
        groups.push({ key, label: `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`, auctions: map.get(key)! })
      }
      map.get(key)!.push(a)
    }
    return groups
  }, [sorted])

  // Fecha corta "12 jun" para las tarjetas del hero (MONTH_FULL es module-level).
  const fmtDate = (dstr: string) => {
    const d = new Date(dstr + 'T12:00:00')
    return `${d.getDate()} ${(MONTH_FULL[d.getMonth()] || '').slice(0, 3).toLowerCase()}`
  }

  // Logo: usa el subido por la firma, o el del logo-map (firmas más importantes).
  // Los del logo-map están pensados para fondo de color de marca → mejor legibilidad.
  const logoSrc = profile.logoUrl ?? getLogoUrl(profile.canonicalSlug)
  const brandColor = !profile.logoUrl ? getBrandColor(profile.canonicalSlug) : null

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pt-3 pb-20 md:pb-3 space-y-0">
      {/* ============================================================ */}
      {/*  HERO — above-the-fold. Responde las 3 preguntas del productor: */}
      {/*  ¿cuándo el próximo remate? ¿qué precios? ¿cómo lo sigo?        */}
      {/*  Reemplaza el header + stats-bar de 5 métricas (carga cognitiva).*/}
      {/* ============================================================ */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors text-xxs font-terminal">
              &larr; DIRECTORIO
            </Link>
            <span className="text-terminal-border">&mdash;</span>
            {logoSrc && (
              <div
                className={`rounded-terminal border overflow-hidden flex-shrink-0 relative flex items-center justify-center w-12 h-12 ${
                  tier === 'pro' || tier === 'enterprise'
                    ? 'border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'border-terminal-border'
                }`}
                style={{ backgroundColor: brandColor || (profile.logoUrl ? '#ffffff' : 'var(--terminal-bg, #0b0b0e)') }}
              >
                <Image src={logoSrc} alt={`Logo ${profile.displayName}`} className="object-contain p-1.5" width={48} height={48} unoptimized />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="section-heading text-label tracking-widest">{profile.displayName.toUpperCase()}</h1>
              {(tier === 'pro' || tier === 'enterprise') ? (
                <ProBadge verified={profile.verified} size="md" />
              ) : profile.verified ? (
                <VerifiedBadge size="md" />
              ) : null}
              {provinces.map(prov => (
                <span key={prov} className="inline-flex px-1.5 py-0.5 text-xxs border border-terminal-border text-zinc-500 rounded-terminal">
                  {prov}
                </span>
              ))}
            </div>
          </div>
          {!profile.claimedAt && (
            <Link href={`/consignatarias/${profile.canonicalSlug}/verificar`} rel="nofollow" className="text-xxs font-terminal text-zinc-500 hover:text-accent transition-colors">
              ¿Es tu firma? Reclamala &rarr;
            </Link>
          )}
        </div>

        <div className="px-panel py-3 grid gap-3 grid-cols-1 lg:grid-cols-3">
          {/* CARD A — PRÓXIMO REMATE (Job 1) */}
          <div className="rounded-terminal border border-terminal-border bg-terminal-bg/40 p-3 flex flex-col">
            <div className="text-xxs uppercase tracking-widest text-zinc-500 mb-2">Próximo remate</div>
            {upcoming.length > 0 ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge date={upcoming[0].date} time={upcoming[0].time} today={today} />
                  <RemateCountdown date={upcoming[0].date} time={upcoming[0].time} />
                </div>
                <div className="text-data text-zinc-100 font-medium mt-1.5">
                  {fmtDate(upcoming[0].date)}{upcoming[0].time ? ` · ${upcoming[0].time}` : ''}
                </div>
                <div className="text-xxs text-zinc-300 mt-0.5 leading-snug">{upcoming[0].title}</div>
                {(getCity(upcoming[0].location) || upcoming[0].province) && (
                  <div className="text-xxs text-zinc-500 mt-0.5">
                    {getCity(upcoming[0].location)}{upcoming[0].province ? `, ${upcoming[0].province}` : ''}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {upcoming[0].youtubeUrl && (
                    <a href={normalizeUrl(upcoming[0].youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundClick(upcoming[0].youtubeUrl || '', 'youtube')} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-terminal uppercase tracking-wider text-positive border border-positive/30 rounded-terminal hover:bg-positive/10 transition-colors">
                      &#9654; En vivo
                    </a>
                  )}
                  {upcoming[0].catalogUrl && (
                    <a href={normalizeUrl(upcoming[0].catalogUrl) || '#'} target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundClick(upcoming[0].catalogUrl || '', 'catalog')} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-terminal uppercase tracking-wider text-accent border border-accent/30 rounded-terminal hover:bg-accent/10 transition-colors">
                      Catálogo
                    </a>
                  )}
                  {youtubeChannel?.channelUrl && (
                    <a href={youtubeChannel.channelUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundClick(youtubeChannel.channelUrl, 'youtube')} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-terminal uppercase tracking-wider text-zinc-300 border border-terminal-border rounded-terminal hover:border-zinc-500 transition-colors">
                      &#9654; Canal YT
                    </a>
                  )}
                </div>
                {upcoming.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-terminal-border/60 space-y-1">
                    {upcoming.slice(1, 4).map((a, i) => (
                      <div key={`${a.date}-${i}`} className="flex items-baseline gap-2 text-xxs">
                        <span className="text-zinc-400 tabular-nums shrink-0">{fmtDate(a.date)}</span>
                        <span className="text-zinc-500 truncate">{a.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xxs text-zinc-500">
                Sin remates programados. <a href="#remates" className="text-accent hover:text-accent-bright">Ver historial &rarr;</a>
              </div>
            )}
          </div>

          {/* CARD B — ÚLTIMOS PRECIOS (Job 2) */}
          <div className="rounded-terminal border border-terminal-border bg-terminal-bg/40 p-3 flex flex-col">
            <div className="text-xxs uppercase tracking-widest text-zinc-500 mb-2">Últimos precios</div>
            {latestRemateSummary ? (
              <>
                <div className="text-xxs text-zinc-500">{latestRemateSummary.fuente} · <span className="tabular-nums">{latestRemateSummary.fecha}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {latestRemateSummary.top.map((c, i) => (
                    <span key={i} className="text-xxs font-terminal text-zinc-200 px-1.5 py-0.5 border border-terminal-border rounded-terminal">
                      {c.label} <span className="text-positive tabular-nums">${c.mid.toLocaleString('es-AR')}/kg</span>
                    </span>
                  ))}
                </div>
                <a href="#precios-observados" className="text-xxs text-accent hover:text-accent-bright mt-2 inline-block">Ver tabla completa &rarr;</a>
              </>
            ) : (
              <div className="text-xxs text-zinc-600 leading-relaxed">Los precios $/kg por categoría aparecen acá cuando la firma reporta su próximo remate.</div>
            )}
          </div>

          {/* CARD C — SEGUIR / CONTACTAR (Job 3) */}
          <div className="rounded-terminal border border-terminal-border bg-terminal-bg/40 p-3 flex flex-col">
            <div className="text-xxs uppercase tracking-widest text-zinc-500 mb-2">Seguir / contactar</div>
            {(profile.whatsapp || profile.phone || profile.email || profile.website) ? (
              <div className="flex flex-col gap-1.5">
                {profile.whatsapp && (
                  <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundClick(profile.whatsapp || '', 'whatsapp')} className="text-xxs text-positive hover:text-emerald-300 font-terminal transition-colors">
                    WhatsApp · {profile.whatsapp}
                  </a>
                )}
                {profile.phone && (
                  <span className="text-xxs font-terminal text-zinc-300"><span className="text-zinc-500 uppercase">Tel:</span> {profile.phone}</span>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors truncate">{profile.email}</a>
                )}
                {profile.website && (
                  <a href={normalizeUrl(profile.website) || '#'} target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundClick(profile.website || '', 'website')} className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors truncate">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            ) : (
              <div className="text-xxs text-zinc-600">Sin datos de contacto públicos todavía.</div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-terminal-border/60">
              <Link href={`/calendario/${profile.canonicalSlug}`} className="text-xxs font-terminal uppercase tracking-wider text-sky-400 hover:text-sky-300 transition-colors">
                Suscribir calendario
              </Link>
              <Link href={`/go/${profile.canonicalSlug}`} className="text-xxs font-terminal uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors">
                Compartir
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* QUIÉN OPERA — colapsado (confianza, secundario). Solo si hay datos de persona. */}
      {(profile.referenteNombre || profile.bioReferente || profile.especialidad || profile.regionOperativa || profile.anosOficio) && (
      <Accordion title="Quién opera">
        {(profile.referenteNombre || profile.bioReferente || profile.especialidad || profile.regionOperativa || profile.anosOficio) ? (
          <div className="px-panel py-4 flex flex-col sm:flex-row gap-4">
            {profile.fotoReferenteUrl && (
              <div className="w-24 h-24 rounded-terminal border border-terminal-border bg-terminal-bg overflow-hidden relative shrink-0">
                <Image
                  src={profile.fotoReferenteUrl}
                  alt={`Foto de ${profile.referenteNombre || profile.displayName}`}
                  className="object-cover"
                  fill
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              {profile.referenteNombre && (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-data font-medium text-zinc-100">{profile.referenteNombre}</span>
                  {profile.referenteCargo && (
                    <span className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">· {profile.referenteCargo}</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xxs font-terminal">
                {profile.especialidad && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-500 uppercase tracking-wider">Especialidad: </span>
                    <span className="text-zinc-200">{profile.especialidad}</span>
                  </span>
                )}
                {profile.regionOperativa && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-500 uppercase tracking-wider">Región: </span>
                    <span className="text-zinc-200">{profile.regionOperativa}</span>
                  </span>
                )}
                {profile.anosOficio && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-500 uppercase tracking-wider">Años en oficio: </span>
                    <span className="text-zinc-200 tabular-nums">{profile.anosOficio}</span>
                  </span>
                )}
              </div>
              {profile.bioReferente && (
                <p className="text-data text-zinc-300 leading-relaxed pt-1">{profile.bioReferente}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="px-panel py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xxs text-zinc-500 font-terminal leading-relaxed flex-1 min-w-0">
              Aún no tenemos foto, especialidad o bio del referente que opera {profile.displayName}.
              {!profile.claimedAt && ' Si sos parte del equipo, podés completarlo:'}
            </p>
            {!profile.claimedAt && (
              <Link
                href={`/consignatarias/${profile.canonicalSlug}/verificar`}
                rel="nofollow"
                className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright border border-accent/30 rounded-terminal px-3 py-1.5 transition-colors hover:bg-accent/10 shrink-0"
              >
                Reclamar perfil →
              </Link>
            )}
          </div>
        )}
      </Accordion>
      )}

      {/* HISTORIAL VERIFICABLE — colapsado (derivado de los remates). */}
      <Accordion title="Historial verificable">
        <div className="px-panel py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">Remates 90 d</span>
            <span className="text-data tabular-nums text-zinc-100 font-terminal">{historial.last90Count}</span>
            <span className="text-xxs text-zinc-500 font-terminal">~{historial.monthlyAvg.toFixed(1)}/mes</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">Tipo dominante</span>
            <span className="text-data text-zinc-100 font-terminal">
              {historial.tipoDominante ? (TYPE_LABELS_SHORT[historial.tipoDominante] || historial.tipoDominante) : '—'}
            </span>
            <span className="text-xxs text-zinc-500 font-terminal">últimos 90 d</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">Plazas</span>
            <span className="text-data tabular-nums text-zinc-100 font-terminal">{historial.plazasTop.length}</span>
            <span className="text-xxs text-zinc-500 font-terminal truncate">
              {historial.plazasTop.slice(0, 2).map(p => p.city).join(', ') || '—'}
            </span>
          </div>
        </div>
        {historial.plazasTop.length > 0 && (
          <div className="px-panel pb-3 pt-1 border-t border-terminal-border">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1.5">Plazas habituales</div>
            <div className="flex flex-wrap gap-1.5">
              {historial.plazasTop.map(p => (
                <span key={p.city} className="text-xxs font-terminal text-zinc-300 px-1.5 py-0.5 border border-terminal-border rounded-terminal">
                  {p.city} <span className="text-zinc-500 tabular-nums">· {p.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Accordion>

      {/* ============================================================ */}
      {/*  RESEÑAS DE PRODUCTORES — Sprint 3. "Quién avala" — boca a    */}
      {/*  boca capturado. Stats + lista + form de envío anónimo         */}
      {/*  (modera admin antes de aprobar).                              */}
      {/* ============================================================ */}
      <ReviewsPanel
        consignatariaSlug={profile.canonicalSlug}
        consignatariaName={profile.displayName}
        reviews={reviews}
        stats={reviewStats}
      />

      {/* CONTACTO + share/subscribe se movieron al hero (tarjeta C). La descripción
          larga de la firma vive en el bloque server (resumen) por SEO. */}

      {/* ============================================================ */}
      {/*  MEDIOS DE PAGO (PRO-gated, rendered server-side)             */}
      {/* ============================================================ */}
      {mediosPagoSlot}

      {/* ============================================================ */}
      {/*  CLAIM CTA + COMPLETENESS                                     */}
      {/* ============================================================ */}
      {(() => {
        const { percent, missing } = calculateCompleteness(profile)
        return (
          <div className="glass-panel mt-px">
            <div className="px-panel py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">Perfil completo:</span>
                  <span className={`text-xxs tabular-nums font-terminal ${percent >= 75 ? 'text-positive' : 'text-warning'}`}>{percent}%</span>
                </div>
                <div className="gradient-bar w-full max-w-[200px]">
                  <div className={percent >= 75 ? 'gradient-bar-fill-positive' : 'gradient-bar-fill-amber'} style={{ width: `${percent}%` }} />
                </div>
                {missing.length > 0 && (
                  <p className="text-xxs text-zinc-500 font-terminal mt-1.5">
                    Faltan: {missing.join(', ')}
                  </p>
                )}
              </div>
              {!profile.claimedAt && (
                <Link
                  href={`/consignatarias/${profile.canonicalSlug}/verificar`}
                  rel="nofollow"
                  onClick={() => trackClaimCTA(profile.canonicalSlug, profile.displayName)}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-positive text-zinc-900 text-xs font-bold uppercase tracking-wider hover:bg-positive/90 transition-colors rounded shadow-lg"
                >
                  Reclamar gratis
                </Link>
              )}
            </div>
            {/* Value Preview Panel - shows benefits for unclaimed profiles */}
            {!profile.claimedAt && (
              <div className="px-panel py-3 border-t border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xxs text-amber-400 font-terminal uppercase tracking-wider">
                    ¿Es tu consignataria?
                  </span>
                  <span className="text-xxs text-zinc-500 font-terminal">
                    Gratis · 5 minutos
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xxs text-zinc-300 font-terminal">
                  <li className="flex items-center gap-2">
                    <span className="text-positive">✓</span>
                    Editá tu información de contacto
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive">✓</span>
                    Publicá tus propios remates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive">✓</span>
                    Recibí consultas de compradores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive">✓</span>
                    Badge de perfil verificado
                  </li>
                </ul>
              </div>
            )}
          </div>
        )
      })()}

      {/* ============================================================ */}
      {/*  MAG ENTRY DATA (when available for today's auctions)         */}
      {/* ============================================================ */}
      {magEntry && magEntry.totalCabezas > 0 && (
        <Accordion title="Red de remitentes · MAG" badge={<span className="text-xxs text-zinc-500 font-terminal">{magEntry.period}</span>}>
          <div className="px-panel py-3">
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
              <span className="text-2xl font-terminal text-positive tabular-nums">
                {magEntry.totalCabezas.toLocaleString('es-AR')}
              </span>
              <span className="text-xxs text-zinc-500 uppercase">cabezas</span>
              <span className="text-xxs text-zinc-600">|</span>
              <span className="text-xxs text-zinc-500">
                {magEntry.entries.length} remitente{magEntry.entries.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xxs text-zinc-600">|</span>
              <span className="text-xxs text-zinc-500">
                {[...new Set(magEntry.entries.map(e => e.localidad))].length} localidades
              </span>
            </div>
            {magEntry.entries.length > 0 && (
              <div className="space-y-1">
                <div className="text-xxs text-zinc-500 uppercase mb-2">Top productores:</div>
                <div className="grid gap-1">
                  {magEntry.entries.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xxs font-terminal py-1 px-2 bg-zinc-900/30 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-300 truncate">{entry.remitente}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-500 truncate">{entry.localidad}</span>
                        <span className="text-zinc-600 text-xxs">{entry.provincia}</span>
                      </div>
                      <span className="text-positive tabular-nums flex-shrink-0 ml-2">{entry.cabezas} cab</span>
                    </div>
                  ))}
                </div>
                {magEntry.entries.length > 5 && (
                  <Link
                    href={`/consignatarias/${profile.canonicalSlug}/remitentes`}
                    className="flex items-center justify-center gap-2 mt-2 py-2 text-xxs font-terminal text-accent hover:text-accent-bright hover:bg-accent/5 border border-transparent hover:border-accent/20 rounded transition-colors"
                  >
                    Ver todos los {magEntry.entries.length} remitentes →
                  </Link>
                )}
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-zinc-800/50 text-xxs text-zinc-600 font-terminal flex items-center justify-between">
              <span>Fuente: Mercado Agroganadero S.A.</span>
              <span className="text-zinc-700">Datos públicos de guías de tránsito</span>
            </div>
          </div>
        </Accordion>
      )}

      {/* CALENDARIO + TIPOS — colapsado (vistas secundarias del cronograma). */}
      <Accordion title="Calendario anual y tipos de remate">
        <div className="px-panel py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CalendarHeatmap auctions={auctions} />
          <TypeDistribution auctions={auctions} />
        </div>
      </Accordion>

      {/* RESULTADOS DE REMATES — colapsado (histórico de precios). */}
      {auctionResults.length > 0 && (
        <Accordion title="Resultados de remates" badge={<span className="text-xxs text-zinc-500 font-terminal">{auctionResults.length}</span>}>
          <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
            <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Fecha</span>
            <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Remate</span>
            <span className="w-[80px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Cab.</span>
            <span className="w-[100px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">$/kg prom.</span>
            <span className="w-[100px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">$/kg max.</span>
          </div>
          {auctionResults.map(result => (
            <div key={result.id} className="border-b border-terminal-border">
              {/* Mobile */}
              <div className="md:hidden p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-data tabular-nums font-terminal text-zinc-300">
                    {formatDateShort(result.auction_date)}
                  </span>
                  {result.total_heads_sold != null && (
                    <span className="text-data tabular-nums font-terminal text-zinc-400">
                      {result.total_heads_sold.toLocaleString('es-AR')} cab.
                    </span>
                  )}
                </div>
                <div className="text-data font-terminal text-zinc-200 truncate">{result.auction_title}</div>
                <div className="flex items-center gap-3">
                  {result.average_price != null && (
                    <span className="text-xxs text-zinc-500 font-terminal">
                      Prom: <span className="text-zinc-300 tabular-nums">${result.average_price.toLocaleString('es-AR')}</span>
                    </span>
                  )}
                  {result.max_price != null && (
                    <span className="text-xxs text-zinc-500 font-terminal">
                      Max: <span className="text-positive tabular-nums">${result.max_price.toLocaleString('es-AR')}</span>
                    </span>
                  )}
                </div>
              </div>
              {/* Desktop */}
              <div className="hidden md:flex items-center gap-0 px-cell py-px2">
                <span className="w-[56px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-300">
                  {formatDateShort(result.auction_date)}
                </span>
                <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate">
                  {result.auction_title}
                </span>
                <span className="w-[80px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-400 text-right">
                  {result.total_heads_sold != null ? result.total_heads_sold.toLocaleString('es-AR') : '\u2014'}
                </span>
                <span className="w-[100px] flex-shrink-0 text-data tabular-nums font-terminal text-zinc-300 text-right">
                  {result.average_price != null ? `$${result.average_price.toLocaleString('es-AR')}` : '\u2014'}
                </span>
                <span className="w-[100px] flex-shrink-0 text-data tabular-nums font-terminal text-positive text-right">
                  {result.max_price != null ? `$${result.max_price.toLocaleString('es-AR')}` : '\u2014'}
                </span>
              </div>
            </div>
          ))}
        </Accordion>
      )}

      {/* ============================================================ */}
      {/*  UPGRADE PROMPT — verified OR unclaimed (free tier). Was `verified` only,
          but 0 profiles are verified so it never rendered. Unclaimed profiles are
          exactly where the consignataria looks at her own listing (claim_cta_click pulse). */}
      {/* ============================================================ */}
      {(profile.verified || !profile.claimedAt) && tier === 'free' && (
        <FeatureGate
          tier={tier}
          requiredTier="pro"
          fallback={
            <div className="terminal-panel mt-px bg-amber-500/[0.03]">
              <div className="px-panel py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 text-lg mt-0.5">📧</span>
                  <div>
                    <p className="text-xs text-zinc-300 font-terminal font-medium mb-1">
                      Cada remate tuyo, enviado a +500 productores
                    </p>
                    <p className="text-xxs text-zinc-500 font-terminal">
                      Con PRO, tus remates llegan por email a toda nuestra base activa. Badge dorado, analytics de perfil, y landing personalizada.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/planes?audience=consignataria&from=profile-${profile.canonicalSlug}`}
                  rel="nofollow"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border text-xxs font-terminal uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-amber-500/20"
                  style={{
                    background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1))',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                  }}
                >
                  <span className="text-amber-400">★</span>
                  Activar PRO — $45.000/mes
                </Link>
              </div>
            </div>
          }
        >
          {null}
        </FeatureGate>
      )}

      {/* ============================================================ */}
      {/*  YOUTUBE CHANNEL                                                */}
      {/* ============================================================ */}
      {youtubeChannel && (
        <Accordion title="Último video · YouTube" badge={<a href={youtubeChannel.channelUrl} target="_blank" rel="noopener noreferrer" className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors">Ver canal &rarr;</a>}>
          <div className="px-panel py-3">
            {youtubeChannel.latestVideo ? (
              <div className="flex items-start gap-3">
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeChannel.latestVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 relative group/thumb"
                >
                  <Image
                    src={youtubeChannel.latestVideo.thumbnail}
                    alt={youtubeChannel.latestVideo.title}
                    width={160}
                    height={96}
                    className="rounded-terminal border border-terminal-border object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/thumb:bg-black/20 transition-colors rounded-terminal">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="opacity-80 group-hover/thumb:opacity-100 transition-opacity">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </a>
                <div className="flex-1 min-w-0 space-y-1">
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeChannel.latestVideo.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-data font-terminal text-zinc-200 hover:text-accent transition-colors line-clamp-2 block"
                  >
                    {youtubeChannel.latestVideo.title}
                  </a>
                  <p className="text-xxs text-zinc-500 font-terminal">
                    {formatDateShort(youtubeChannel.latestVideo.publishedAt.slice(0, 10))}
                  </p>
                  <p className="text-xxs text-zinc-500 font-terminal truncate">
                    {youtubeChannel.channelTitle}
                  </p>
                </div>
              </div>
            ) : (
              <a
                href={youtubeChannel.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
              >
                {youtubeChannel.channelTitle}
              </a>
            )}
          </div>
        </Accordion>
      )}

      {/* GALERÍA DE VIDEOS — colapsado. */}
      {videos.length > 0 && (
        <Accordion title="Galería de videos" badge={<span className="text-xxs text-zinc-500 font-terminal">{videos.length}</span>}>
          <div className="px-panel py-3">
            <VideoGallery videos={videos} consignatariaName={profile.displayName} />
          </div>
        </Accordion>
      )}

      {/* ============================================================ */}
      {/*  EXTERNAL RESOURCES (catalog, app, etc.)                      */}
      {/* ============================================================ */}
      {externalResources.length > 0 && (
        <Accordion title="Recursos y enlaces">
          <div className="px-panel py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {externalResources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackOutboundClick(resource.url, resource.type as 'catalog' | 'website')}
                  className="group flex items-start gap-3 p-3 border border-terminal-border rounded-terminal hover:border-accent/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-terminal bg-zinc-800 group-hover:bg-accent/10 transition-colors">
                    {resource.type === 'catalog' && (
                      <svg className="w-4 h-4 text-zinc-400 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {resource.type === 'app' && (
                      <svg className="w-4 h-4 text-zinc-400 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {resource.type === 'results' && (
                      <svg className="w-4 h-4 text-zinc-400 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {resource.type === 'website' && (
                      <svg className="w-4 h-4 text-zinc-400 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-data font-terminal text-zinc-200 group-hover:text-accent transition-colors block">
                      {resource.label}
                    </span>
                    {resource.description && (
                      <span className="text-xxs text-zinc-500 font-terminal line-clamp-1 block mt-0.5">
                        {resource.description}
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-zinc-600 group-hover:text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </Accordion>
      )}

      {/* ============================================================ */}
      {/*  RELATED CONSIGNATARIAS (same province)                       */}
      {/* ============================================================ */}
      {relatedConsignatarias.length > 0 && (
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="section-heading text-xxs">TAMBIÉN EN {profile.province?.toUpperCase() || 'LA ZONA'}</span>
            <Link
              href={`/consignatarias?provincia=${encodeURIComponent(profile.province || '')}`}
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
            >
              VER MÁS &rarr;
            </Link>
          </div>
          <div className="px-panel py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedConsignatarias.map((related) => (
                <Link
                  key={related.slug}
                  href={`/consignatarias/${related.slug}`}
                  className="group flex flex-col items-center gap-2 p-3 bg-zinc-900/50 border border-terminal-border rounded-terminal hover:border-accent/30 hover:bg-zinc-800/50 transition-colors"
                >
                  {related.logoUrl ? (
                    <Image
                      src={related.logoUrl}
                      alt={`Logo ${related.name}`}
                      width={48}
                      height={48}
                      className="rounded-terminal object-contain bg-white"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-terminal bg-zinc-800 flex items-center justify-center">
                      <span className="text-lg font-terminal text-zinc-500">
                        {related.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xxs font-terminal text-zinc-300 group-hover:text-accent text-center line-clamp-2 transition-colors">
                    {related.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DT-e CTA removed - not relevant for consignatarias viewing their profile */}

      {/* ============================================================ */}
      {/*  AUCTION LIST GROUPED BY MONTH                                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px" id="remates">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">CRONOGRAMA</span>
          <span className="text-xxs text-zinc-500 font-terminal hidden sm:inline">
            {auctions.length} remates &middot; orden cronologico
          </span>
        </div>

        {/* Column headers (desktop only) */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Fecha</span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Hora</span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Remate</span>
          <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">Plaza</span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Prv</span>
        </div>

        {byMonth.map(group => (
          <div key={group.key}>
            <div className="border-b border-terminal-border bg-zinc-900/50 px-cell py-1.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-accent font-medium tracking-wider">
                {group.label.toUpperCase()}
              </span>
              <span className="text-xxs font-terminal tabular-nums text-zinc-500">
                {group.auctions.length} remate{group.auctions.length !== 1 ? 's' : ''}
              </span>
            </div>
            {group.auctions.map(auction => (
              <ProfileAuctionRow key={auction.id} auction={auction} today={today} />
            ))}
          </div>
        ))}

        {auctions.length === 0 && (
          <div className="px-panel py-8 text-center">
            <p className="text-data text-zinc-500 font-terminal">No hay remates registrados.</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
          <span className="text-xxs text-zinc-500 font-terminal">
            {auctions.length} resultado{auctions.length !== 1 ? 's' : ''}
          </span>
          <Link href="/remates" className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors">
            VER TODOS LOS REMATES
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  REPORTAR ERROR                                               */}
      {/* ============================================================ */}
      <div className="text-center py-4">
        <a
          href={`mailto:agro@memola.com.ar?subject=${encodeURIComponent(`Error en perfil: ${profile.displayName}`)}&body=${encodeURIComponent(`Hola,\n\nEncontre un error en el perfil de ${profile.displayName}:\nhttps://www.consignatarias.com.ar/consignatarias/${profile.canonicalSlug}\n\nDescripcion del error:\n`)}`}
          className="text-xxs font-terminal text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          Reportar error
        </a>
      </div>

      {/* BARRA STICKY MOBILE — próximo remate + WhatsApp; absorbe el FAB flotante
          (que tapaba el cronograma). Solo <md. */}
      <StickyBar
        nextDateLabel={upcoming.length > 0 ? `${fmtDate(upcoming[0].date)}${upcoming[0].time ? ` · ${upcoming[0].time}` : ''} — ${upcoming[0].title}` : null}
        isLive={upcoming.length > 0 && getEffectiveStatus(upcoming[0].date, upcoming[0].time, today) === 'live'}
        whatsapp={profile.whatsapp || null}
        onSeeRemates={() => {}}
      />
    </div>
  )
}
