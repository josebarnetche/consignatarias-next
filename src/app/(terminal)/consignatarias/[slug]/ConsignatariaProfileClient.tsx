'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { Auction } from '@/lib/db/schema'
import type { ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { normalizeUrl } from '@/lib/utils/url'

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TYPE_COLORS: Record<Auction['type'], string> = {
  invernada: 'border-positive text-positive',
  cria: 'border-accent text-accent',
  reproductores: 'border-warning text-warning',
  general: 'border-zinc-500 text-zinc-400',
  especial: 'border-negative text-negative',
}

const TYPE_LABELS: Record<Auction['type'], string> = {
  invernada: 'INVERNADA',
  cria: 'CRIA',
  reproductores: 'REPROD',
  general: 'GENERAL',
  especial: 'ESPECIAL',
}

const TYPE_BAR_COLORS: Record<Auction['type'], string> = {
  invernada: 'bg-positive',
  cria: 'bg-accent',
  reproductores: 'bg-warning',
  general: 'bg-zinc-500',
  especial: 'bg-negative',
}

const CAT_CODES: Record<Auction['mainCategory'], string> = {
  terneros: 'TERN',
  novillos: 'NOV',
  vaca_gorda: 'V.GOR',
  vaquillonas: 'VAQUI',
  toros: 'TOROS',
  mixto: 'MIXTO',
}

const PROVINCE_CODES: Record<string, string> = {
  'CORRIENTES': 'CORR',
  'CHACO': 'CHAC',
  'FORMOSA': 'FORM',
  'ENTRE RIOS': 'RIOS',
  'SANTA FE': 'STFE',
  'BUENOS AIRES': 'BSAS',
  'MISIONES': 'MISI',
  'SANTIAGO DEL ESTERO': 'SEST',
  'TUCUMAN': 'TUCU',
  'SALTA': 'SALT',
  'CORDOBA': 'CORD',
  'LA PAMPA': 'LPAM',
  'SAN LUIS': 'SLUI',
  'NEUQUEN': 'NEUQ',
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate().toString().padStart(2, '0')
  return `${day} ${MONTH_NAMES[d.getMonth()]}`
}

function getCity(location: string): string {
  return (location || '').split(',')[0].trim()
}

function getProvinceCode(province: string): string {
  return PROVINCE_CODES[province] || province.substring(0, 4).toUpperCase()
}

function getEffectiveToday(): string {
  const now = new Date()
  const art = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  if (art.getHours() >= 20) art.setDate(art.getDate() + 1)
  const y = art.getFullYear()
  const m = (art.getMonth() + 1).toString().padStart(2, '0')
  const d = art.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status, date, today }: { status: Auction['status']; date: string; today: string }) {
  const isToday = date === today
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-positive animate-pulse-live" />
        <span className="text-positive font-terminal text-xxs">VIVO</span>
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-zinc-600" />
        <span className="text-zinc-500 font-terminal text-xxs">FIN</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-1.5 h-1.5 ${isToday ? 'bg-positive animate-pulse-live' : 'bg-sky-400'}`} />
      <span className={`font-terminal text-xxs ${isToday ? 'text-positive' : 'text-sky-400'}`}>
        {isToday ? 'HOY' : 'PROG'}
      </span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  AUCTION ROW (simplified — no consignataria name column)            */
/* ------------------------------------------------------------------ */

function ProfileAuctionRow({ auction, today }: { auction: Auction; today: string }) {
  const isToday = auction.date === today
  const isPast = auction.date < today
  const city = getCity(auction.location)
  const prvCode = getProvinceCode(auction.province)
  const sourceUrl = normalizeUrl(auction.sourceUrl)
  const catalogUrl = normalizeUrl(auction.catalogUrl)
  const href = sourceUrl || catalogUrl || null

  function handleRowClick() {
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
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
      {/* Line 1: date time location province */}
      <div className="flex items-center gap-0 px-cell py-px2">
        <span className={`w-[52px] flex-shrink-0 text-data tabular-nums font-terminal ${
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
        <span className="hidden sm:block w-[140px] flex-shrink-0 text-data font-terminal text-zinc-500 truncate text-right pr-2">
          {city}
        </span>
        <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-600 text-right">
          {prvCode}
        </span>
      </div>

      {/* Line 2: type badge, category, heads, status, links */}
      <div className="flex items-center gap-0 px-cell pb-[3px]">
        <span className={`terminal-tag ${TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} mr-1.5 text-[9px]`}>
          {TYPE_LABELS[auction.type] || auction.type.toUpperCase()}
        </span>
        <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-zinc-500">
          {CAT_CODES[auction.mainCategory]}
        </span>
        <span className="w-[50px] flex-shrink-0 text-data font-terminal tabular-nums text-zinc-400 text-right">
          {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '\u2014'}
        </span>
        <span className="w-[56px] flex-shrink-0 ml-2">
          <StatusBadge status={auction.status} date={auction.date} today={today} />
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {auction.catalogUrl && (
            <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" title="Descargar catálogo">CAT</a>
          )}
          {auction.youtubeUrl && (
            <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" title="Ver transmisión">YT</a>
          )}
          {auction.sourceUrl && (
            <a href={normalizeUrl(auction.sourceUrl) || '#'} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-zinc-600 hover:text-zinc-400 transition-colors hidden md:inline" title="Fuente">SRC</a>
          )}
        </span>
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
    <div className="flex items-end gap-1 h-16">
      {monthCounts.map((count, i) => {
        const pct = (count / max) * 100
        const currentMonth = new Date().getMonth()
        const isCurrent = i === currentMonth
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            {count > 0 && (
              <span className="text-[9px] font-terminal tabular-nums text-zinc-400">{count}</span>
            )}
            <div className="w-full relative" style={{ height: '40px' }}>
              <div
                className={`absolute bottom-0 w-full transition-all ${
                  isCurrent ? 'bg-accent' : count > 0 ? 'bg-positive/70' : 'bg-zinc-800'
                }`}
                style={{ height: count > 0 ? `${Math.max(pct, 8)}%` : '2px' }}
              />
            </div>
            <span className={`text-[9px] font-terminal ${isCurrent ? 'text-accent font-medium' : 'text-zinc-600'}`}>
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
    const counts: Partial<Record<Auction['type'], number>> = {}
    auctions.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1 })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a) as [Auction['type'], number][]
  }, [auctions])

  const max = typeCounts.length > 0 ? typeCounts[0][1] : 1

  return (
    <div className="space-y-1.5">
      {typeCounts.map(([type, count]) => {
        const pct = (count / auctions.length) * 100
        const barWidth = (count / max) * 100
        return (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-[72px] flex-shrink-0 text-xxs font-terminal ${(TYPE_COLORS[type] || 'border-zinc-500 text-zinc-400').split(' ')[1]}`}>
              {TYPE_LABELS[type] || type.toUpperCase()}
            </span>
            <div className="flex-1 h-2 bg-zinc-900 relative">
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
        <div className="border-b border-terminal-border px-panel py-[5px] flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Cab.Est:</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Provincias:</span>
            <span className="text-data text-zinc-400 font-terminal text-xxs">
              {provinces.map(p => getProvinceCode(p)).join(', ')}
            </span>
          </div>
          {cities.length > 0 && (
            <>
              <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
              <div className="flex items-center gap-1.5">
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
          <span className="text-xxs text-zinc-600 font-terminal">
            {auctions.length} remates &middot; orden cronológico
          </span>
        </div>

        {/* Column headers */}
        <div className="border-b border-terminal-border px-cell py-px2 flex items-center gap-0 bg-terminal-panel">
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Fecha</span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Hora</span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">Remate</span>
          <span className="hidden sm:block w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right pr-2">Plaza</span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right">Prv</span>
        </div>

        {byMonth.map(group => (
          <div key={group.key}>
            {/* Month section header */}
            <div className="border-b border-terminal-border bg-zinc-900/50 px-cell py-[4px] flex items-center justify-between">
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
            <p className="text-data text-zinc-600 font-terminal">&mdash; No hay remates registrados &mdash;</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-terminal-border px-panel py-[5px] flex items-center justify-between">
          <span className="text-xxs text-zinc-600 font-terminal">
            {auctions.length} resultado{auctions.length !== 1 ? 's' : ''}
          </span>
          <Link href="/remates" className="text-xxs text-accent hover:text-accent-bright font-terminal transition-colors">
            [ VER TODOS LOS REMATES ]
          </Link>
        </div>
      </div>
    </div>
  )
}
