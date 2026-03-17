'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
  formatDateShort,
  getCity,
  getProvinceCode,
  getEffectiveToday,
  getEffectiveStatus,
} from '@/lib/ui/tokens'
import CountdownBadge from '@/components/CountdownBadge'
import ProBadge from '@/components/badges/ProBadge'
import { trackAuctionClick, trackFilterApply, trackOutboundClick, trackEvent } from '@/lib/analytics'
import { downloadBulkICSFile } from '@/lib/utils/ics'

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

/** Generate WhatsApp share URL for an auction */
function getWhatsAppShareUrl(auction: Auction): string {
  const formatDate = (dateStr: string) => {
    const [_year, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }
  const parts = [
    `🐄 *${auction.title}*`,
    '',
    `📅 ${formatDate(auction.date)}${auction.time ? ` a las ${auction.time}` : ''}`,
    auction.location ? `📍 ${auction.location}` : null,
    auction.estimatedHeads ? `🔢 ${auction.estimatedHeads.toLocaleString('es-AR')} cabezas` : null,
    `🏢 ${auction.consignatariaName}`,
    '',
    `👉 Ver más: https://consignatarias.com.ar/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`,
  ].filter(Boolean)
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`
}

const rawAuctions = rematesData as Auction[]

type Period = 'hoy' | 'proximos' | 'pasados'

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** Derive a short source badge label */
function getSourceBadge(auction: Auction): string {
  if (auction.sourceUrl?.includes('cacg.org.ar')) return 'CACG'
  const slug = auction.consignatariaSlug
  if (slug === 'colombo-y-colombo') return 'CYC'
  if (slug === 'ofarrell') return 'OFAR'
  if (slug === 'coop-lehmann') return 'LEHM'
  if (slug === 'madelan') return 'MADL'
  if (slug === 'umc-haciendas-villaguay') return 'UMCHV'
  if (auction.source === 'manual') return 'MAN'
  return 'WEB'
}

/** Freshness label for past auctions (relative to today) */
function getFreshnessLabel(auctionDate: string, today: string): { text: string; className: string } | null {
  const d = new Date(auctionDate + 'T12:00:00')
  const t = new Date(today + 'T12:00:00')
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return null // future or same-day handled separately
  if (diff === 1) return { text: 'AYER', className: 'text-zinc-400' }
  if (diff <= 7) return { text: `HACE ${diff} DÍAS`, className: 'text-zinc-500' }
  return null
}

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

function StatusBadge({ date, time, today }: { date: string; time: string | null; today: string }) {
  const effectiveStatus = getEffectiveStatus(date, time, today)
  const isToday = date === today

  if (effectiveStatus === 'live') {
    return (
      <span className="live-badge" role="img" aria-label="En vivo">
        <span className="live-indicator" style={{width:'6px',height:'6px'}} />
        <span>EN VIVO</span>
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

  // scheduled
  if (isToday) {
    const hoyBadge = (
      <span className="live-badge-amber" role="img" aria-label="Hoy">
        <span>HOY</span>
      </span>
    )
    if (time) {
      return <CountdownBadge auctionDate={date} auctionTime={time} fallback={hoyBadge} />
    }
    return hoyBadge
  }

  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label="Programado">
      <span className="status-dot bg-sky-400" />
      <span className="font-terminal text-xxs text-sky-400">PROGRAMADO</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  AUCTION ROW — responsive: card on mobile, dense on desktop         */
/* ------------------------------------------------------------------ */

function AuctionRow({ auction, today, index, period }: { auction: Auction; today: string; index: number; period: Period }) {
  const isToday = auction.date === today
  const isFeatured = !!(auction as Auction & { featured?: boolean }).featured
  const city = getCity(auction.location)
  const href = getAuctionHref(auction)
  const external = isExternalLink(href)
  const sourceBadge = getSourceBadge(auction)
  const freshness = period === 'pasados' ? getFreshnessLabel(auction.date, today) : null
  // "HOY" freshness for pasados tab (same-day completed)
  const isTodayPast = period === 'pasados' && auction.date === today

  function handleRowClick() {
    const dest = href.includes('/consignatarias/') ? 'profile' as const : 'source' as const
    trackAuctionClick(auction as Auction & { featured?: boolean }, dest)
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
        className={`group border-b-2 border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] transition-colors duration-75 cursor-pointer relative overflow-hidden shadow-amber-glow${index < 20 ? ' row-enter' : ''}`}
        style={index < 20 ? { animationDelay: `${index * 30}ms` } : undefined}
      >
        {/* Amber left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400" />

        {/* --- MOBILE CARD (shown below md) --- */}
        <div className="md:hidden p-3 pl-4 space-y-1.5 rounded-terminal shadow-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProBadge verified={true} size="sm" />
              <span className="text-data tabular-nums font-terminal text-amber-300 font-medium">
                {formatDateShort(auction.date)}
              </span>
              {auction.time && (
                <span className="text-data tabular-nums font-terminal text-amber-300/70">{auction.time}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge date={auction.date} time={auction.time} today={today} />
              {auction.youtubeUrl && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-600/20 border border-red-500/30 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-terminal text-[9px] font-bold">LIVE</span>
                </span>
              )}
            </div>
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
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-terminal text-amber-500/50 px-1 py-0.5 border border-amber-500/20 rounded-sm">{sourceBadge}</span>
            {isTodayPast && <span className="text-[9px] font-terminal text-positive">HOY</span>}
            {freshness && <span className={`text-[9px] font-terminal ${freshness.className}`}>{freshness.text}</span>}
          </div>
          {/* Links */}
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {auction.catalogUrl && (
              <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.catalogUrl) || '', 'catalog')}
                className="text-xxs font-terminal text-amber-400 hover:text-amber-200 transition-colors" aria-label="Descargar catálogo">Catálogo</a>
            )}
            {auction.youtubeUrl && (
              <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
                className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión">YouTube</a>
            )}
            <a href={getWhatsAppShareUrl(auction)} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-emerald-500 hover:text-emerald-400 transition-colors" aria-label="Compartir en WhatsApp">WhatsApp</a>
          </div>
        </div>

        {/* --- DESKTOP ROW (hidden below md) --- */}
        <div className="hidden md:block">
          {/* Line 1 */}
          <div className="flex items-center gap-0 px-cell py-px2 pl-4">
            <span className="mr-2 flex-shrink-0">
              <ProBadge verified={true} size="sm" />
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
            <span className="text-[9px] font-terminal text-amber-500/50 px-1 py-0.5 border border-amber-500/20 rounded-sm mr-1.5">{sourceBadge}</span>
            {isTodayPast && <span className="text-[9px] font-terminal text-positive mr-1.5">HOY</span>}
            {freshness && <span className={`text-[9px] font-terminal ${freshness.className} mr-1.5`}>{freshness.text}</span>}
            <span className="w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-amber-300 text-right font-medium">
              {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
            </span>
            <span className="w-[80px] flex-shrink-0 ml-2">
              <StatusBadge date={auction.date} time={auction.time} today={today} />
            </span>
            <span className="flex-1 min-w-0 ml-2 text-xxs font-terminal text-amber-400/40 truncate">
              {auction.description}
            </span>
            <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {auction.catalogUrl && (
                <a href={normalizeUrl(auction.catalogUrl) || '#'} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackOutboundClick(normalizeUrl(auction.catalogUrl) || '', 'catalog')}
                  className="text-xxs font-terminal text-amber-400 hover:text-amber-200 transition-colors" aria-label="Descargar catálogo" title="Catálogo">CAT</a>
              )}
              {auction.youtubeUrl && (
                <a href={normalizeUrl(auction.youtubeUrl) || '#'} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackOutboundClick(normalizeUrl(auction.youtubeUrl) || '', 'youtube')}
                  className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors" aria-label="Ver transmisión en YouTube" title="YouTube">YT</a>
              )}
              <a href={getWhatsAppShareUrl(auction)} target="_blank" rel="noopener noreferrer"
                className="text-xxs font-terminal text-emerald-500 hover:text-emerald-400 transition-colors" aria-label="Compartir en WhatsApp" title="Compartir">WA</a>
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
        isToday ? 'bg-amber-500/[0.03]' : ''
      }${index < 20 ? ' row-enter' : ''}`}
      style={index < 20 ? { animationDelay: `${index * 30}ms` } : undefined}
    >
      {/* --- MOBILE CARD (shown below md) --- */}
      <div className="md:hidden p-3 space-y-1.5 rounded-terminal shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-data tabular-nums font-terminal ${isToday ? 'text-positive font-medium' : 'text-zinc-300'}`}>
              {formatDateShort(auction.date)}
            </span>
            {auction.time && (
              <span className="text-data tabular-nums font-terminal text-zinc-400">{auction.time}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge date={auction.date} time={auction.time} today={today} />
            {auction.youtubeUrl && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-600/20 border border-red-500/30 rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-terminal text-[9px] font-bold">LIVE</span>
              </span>
            )}
          </div>
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
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-terminal text-zinc-500 px-1 py-0.5 border border-zinc-800 rounded-sm">{sourceBadge}</span>
          {isTodayPast && <span className="text-[9px] font-terminal text-positive">HOY</span>}
          {freshness && <span className={`text-[9px] font-terminal ${freshness.className}`}>{freshness.text}</span>}
        </div>
        {/* Links */}
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
          <a href={getWhatsAppShareUrl(auction)} target="_blank" rel="noopener noreferrer"
            className="text-xxs font-terminal text-emerald-500 hover:text-emerald-400 transition-colors" aria-label="Compartir en WhatsApp">WhatsApp</a>
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
              <span className="text-zinc-500">&mdash;</span>
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
          <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-500 text-right">
            {getProvinceCode(auction.province)}
          </span>
        </div>

        {/* Line 2: type badge, category, source, freshness, heads, status, links */}
        <div className="flex items-center gap-0 px-cell pb-1">
          <span className={`terminal-tag ${TYPE_COLORS[auction.type] || 'border-zinc-500 text-zinc-400'} mr-1.5 text-[10px]`}>
            {TYPE_LABELS_SHORT[auction.type] || auction.type.toUpperCase()}
          </span>
          <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-zinc-500">
            {CAT_CODES[auction.mainCategory]}
          </span>
          <span className="text-[9px] font-terminal text-zinc-500 px-1 py-0.5 border border-zinc-800 rounded-sm mr-1.5">{sourceBadge}</span>
          {isTodayPast && <span className="text-[9px] font-terminal text-positive mr-1.5">HOY</span>}
          {freshness && <span className={`text-[9px] font-terminal ${freshness.className} mr-1.5`}>{freshness.text}</span>}
          <span className="w-[60px] flex-shrink-0 text-data font-terminal tabular-nums text-zinc-400 text-right">
            {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
          </span>
          <span className="w-[80px] flex-shrink-0 ml-2">
            <StatusBadge date={auction.date} time={auction.time} today={today} />
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
                className="text-xxs font-terminal text-zinc-500 hover:text-zinc-400 transition-colors" aria-label="Ver fuente" title="Fuente">SRC</a>
            )}
            <a href={getWhatsAppShareUrl(auction)} target="_blank" rel="noopener noreferrer"
              className="text-xxs font-terminal text-emerald-500 hover:text-emerald-400 transition-colors" aria-label="Compartir en WhatsApp" title="Compartir">WA</a>
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
  const searchParams = useSearchParams()
  const [period, setPeriod] = useState<Period>('proximos')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [featuredSlugs, setFeaturedSlugs] = useState<Set<string>>(new Set())

  // Initialize search from URL `q` param (for Google Sitelinks Searchbox)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
  }, [searchParams])

  // Fetch featured consignataria slugs from Supabase
  useEffect(() => {
    fetch('/api/featured-slugs')
      .then(r => r.json())
      .then(d => setFeaturedSlugs(new Set(d.slugs || [])))
      .catch(() => {})
  }, [])

  // Merge featured flag from DB into auctions
  const auctions = useMemo(() =>
    rawAuctions.map(a => {
      const canonical = getCanonicalSlug(a.consignatariaSlug) || a.consignatariaSlug
      const dbFeatured = featuredSlugs.has(canonical)
      return dbFeatured ? { ...a, featured: true } : a
    }),
    [featuredSlugs]
  )

  // Dynamic "today" — after 20:00 ART, shifts to tomorrow
  const [today, setToday] = useState(() => getEffectiveToday())

  useEffect(() => {
    const id = setInterval(() => setToday(getEffectiveToday()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ---- Classify auctions ---- */
  const todayAuctions = useMemo(
    () => auctions.filter((a) => a.date === today),
    [today, auctions]
  )
  const upcomingAuctions = useMemo(
    () => auctions.filter((a) => a.date >= today).sort((a, b) => {
      return a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')
    }),
    [today, auctions]
  )
  const pastAuctions = useMemo(
    () => auctions.filter((a) => a.date < today).sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')),
    [today, auctions]
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
    // Text search: matches consignataria name, location, or type
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((a) =>
        a.consignatariaName.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        a.type.toLowerCase().includes(q) ||
        a.province.toLowerCase().includes(q)
      )
    }
    return result
  }, [baseAuctions, filterProvince, filterType, searchQuery])

  /* ---- Dropdown options ---- */
  const provinces = useMemo(() => [...new Set(auctions.map((a) => a.province))].sort(), [auctions])
  const types = useMemo(() => [...new Set(auctions.map((a) => a.type))].sort(), [auctions])

  /* ---- Summary stats ---- */
  const totalHeads = auctions.reduce((s, a) => s + (a.estimatedHeads ?? 0), 0)
  const uniqueProvinces = new Set(auctions.map((a) => a.province)).size

  /* ---- Bulk ICS Export handler ---- */
  const handleBulkExport = () => {
    if (filteredAuctions.length === 0) return
    
    const events = filteredAuctions.map(auction => ({
      title: `🐄 ${auction.title} — ${auction.consignatariaName}`,
      description: [
        auction.description,
        auction.estimatedHeads ? `Cabezas estimadas: ~${auction.estimatedHeads.toLocaleString('es-AR')}` : null,
        `Tipo: ${TYPE_LABELS[auction.type] || auction.type}`,
        `Categoría: ${CAT_LABELS[auction.mainCategory]}`,
      ].filter(Boolean).join('\n'),
      location: auction.location || auction.province,
      startDate: auction.date,
      startTime: auction.time || undefined,
      durationHours: 4,
      url: `https://consignatarias.com.ar/remates/${auction.id}`,
      organizer: auction.consignatariaName,
    }))
    
    // Generate filename with filters
    const filterParts = [
      'remates',
      filterProvince ? filterProvince.toLowerCase().replace(/\s+/g, '-') : null,
      filterType || null,
      period,
    ].filter(Boolean)
    const filename = `${filterParts.join('-')}.ics`
    
    downloadBulkICSFile(events, filename)
    trackEvent('bulk_ics_export', { 
      count: events.length, 
      period, 
      hasFilters: !!(filterProvince || filterType || searchQuery) 
    })
  }

  /* ---- Render ---- */
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-0">
      <div className="terminal-panel">
        {/* -- Panel header ----------------------------------------- */}
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="section-heading text-zinc-200 text-sm tracking-widest">REMATES</span>
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
            <span className="text-xxs text-zinc-500 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
            <span className="text-xxs text-zinc-500">remates</span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Cabezas est.:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">
              ~{totalHeads.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Provincias:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{uniqueProvinces}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-500 uppercase">Hoy:</span>
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
                onClick={() => { setPeriod(tab.key); trackFilterApply('period', tab.key) }}
                className={`terminal-btn text-xxs px-3 py-1 ${
                  period === tab.key
                    ? 'border-accent text-accent bg-accent/5'
                    : ''
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 tabular-nums ${
                  period === tab.key ? 'text-accent' : 'text-zinc-500'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="terminal-input text-xxs w-24 sm:w-32 pl-2 pr-6 py-1 bg-zinc-900 border border-terminal-border rounded-terminal focus:border-accent focus:outline-none placeholder:text-zinc-600"
                aria-label="Buscar remates"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-negative text-xs"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
            <TerminalSelect
              value={filterProvince}
              onChange={(v: string) => { setFilterProvince(v); if (v) trackFilterApply('province', v) }}
              options={provinces}
              placeholder="Provincia"
            />
            <TerminalSelect
              value={filterType}
              onChange={(v: string) => { setFilterType(v); if (v) trackFilterApply('type', v) }}
              options={types}
              placeholder="Tipo"
            />
            {(filterProvince || filterType || searchQuery) && (
              <button
                onClick={() => {
                  setFilterProvince('')
                  setFilterType('')
                  setSearchQuery('')
                }}
                className="text-xxs text-zinc-500 hover:text-negative font-terminal transition-colors px-2 py-1"
                title="Limpiar filtros"
              >
                LIMPIAR
              </button>
            )}
            {/* Bulk ICS Export */}
            {filteredAuctions.length > 0 && period === 'proximos' && (
              <button
                onClick={handleBulkExport}
                className="terminal-btn text-xxs px-2 py-1 flex items-center gap-1.5 hover:border-accent hover:text-accent"
                title={`Exportar ${filteredAuctions.length} remates al calendario`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">EXPORTAR</span>
                <span className="tabular-nums text-zinc-500">{filteredAuctions.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* -- Active filter pills ------------------------------------ */}
        {(filterProvince || filterType || searchQuery) && (
          <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xxs text-zinc-500 font-terminal">Filtros:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xxs bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-terminal">
                <span>&quot;{searchQuery}&quot;</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-sky-300 transition-colors" aria-label="Quitar búsqueda">&times;</button>
              </span>
            )}
            {filterProvince && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xxs bg-accent/10 text-accent border border-accent/20 rounded-terminal">
                <span>{filterProvince}</span>
                <button onClick={() => setFilterProvince('')} className="hover:text-accent-bright transition-colors" aria-label="Quitar filtro provincia">&times;</button>
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xxs bg-accent/10 text-accent border border-accent/20 rounded-terminal">
                <span>{TYPE_LABELS[filterType] || filterType.toUpperCase()}</span>
                <button onClick={() => setFilterType('')} className="hover:text-accent-bright transition-colors" aria-label="Quitar filtro tipo">&times;</button>
              </span>
            )}
          </div>
        )}

        {/* -- Column headers (desktop only) ----------------------- */}
        <div className="border-b border-terminal-border px-cell py-px2 hidden md:flex items-center gap-0 bg-terminal-panel">
          <span className="w-[56px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">
            Fecha
          </span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">
            Hora
          </span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">
            Consignataria
          </span>
          <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right pr-2">
            Plaza
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">
            Prv
          </span>
        </div>

        {/* -- Auction rows ----------------------------------------- */}
        <div className="divide-y-0">
          {filteredAuctions.length === 0 ? (
            <div className="px-panel py-8 text-center">
              <p className="text-data text-zinc-500 font-terminal">
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
            filteredAuctions.map((auction, index) => (
              <AuctionRow key={auction.id} auction={auction} today={today} index={index} period={period} />
            ))
          )}
        </div>

        {/* -- Panel footer ----------------------------------------- */}
        <div className="border-t border-terminal-border px-panel py-1.5 flex items-center justify-between">
          <span className="text-xxs text-zinc-500 font-terminal">
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
          <span className="text-xxs text-zinc-500 font-terminal mr-1">TIPOS:</span>
          {(Object.entries(TYPE_COLORS)).map(([type, cls]) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`terminal-tag ${cls} text-[10px]`}>{TYPE_LABELS_SHORT[type] || type}</span>
            </span>
          ))}

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-zinc-500 font-terminal mr-1 hidden sm:inline">STATUS:</span>
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
