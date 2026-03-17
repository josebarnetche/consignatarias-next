'use client'

import { useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Auction } from '@/lib/db/schema'
import type { EnrichedProfile } from '@/lib/dal/consignatarias'
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
import WhatsAppFAB from '@/components/WhatsAppFAB'
import type { RelatedConsignataria } from '@/lib/dal/consignatarias'

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
}

export default function ConsignatariaProfileClient({ profile, auctions, tier, auctionResults, youtubeChannel, videos = [], relatedConsignatarias = [], externalResources = [] }: ConsignatariaProfileClientProps) {
  const today = getEffectiveToday()

  useEffect(() => {
    trackProfileView(profile.canonicalSlug, profile.displayName, auctions.length)

    // Server-side view tracking
    fetch('/api/profile-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'consignataria',
        entitySlug: profile.canonicalSlug,
      }),
    }).catch(() => {}) // fire-and-forget
  }, [profile.canonicalSlug, profile.displayName, auctions.length])

  const sorted = useMemo(
    () => [...auctions].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
    [auctions]
  )

  const upcoming = useMemo(() => sorted.filter(a => a.date >= today), [sorted, today])
  const totalHeads = useMemo(() => auctions.reduce((s, a) => s + (a.estimatedHeads ?? 0), 0), [auctions])
  const provinces = useMemo(() => [...new Set(auctions.map(a => a.province))], [auctions])
  const cities = useMemo(() => [...new Set(auctions.map(a => getCity(a.location)))].slice(0, 5), [auctions])

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

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-0">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors text-xxs font-terminal">
              &larr; DIRECTORIO
            </Link>
            <span className="text-terminal-border">&mdash;</span>
            {profile.logoUrl && (
              <div className={`rounded-terminal border overflow-hidden flex-shrink-0 relative ${
                tier === 'pro' || tier === 'enterprise' 
                  ? 'w-16 h-16 border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/10' 
                  : 'w-8 h-8 border-terminal-border bg-terminal-bg'
              }`}>
                <Image src={profile.logoUrl} alt={`Logo ${profile.displayName}`} className="object-contain" fill unoptimized />
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
          <span className="text-xxs tabular-nums text-zinc-500 font-terminal">
            {auctions.length} remates
          </span>
        </div>

        {/* Stats bar */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-4 md:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Cabezas:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">
              ~{totalHeads.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Proximos:</span>
            <span className={`text-data tabular-nums font-terminal ${upcoming.length > 0 ? 'text-positive' : 'text-zinc-500'}`}>
              {upcoming.length}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <span className="text-xxs text-zinc-500 uppercase">Provincias:</span>
            <span className="text-data text-zinc-400 font-terminal text-xxs">
              {provinces.join(', ')}
            </span>
          </div>
          {cities.length > 0 && (
            <>
              <div className="text-terminal-border text-xxs select-none hidden md:block">|</div>
              <div className="flex items-center gap-1.5 hidden md:flex">
                <span className="text-xxs text-zinc-500 uppercase">Plazas:</span>
                <span className="text-data text-zinc-400 font-terminal text-xxs truncate max-w-[200px]">
                  {cities.join(', ')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CONTACT INFO (only when data available)                       */}
      {/* ============================================================ */}
      {(profile.phone || profile.email || profile.website || profile.whatsapp || profile.description) && (
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">CONTACTO</span>
          </div>
          <div className="px-panel py-3 space-y-2">
            {profile.description && (
              <p className="text-xxs text-zinc-400 font-terminal">{profile.description}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {profile.phone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 uppercase font-terminal">Tel:</span>
                  <span className="text-xxs text-zinc-300 font-terminal">{profile.phone}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 uppercase font-terminal">Email:</span>
                  <a href={`mailto:${profile.email}`} className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors">
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 uppercase font-terminal">Web:</span>
                  <a
                    href={normalizeUrl(profile.website) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackOutboundClick(profile.website || '', 'website')}
                    className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {profile.whatsapp && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xxs text-zinc-500 uppercase font-terminal">WhatsApp:</span>
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackOutboundClick(profile.whatsapp || '', 'whatsapp')}
                    className="text-xxs text-positive hover:text-emerald-300 font-terminal transition-colors"
                  >
                    {profile.whatsapp}
                  </a>
                </div>
              )}
            </div>
            {/* Share & Subscribe row */}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-zinc-800/50">
              <Link
                href={`/go/${profile.canonicalSlug}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/20 transition-colors rounded"
              >
                🎯 Link para compartir
              </Link>
              <Link
                href={`/calendario/${profile.canonicalSlug}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xxs font-terminal uppercase tracking-wider hover:bg-sky-500/20 transition-colors rounded"
              >
                📅 Suscribir calendario
              </Link>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Mirá los remates de ${profile.displayName}: https://consignatarias.com.ar/go/${profile.canonicalSlug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xxs font-terminal uppercase tracking-wider hover:bg-emerald-500/20 transition-colors rounded"
              >
                📤 Compartir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

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
                  onClick={() => trackClaimCTA(profile.canonicalSlug, profile.displayName)}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors shadow-live-glow"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-live" />
                  Verificar este perfil
                </Link>
              )}
            </div>
          </div>
        )
      })()}

      {/* ============================================================ */}
      {/*  CALENDAR HEATMAP + TYPE DISTRIBUTION                         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">CALENDARIO ANUAL</span>
          </div>
          <div className="px-panel py-3">
            <CalendarHeatmap auctions={auctions} />
          </div>
        </div>

        <div className="terminal-panel mt-px md:ml-px">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">TIPO DE REMATE</span>
          </div>
          <div className="px-panel py-3">
            <TypeDistribution auctions={auctions} />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  AUCTION RESULTS                                               */}
      {/* ============================================================ */}
      {auctionResults.length > 0 && (
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-400 text-xxs tracking-widest">RESULTADOS DE REMATES</span>
            <span className="text-xxs text-zinc-500 font-terminal">
              {auctionResults.length} resultado{auctionResults.length !== 1 ? 's' : ''}
            </span>
          </div>
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
        </div>
      )}

      {/* ============================================================ */}
      {/*  UPGRADE PROMPT (verified + free tier)                         */}
      {/* ============================================================ */}
      {profile.verified && tier === 'free' && (
        <FeatureGate
          tier={tier}
          requiredTier="pro"
          fallback={
            <div className="terminal-panel mt-px">
              <div className="px-panel py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xxs text-zinc-500 font-terminal">
                  Upgrade a PRO para destacar tu perfil con badge dorado, resultados de remates y mas visibilidad.
                </p>
                <Link
                  href="/planes"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
                >
                  Upgrade a PRO
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
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="section-heading text-xxs">ULTIMO VIDEO</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-600/20 border border-red-500/30 rounded-sm">
                <span className="text-red-400 font-terminal text-[10px] font-bold">YT</span>
              </span>
            </div>
            <a
              href={youtubeChannel.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
            >
              VER CANAL &rarr;
            </a>
          </div>
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
        </div>
      )}

      {/* ============================================================ */}
      {/*  VIDEO GALLERY                                                 */}
      {/* ============================================================ */}
      {videos.length > 0 && (
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="section-heading text-xxs">GALERÍA DE VIDEOS</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-600/20 border border-red-500/30 rounded-sm">
                <span className="text-red-400 font-terminal text-[10px] font-bold">YT</span>
              </span>
            </div>
            <span className="text-xxs text-zinc-500 font-terminal">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="px-panel py-3">
            <VideoGallery videos={videos} consignatariaName={profile.displayName} />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  EXTERNAL RESOURCES (catalog, app, etc.)                      */}
      {/* ============================================================ */}
      {externalResources.length > 0 && (
        <div className="terminal-panel mt-px">
          <div className="terminal-panel-header">
            <span className="section-heading text-xxs">RECURSOS Y ENLACES</span>
          </div>
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
        </div>
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

      {/* ============================================================ */}
      {/*  AUCTION LIST GROUPED BY MONTH                                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
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

      {/* ============================================================ */}
      {/*  WHATSAPP FAB (Insight #59)                                   */}
      {/* ============================================================ */}
      {profile.whatsapp && (
        <WhatsAppFAB
          whatsapp={profile.whatsapp}
          consignatariaName={profile.displayName}
        />
      )}
    </div>
  )
}
