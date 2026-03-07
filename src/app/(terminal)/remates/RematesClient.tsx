'use client'

import { useState, useMemo, useEffect } from 'react'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { normalizeUrl } from '@/lib/utils/url'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import {
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_LABELS_SHORT,
  CAT_LABELS,
  CAT_CODES,
  PROVINCE_CODES,
  formatDateShort,
  getCity,
  getProvinceCode,
  getEffectiveToday,
} from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const auctions = rematesData as Auction[]

type Period = 'hoy' | 'proximos' | 'pasados'

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** Get the best link for an auction row click */
function getAuctionHref(auction: Auction): string {
  const sourceUrl = normalizeUrl(auction.sourceUrl)
  const catalogUrl = normalizeUrl(auction.catalogUrl)
  return sourceUrl || catalogUrl || `/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`
}

function isExternalLink(href: string): boolean {
  return href.startsWith('http')
}

/* ------------------------------------------------------------------ */
/*  STATUS INDICATOR                                                   */
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

  // scheduled
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
/*  AUCTION ROW — responsive: card on mobile, dense on desktop         */
/* ------------------------------------------------------------------ */

function AuctionRow({ auction, today }: { auction: Auction; today: string }) {
  const isToday = auction.date === today
  const isFeatured = !!(auction as Auction & { featured?: boolean }).featured
  const city = getCity(auction.location)
  const href = getAuctionHref(auction)
  const external = isExternalLink(href)

  function handleRowClick() {
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = href
    }
  }

  /* ---- FEATURED / PRO ROW ---- */
  if (isFeatured) {
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick() }}
        className="group border-b-2 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] transition-colors duration-75 cursor-pointer relative overflow-hidden"
      >
        {/* Amber left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400" />

        {/* --- MOBILE CARD (shown below md) --- */}
        <div className="md:hidden p-3 pl-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-amber-500/50 bg-amber-500/10">
                <span className="text-amber-400 text-[10px]">★</span>
                <span className="text-amber-400 font-terminal text-[10px] font-bold tracking-wider">PRO</span>
              </span>
              <span className="text-data tabular-nums font-terminal text-amber-300 font-medium">
                {formatDateShort(auction.date)}
              </span>
              {auction.time && (
                <span className="text-data tabular-nums font-terminal text-amber-300/70">{auction.time}</span>
              )}
            </div>
            <StatusBadge status={auction.status} date={auction.date} today={today} />
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <a
              href={`/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`}
              className="text-amber-200 font-terminal font-medium text-data hover:underline"
            >
              {auction.consignatariaName}
            </a>
          </div>
          <div className="text-xxs font-terminal text-amber-300/60 truncate">{auction.title}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xxs text-amber-400/50">{city}</span>
            <span className="text-xxs text-amber-500/40">{auction.province}</span>
            <span className={`terminal-tag border-amber-500 text-amber-400 text-[10px]`}>
              {TYPE_LABELS[auction.type] || auction.type.toUpperCase()}
            </span>
            <span className="text-xxs text-amber-400/60">{CAT_LABELS[auction.mainCategory]}</span>
            {auction.estimatedHeads != null && (
              <span className="text-data font-terminal tabular-nums text-amber-300 font-medium">
                ~{auction.estimatedHeads.toLocaleString('es-AR')} cab
              </span>
            )}
          </div>
        </div>

        {/* --- DESKTOP ROW (hidden below md) --- */}
        <div className="hidden md:block">
          {/* Line 1 */}
          <div className="flex items-center gap-0 px-cell py-px2 pl-4">
            <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 border border-amber-500/50 bg-amber-500/10 flex-shrink-0">
              <span className="text-amber-400 text-[10px]">★</span>
              <span className="text-amber-400 font-terminal text-[10px] font-bold tracking-wider">PRO</span>
            </span>
            <span className="w-[56px] flex-shrink-0 text-data tabular-nums font-terminal text-amber-300 font-medium">
              {formatDateShort(auction.date)}
            </span>
            <span className="w-[52px] flex-shrink-0 text-data tabular-nums font-terminal">
              {auction.time ? (
                <span className="text-amber-300/70">{auction.time}</span>
              ) : (
                <span className="text-amber-500/30">&mdash;</span>
              )}
            </span>
            <span className="flex-1 min-w-0 text-data font-terminal truncate" onClick={(e) => e.stopPropagation()}>
              <a
                href={`/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`}
                className="text-amber-200 font-medium hover:text-amber-100 hover:underline transition-colors"
                title={auction.consignatariaName}
              >
                {auction.consignatariaName}
              </a>
            </span>
            <span className="w-[140px] flex-shrink-0 text-data font-terminal text-amber-400/50 truncate text-right pr-2">
              {city}
            </span>
            <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-amber-500/50 text-right">
              {getProvinceCode(auction.province)}
            </span>
          </div>
          {/* Line 2 */}
          <div className="flex items-center gap-0 px-cell pl-4 pb-px">
            <span className="text-xxs font-terminal text-amber-300/60 truncate">{auction.title}</span>
          </div>
          {/* Line 3 */}
          <div className="flex items-center gap-0 px-cell pl-4 pb-1.5">
            <span className="terminal-tag border-amber-500 text-amber-400 mr-1.5 text-[10px]">
              {TYPE_LABELS_SHORT[auction.type] || auction.type.toUpperCase()}
            </span>
            <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-amber-400/60">
              {CAT_CODES[auction.mainCategory]}
            </span>
            <span className="w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-amber-300 text-right font-medium">
              {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
            </span>
            <span className="w-[80px] flex-shrink-0 ml-2">
              <StatusBadge status={auction.status} date={auction.date} today={today} />
            </span>
            <span className="flex-1 min-w-0 ml-2 text-xxs font-terminal text-amber-400/40 truncate">
              {auction.description}
            </span>
            <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {auction.catalogUrl && (
                <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                  className="text-xxs font-terminal text-amber-400 hover:text-amber-200 transition-colors" aria-label="Descargar catálogo" title="Catálogo">CAT</a>
              )}
              {auction.youtubeUrl && (
                <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                  className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión en YouTube" title="YouTube">YT</a>
              )}
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ---- REGULAR ROW ---- */
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick() }}
      className={`group border-b border-terminal-border hover:bg-zinc-800/50 transition-colors duration-75 cursor-pointer ${
        isToday ? 'bg-positive/[0.02]' : ''
      }`}
    >
      {/* --- MOBILE CARD (shown below md) --- */}
      <div className="md:hidden p-3 space-y-1.5">
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
        <div onClick={(e) => e.stopPropagation()}>
          <a
            href={`/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`}
            className="text-zinc-200 font-terminal font-medium text-data hover:text-accent hover:underline transition-colors"
          >
            {auction.consignatariaName}
          </a>
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
        {/* Links */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {auction.catalogUrl && (
            <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catálogo">Catálogo</a>
          )}
          {auction.youtubeUrl && (
            <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión">YouTube</a>
          )}
        </div>
      </div>

      {/* --- DESKTOP ROW (hidden below md) --- */}
      <div className="hidden md:block">
        {/* Line 1: date time consignataria location province */}
        <div className="flex items-center gap-0 px-cell py-px2">
          <span
            className={`w-[56px] flex-shrink-0 text-data tabular-nums font-terminal ${
              isToday ? 'text-positive font-medium' : 'text-zinc-300'
            }`}
          >
            {formatDateShort(auction.date)}
          </span>
          <span className="w-[52px] flex-shrink-0 text-data tabular-nums font-terminal">
            {auction.time ? (
              <span className="text-zinc-300">{auction.time}</span>
            ) : auction.sourceUrl ? (
              <span className="text-accent text-xxs cursor-pointer" title="Ver horario en fuente">
                VER &rarr;
              </span>
            ) : (
              <span className="text-zinc-600">&mdash;</span>
            )}
          </span>
          <span className="flex-1 min-w-0 text-data font-terminal truncate" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`}
              className="text-zinc-200 hover:text-accent hover:underline transition-colors"
              title={auction.consignatariaName}
            >
              {auction.consignatariaName}
            </a>
          </span>
          <span className="w-[140px] flex-shrink-0 text-data font-terminal text-zinc-500 truncate text-right pr-2">
            {city}
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-600 text-right">
            {getProvinceCode(auction.province)}
          </span>
        </div>

        {/* Line 2: type badge, category, heads, status, links */}
        <div className="flex items-center gap-0 px-cell pb-1">
          <span className={`terminal-tag ${TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} mr-1.5 text-[10px]`}>
            {TYPE_LABELS_SHORT[auction.type] || auction.type.toUpperCase()}
          </span>
          <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-zinc-500">
            {CAT_CODES[auction.mainCategory]}
          </span>
          <span className="w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-zinc-400 text-right">
            {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
          </span>
          <span className="w-[80px] flex-shrink-0 ml-2">
            <StatusBadge status={auction.status} date={auction.date} today={today} />
          </span>
          <span className="flex-1" />
          <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {auction.catalogUrl && (
              <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors" aria-label="Descargar catálogo" title="Catálogo">CAT</a>
            )}
            {auction.youtubeUrl && (
              <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión" title="YouTube">YT</a>
            )}
            {auction.sourceUrl && (
              <a href={normalizeUrl(auction.sourceUrl) || '#'} target="_blank" rel="noopener noreferrer"
                className="text-xxs font-terminal text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="Ver fuente" title="Fuente">SRC</a>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FILTER DROPDOWN                                                    */
/* ------------------------------------------------------------------ */

function TerminalSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="terminal-input text-xxs py-1.5 px-3 pr-6 appearance-none cursor-pointer bg-terminal-panel"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%2371717a' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '8px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

/* ------------------------------------------------------------------ */
/*  ADD REMATE MODAL                                                   */
/* ------------------------------------------------------------------ */

function AddRemateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="terminal-panel w-full max-w-lg mx-4 border border-terminal-border-light"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200">AGREGAR REMATE</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm p-1" aria-label="Cerrar">
            &times;
          </button>
        </div>
        <div className="p-panel space-y-3">
          <div>
            <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Consignataria</label>
            <input type="text" className="terminal-input" placeholder="Nombre de la consignataria" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Fecha</label>
              <input type="date" className="terminal-input" />
            </div>
            <div>
              <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Hora</label>
              <input type="time" className="terminal-input" />
            </div>
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Ubicacion</label>
            <input type="text" className="terminal-input" placeholder="Ciudad, Provincia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Tipo</label>
              <select className="terminal-input">
                <option value="invernada">Invernada</option>
                <option value="cria">Cria</option>
                <option value="reproductores">Reproductores</option>
                <option value="general">General</option>
                <option value="especial">Especial</option>
              </select>
            </div>
            <div>
              <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Cabezas est.</label>
              <input type="number" className="terminal-input" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Link fuente</label>
            <input type="url" className="terminal-input" placeholder="https://..." />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-terminal-border">
            <button onClick={onClose} className="terminal-btn text-xxs">CANCELAR</button>
            <button className="terminal-btn-primary text-xxs">AGREGAR</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function RematesPage() {
  const [period, setPeriod] = useState<Period>('proximos')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Dynamic "today" — after 20:00 ART, shifts to tomorrow
  const [today, setToday] = useState(() => getEffectiveToday())

  useEffect(() => {
    const id = setInterval(() => setToday(getEffectiveToday()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ---- Classify auctions ---- */
  const todayAuctions = useMemo(
    () => auctions.filter((a) => a.date === today),
    [today]
  )
  const upcomingAuctions = useMemo(
    () => auctions.filter((a) => a.date >= today).sort((a, b) => {
      const aFeat = (a as Auction & { featured?: boolean }).featured ? 1 : 0
      const bFeat = (b as Auction & { featured?: boolean }).featured ? 1 : 0
      if (aFeat !== bFeat) return bFeat - aFeat
      return a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')
    }),
    [today]
  )
  const pastAuctions = useMemo(
    () => auctions.filter((a) => a.date < today).sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')),
    [today]
  )

  const counts: Record<Period, number> = {
    hoy: todayAuctions.length,
    proximos: upcomingAuctions.length,
    pasados: pastAuctions.length,
  }

  /* ---- Base set for current tab ---- */
  const baseAuctions = useMemo(() => {
    switch (period) {
      case 'hoy': return todayAuctions
      case 'proximos': return upcomingAuctions
      case 'pasados': return pastAuctions
    }
  }, [period, todayAuctions, upcomingAuctions, pastAuctions])

  /* ---- Apply filters ---- */
  const filteredAuctions = useMemo(() => {
    let result = baseAuctions
    if (filterProvince) result = result.filter((a) => a.province === filterProvince)
    if (filterType) result = result.filter((a) => a.type === filterType)
    return result
  }, [baseAuctions, filterProvince, filterType])

  /* ---- Dropdown options ---- */
  const provinces = useMemo(() => [...new Set(auctions.map((a) => a.province))].sort(), [])
  const types = useMemo(() => [...new Set(auctions.map((a) => a.type))].sort(), [])

  /* ---- Summary stats ---- */
  const totalHeads = auctions.reduce((s, a) => s + (a.estimatedHeads ?? 0), 0)
  const uniqueProvinces = new Set(auctions.map((a) => a.province)).size

  /* ---- Render ---- */
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-0">
      <div className="terminal-panel">
        {/* -- Panel header ----------------------------------------- */}
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 text-label tracking-widest">REMATES</span>
            <span className="text-terminal-border hidden sm:inline">&mdash;</span>
            <span className="text-xxs text-zinc-500 uppercase tracking-wider hidden sm:inline">
              Cronograma de Remates Ganaderos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="terminal-btn-primary text-xxs px-3 py-1"
            >
              + AGREGAR
            </button>
            <span className="text-xxs tabular-nums text-zinc-500 font-terminal hidden sm:inline">
              {auctions.length} registros
            </span>
          </div>
        </div>

        {/* -- Summary stats strip (hidden on mobile) --------------- */}
        <div className="border-b border-terminal-border px-panel py-1.5 hidden md:flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
            <span className="text-xxs text-zinc-600">remates</span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Cabezas est.:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">
              ~{totalHeads.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Provincias:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{uniqueProvinces}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Hoy:</span>
            <span className={`text-data tabular-nums font-terminal ${todayAuctions.length > 0 ? 'text-positive' : 'text-zinc-500'}`}>
              {todayAuctions.length}
            </span>
          </div>
        </div>

        {/* -- Tabs + Filters bar ----------------------------------- */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center justify-between flex-wrap gap-2">
          {/* Period tabs */}
          <div className="flex items-center gap-1">
            {([
              { key: 'hoy' as Period, label: 'HOY' },
              { key: 'proximos' as Period, label: 'PROXIMOS' },
              { key: 'pasados' as Period, label: 'PASADOS' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`terminal-btn text-xxs px-3 py-1 ${
                  period === tab.key
                    ? 'border-accent text-accent bg-accent/5'
                    : ''
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 tabular-nums ${
                  period === tab.key ? 'text-accent' : 'text-zinc-600'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <TerminalSelect
              value={filterProvince}
              onChange={setFilterProvince}
              options={provinces}
              placeholder="Provincia"
            />
            <TerminalSelect
              value={filterType}
              onChange={setFilterType}
              options={types}
              placeholder="Tipo"
            />
            {(filterProvince || filterType) && (
              <button
                onClick={() => {
                  setFilterProvince('')
                  setFilterType('')
                }}
                className="text-xxs text-zinc-600 hover:text-negative font-terminal transition-colors px-2 py-1"
                title="Limpiar filtros"
              >
                LIMPIAR
              </button>
            )}
          </div>
        </div>

        {/* -- Column headers (desktop only) ----------------------- */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Fecha
          </span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Hora
          </span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Consignataria
          </span>
          <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right pr-2">
            Plaza
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right">
            Prv
          </span>
        </div>

        {/* -- Auction rows ----------------------------------------- */}
        <div className="divide-y-0">
          {filteredAuctions.length === 0 ? (
            <div className="px-panel py-8 text-center">
              <p className="text-data text-zinc-600 font-terminal">
                No hay remates para este periodo con los filtros seleccionados.
              </p>
              <button
                onClick={() => {
                  setFilterProvince('')
                  setFilterType('')
                }}
                className="mt-3 text-xxs text-accent hover:text-accent-bright font-terminal transition-colors"
              >
                LIMPIAR FILTROS
              </button>
            </div>
          ) : (
            filteredAuctions.map((auction) => (
              <AuctionRow key={auction.id} auction={auction} today={today} />
            ))
          )}
        </div>

        {/* -- Panel footer ----------------------------------------- */}
        <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
          <span className="text-xxs text-zinc-600 font-terminal">
            {filteredAuctions.length} resultado{filteredAuctions.length !== 1 ? 's' : ''}
            {(filterProvince || filterType) && (
              <span className="text-zinc-700"> (filtrado)</span>
            )}
          </span>
          <span className="text-xxs text-zinc-700 font-terminal hidden sm:inline">
            {period === 'pasados' ? 'Mas reciente primero' : 'Proxima fecha primero'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LEGEND / KEY (simplified)                                    */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="px-panel py-1.5 flex items-center flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1 mr-3 px-1.5 py-0.5 border border-amber-500/50 bg-amber-500/10">
            <span className="text-amber-400 text-[10px]">★</span>
            <span className="text-amber-400 font-terminal text-[10px] font-bold tracking-wider">PRO</span>
          </span>
          <span className="text-xxs text-zinc-600 font-terminal mr-1">TIPOS:</span>
          {(Object.entries(TYPE_COLORS)).map(([type, cls]) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`terminal-tag ${cls} text-[10px]`}>{TYPE_LABELS_SHORT[type] || type}</span>
            </span>
          ))}

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-zinc-600 font-terminal mr-1 hidden sm:inline">STATUS:</span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <span className="status-dot bg-sky-400" />
            <span className="text-xxs text-zinc-500 font-terminal">Programado</span>
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <span className="status-dot-live" />
            <span className="text-xxs text-zinc-500 font-terminal">En vivo</span>
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <span className="status-dot-offline" />
            <span className="text-xxs text-zinc-500 font-terminal">Finalizado</span>
          </span>
        </div>
      </div>

      {/* ADD REMATE MODAL */}
      {showAddModal && <AddRemateModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
