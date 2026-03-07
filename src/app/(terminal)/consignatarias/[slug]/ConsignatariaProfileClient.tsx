'use client'

import { useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Auction } from '@/lib/db/schema'
import type { ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'
import { trackProfileView, trackOutboundClick } from '@/lib/analytics'
import {
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_LABELS_SHORT,
  TYPE_BAR_COLORS,
  CAT_LABELS,
  CAT_CODES,
  MONTH_NAMES,
  MONTH_FULL,
  formatDateShort,
  getCity,
  getProvinceCode,
  getEffectiveToday,
} from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status, date, today }: { status: Auction['status']; date: string; today: string }) {
  const isToday = date === today
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5" role="img" aria-label="En vivo">
        <span className="status-dot-live" />
        <span className="text-positive font-terminal text-xxs">EN VIVO</span>
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5" role="img" aria-label="Finalizado">
        <span className="status-dot-offline" />
        <span className="text-zinc-500 font-terminal text-xxs">FINALIZADO</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={isToday ? 'Hoy' : 'Programado'}>
      <span className={`status-dot ${isToday ? 'bg-positive animate-pulse-live' : 'bg-sky-400'}`} />
      <span className={`font-terminal text-xxs ${isToday ? 'text-positive' : 'text-sky-400'}`}>
        {isToday ? 'HOY' : 'PROGRAMADO'}
      </span>
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
          <StatusBadge status={auction.status} date={auction.date} today={today} />
        </div>
        <div className="text-data font-terminal text-zinc-200 group-hover:text-accent transition-colors truncate">
          {auction.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xxs text-zinc-500">{city}</span>
          <span className="text-xxs text-zinc-600">{auction.province}</span>
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
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catálogo">Catálogo</a>
          )}
          {auction.youtubeUrl && (
            <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
              onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
              className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión">YouTube</a>
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
              <span className="text-zinc-600">&mdash;</span>
            )}
          </span>
          <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors" title={auction.title}>
            {auction.title}
          </span>
          <span className="w-[140px] flex-shrink-0 text-data font-terminal text-zinc-500 truncate text-right pr-2">
            {city}
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-600 text-right">
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
            <StatusBadge status={auction.status} date={auction.date} today={today} />
          </span>
          <span className="flex-1" />
          <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {auction.catalogUrl && (
              <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.catalogUrl) || '', 'catalog')}
                className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catálogo" title="Catálogo">CAT</a>
            )}
            {auction.youtubeUrl && (
              <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
                className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión" title="YouTube">YT</a>
            )}
            {auction.sourceUrl && (
              <a href={normalizeUrl(auction.sourceUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.sourceUrl) || '', 'source')}
                className="text-xxs font-terminal text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="Ver fuente" title="Fuente">SRC</a>
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
                className={`absolute bottom-0 w-full transition-all ${
                  isCurrent ? 'bg-accent' : count > 0 ? 'bg-positive/70' : 'bg-zinc-800'
                }`}
                style={{ height: count > 0 ? `${Math.max(pct, 8)}%` : '2px' }}
              />
            </div>
            <span className={`text-[10px] font-terminal ${isCurrent ? 'text-accent font-medium' : 'text-zinc-600'}`}>
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
            <div className="flex-1 h-2.5 bg-zinc-900 relative">
              <div className={`h-full ${TYPE_BAR_COLORS[type] || 'bg-zinc-500'}`} style={{ width: `${barWidth}%` }} />
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

interface ConsignatariaProfileClientProps {
  profile: ConsignatariaProfile
  auctions: Auction[]
}

export default function ConsignatariaProfileClient({ profile, auctions }: ConsignatariaProfileClientProps) {
  const today = getEffectiveToday()

  useEffect(() => {
    trackProfileView(profile.canonicalSlug, profile.displayName, auctions.length)
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
            <Link href="/remates" className="text-zinc-600 hover:text-accent transition-colors text-xxs font-terminal">
              &larr; REMATES
            </Link>
            <span className="text-terminal-border">&mdash;</span>
            <h1 className="text-zinc-200 text-label tracking-widest">{profile.displayName.toUpperCase()}</h1>
          </div>
          <span className="text-xxs tabular-nums text-zinc-500 font-terminal">
            {auctions.length} remates
          </span>
        </div>

        {/* Stats bar */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-4 md:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Cabezas:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">
              ~{totalHeads.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Próximos:</span>
            <span className={`text-data tabular-nums font-terminal ${upcoming.length > 0 ? 'text-positive' : 'text-zinc-500'}`}>
              {upcoming.length}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <span className="text-xxs text-zinc-600 uppercase">Provincias:</span>
            <span className="text-data text-zinc-400 font-terminal text-xxs">
              {provinces.join(', ')}
            </span>
          </div>
          {cities.length > 0 && (
            <>
              <div className="text-terminal-border text-xxs select-none hidden md:block">|</div>
              <div className="flex items-center gap-1.5 hidden md:flex">
                <span className="text-xxs text-zinc-600 uppercase">Plazas:</span>
                <span className="text-data text-zinc-400 font-terminal text-xxs truncate max-w-[200px]">
                  {cities.join(', ')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

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
      {/*  AUCTION LIST GROUPED BY MONTH                                */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">CRONOGRAMA</span>
          <span className="text-xxs text-zinc-600 font-terminal hidden sm:inline">
            {auctions.length} remates &middot; orden cronológico
          </span>
        </div>

        {/* Column headers (desktop only) */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Fecha</span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Hora</span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Remate</span>
          <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right pr-2">Plaza</span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right">Prv</span>
        </div>

        {byMonth.map(group => (
          <div key={group.key}>
            <div className="border-b border-terminal-border bg-zinc-900/50 px-cell py-1.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-accent font-medium tracking-wider">
                {group.label.toUpperCase()}
              </span>
              <span className="text-xxs font-terminal tabular-nums text-zinc-600">
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
            <p className="text-data text-zinc-600 font-terminal">No hay remates registrados.</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
          <span className="text-xxs text-zinc-600 font-terminal">
            {auctions.length} resultado{auctions.length !== 1 ? 's' : ''}
          </span>
          <Link href="/remates" className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors">
            VER TODOS LOS REMATES
          </Link>
        </div>
      </div>
    </div>
  )
}
