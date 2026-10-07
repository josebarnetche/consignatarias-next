'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Auction } from '@/lib/db/schema'
import { normalizeUrl } from '@/lib/utils/url'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { remateHref, remateAnchor, remateUrlAbsoluta, tieneFicha } from '@/lib/remates-enlaces'
import {
  TYPE_LABELS,
  CAT_LABELS,
  getCity,
  nombrePropio,
  provinciaNombre,
  getEffectiveToday,
  getEffectiveStatus,
} from '@/lib/ui/tokens'
import CountdownBadge from '@/components/CountdownBadge'
import ProBadge from '@/components/badges/ProBadge'
import RematesFilterBar, { typeLabel } from '@/components/remates/RematesFilterBar'
import RemateMarkButton from '@/components/RemateMarkButton'
import { RemateMarksProvider } from '@/components/RemateMarksContext'
import { EmptyState } from '@/components/ui'
import { trackAuctionClick, trackFilterApply, trackOutboundClick, trackBulkIcsExport } from '@/lib/analytics'
import { downloadBulkICSFile } from '@/lib/utils/ics'
import { useSessionTier } from '@/lib/use-session-tier'
import { useRouter } from 'next/navigation'

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
    `👉 Ver más: ${tieneFicha(auction) ? remateUrlAbsoluta(auction) : `https://www.consignatarias.com.ar/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`}`,
  ].filter(Boolean)
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`
}

/**
 * Los remates llegan por prop desde el server, ya recortados a los de hoy en
 * adelante. Antes este archivo importaba `remates.json` entero —1.173 remates,
 * 561 KB— y el 82 % eran pasados que nadie filtra desde acá: para eso está
 * /remates/anteriores, que ya existe y se indexa. El import metía esos 561 KB
 * en el bundle del navegador de la página más visitada del sitio.
 */
export interface RematesClientProps {
  remates: Auction[]
}

type Period = 'hoy' | 'proximos'

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** Ficha propia del remate; si no tiene, el perfil de la consignataria. Nunca
 *  una web externa: el click en la tarjeta se queda en el sitio. */
function getAuctionHref(auction: Auction): string {
  return remateHref(auction) ?? `/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`
}

/* ------------------------------------------------------------------ */
/*  ESTADO                                                             */
/* ------------------------------------------------------------------ */

/**
 * Solo se muestra lo que cambia la decisión: "en vivo ahora" o la cuenta
 * regresiva del día. "Programado" y "Finalizado" ya los dice el grupo del día
 * (próximos / anteriores), así que no ocupan lugar en cada tarjeta.
 */
function StatusBadge({ date, time, today }: { date: string; time: string | null; today: string }) {
  const effectiveStatus = getEffectiveStatus(date, time, today)
  if (effectiveStatus === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-2.5 py-1 text-sm font-medium text-positive" role="img" aria-label="En vivo ahora">
        <span className="status-dot-live" />
        En vivo ahora
      </span>
    )
  }
  if (effectiveStatus === 'completed' || date !== today) return null
  const hoy = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-2.5 py-1 text-sm font-medium text-positive">
      <span className="status-dot bg-positive animate-pulse-live" />
      Hoy
    </span>
  )
  return time ? <CountdownBadge auctionDate={date} auctionTime={time} fallback={hoy} /> : hoy
}

/* ------------------------------------------------------------------ */
/*  AGRUPADO POR DÍA                                                   */
/* ------------------------------------------------------------------ */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "Hoy · viernes 3 de octubre" — nombres armados a mano (no toLocaleDateString)
 *  para que el SSR y el navegador escriban exactamente lo mismo. */
function dayHeading(date: string, today: string): string {
  const d = new Date(date + 'T12:00:00')
  const t = new Date(today + 'T12:00:00')
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  const larga = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
  const rel = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer' : null
  if (rel) return `${rel} · ${larga}`
  const base = larga.charAt(0).toUpperCase() + larga.slice(1)
  return d.getFullYear() !== t.getFullYear() ? `${base} de ${d.getFullYear()}` : base
}

function groupByDay(list: Auction[]): { date: string; items: Auction[] }[] {
  const groups: { date: string; items: Auction[] }[] = []
  for (const a of list) {
    const last = groups[groups.length - 1]
    if (last && last.date === a.date) last.items.push(a)
    else groups.push({ date: a.date, items: [a] })
  }
  return groups
}

/* ------------------------------------------------------------------ */
/*  TARJETA DE REMATE — una sola forma en celular y escritorio          */
/* ------------------------------------------------------------------ */

const actionBtn =
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-terminal border border-terminal-border px-3 text-sm font-medium transition-colors motion-hover'

function AuctionRow({ auction, today, index }: { auction: Auction; today: string; index: number }) {
  const isFeatured = !!(auction as Auction & { featured?: boolean }).featured
  const city = nombrePropio(getCity(auction.location))
  const province = provinciaNombre(auction.province)
  const href = getAuctionHref(auction)
  const aFicha = href.startsWith('/remates/')
  const anchor = aFicha ? remateAnchor(auction) : `Consignataria ${nombrePropio(auction.consignatariaName)}`
  const profileHref = `/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`
  const catalog = normalizeUrl(auction.catalogUrl)
  const youtube = normalizeUrl(auction.youtubeUrl)
  const webFirma = normalizeUrl(auction.sourceUrl)
  const yaPaso = auction.date <= today

  const detalle = [
    typeLabel(auction.type),
    auction.mainCategory && auction.mainCategory !== 'mixto' ? CAT_LABELS[auction.mainCategory] : null,
    auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')} cabezas` : null,
  ].filter(Boolean)

  return (
    <article
      className={`group relative flex gap-4 border-b border-terminal-border px-panel py-4 transition-colors duration-75 focus-within:bg-zinc-900 hover:bg-zinc-900/60 ${
        isFeatured ? 'bg-accent/[0.04]' : ''
      }${index < 20 ? ' row-enter' : ''}`}
      style={index < 20 ? { animationDelay: `${index * 30}ms` } : undefined}
    >
      {isFeatured && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />}

      {/* Hora: lo primero que se busca */}
      <div className="w-14 flex-shrink-0 pt-0.5 text-center sm:w-16">
        {auction.time ? (
          <>
            <div className="text-lg font-semibold tabular-nums text-ink sm:text-xl">{auction.time}</div>
            <div className="text-xs text-zinc-500">hs</div>
          </>
        ) : (
          <div className="text-xs leading-tight text-zinc-500">Hora a confirmar</div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Enlace principal a la ficha. El ::after lo estira sobre toda la
                tarjeta, así el click en cualquier lado es un enlace real (lo
                sigue Google y funciona sin JavaScript). */}
            <Link
              href={href}
              aria-label={anchor}
              title={anchor}
              onClick={() => trackAuctionClick(auction as Auction & { featured?: boolean }, aFicha ? 'detail' : 'profile')}
              className="text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent hover:underline focus-visible:outline-none sm:text-lg"
            >
              {nombrePropio(auction.consignatariaName)}
            </Link>
            {isFeatured && <ProBadge verified={true} size="sm" className="relative flex-shrink-0" />}
          </div>
          <StatusBadge date={auction.date} time={auction.time} today={today} />
        </div>

        <p className="text-sm text-zinc-400 sm:text-base">
          {[city, province].filter(Boolean).join(', ')}
        </p>
        <p className="text-sm text-zinc-300 sm:text-base">{detalle.join(' · ')}</p>

        {/* Acciones secundarias: por encima del enlace estirado (relative z-[1]) */}
        <div className="relative z-[1] flex flex-wrap items-center gap-2 pt-1.5">
          {youtube && (
            <a href={youtube} target="_blank" rel="noopener noreferrer"
              onClick={() => trackOutboundClick(youtube, 'youtube')}
              className={`${actionBtn} border-negative/40 text-negative hover:bg-negative/10`}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              Ver transmisión
            </a>
          )}
          {catalog && (
            <a href={catalog} target="_blank" rel="noopener noreferrer"
              onClick={() => trackOutboundClick(catalog, 'catalog')}
              className={`${actionBtn} text-accent hover:bg-accent/10`}>
              Ver catálogo
            </a>
          )}
          {webFirma && webFirma !== catalog && (
            <a href={webFirma} target="_blank" rel="noopener noreferrer"
              onClick={() => trackAuctionClick(auction as Auction & { featured?: boolean }, 'source')}
              className={`${actionBtn} text-zinc-300 hover:text-accent`}>
              Web de la firma
            </a>
          )}
          {aFicha && (
            <Link href={profileHref} className={`${actionBtn} text-zinc-300 hover:text-accent`}>
              Ver la consignataria
            </Link>
          )}
          <a href={getWhatsAppShareUrl(auction)} target="_blank" rel="noopener noreferrer"
            className={`${actionBtn} text-zinc-300 hover:text-live`} aria-label="Compartir por WhatsApp">
            Compartir por WhatsApp
          </a>
          {/* "Estuve" solo tiene sentido el día del remate o después */}
          {yaPaso && (
            <RemateMarkButton remateId={String(auction.id)} markType="attended" label="Estuve" labelMarked="Fui ✓" />
          )}
        </div>
      </div>
    </article>
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

export default function RematesPage({ remates }: RematesClientProps) {
  const router = useRouter()
  const session = useSessionTier()
  const [period, setPeriod] = useState<Period>('proximos')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterEnVivo, setFilterEnVivo] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [featuredSlugs, setFeaturedSlugs] = useState<Set<string>>(new Set())
  // Filtros avanzados (PRO-only)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinHeads, setFilterMinHeads] = useState('')

  // Initialize search from URL `q` param (for Google Sitelinks Searchbox).
  // Leído client-side desde window a propósito: usar useSearchParams() acá
  // fuerza un CSR bailout y deja el HTML servido en el fallback del Suspense
  // ("Cargando remates…"), invisible para crawlers/bots. Sin él, la lista
  // renderiza SSR y el pre-fill del buscador ocurre tras hidratar.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearchQuery(q)
  }, [])

  // Fetch featured consignataria slugs from Supabase (unifica featured=true
  // OR subscription activa vía /api/featured-slugs). Dispara el render dorado.
  useEffect(() => {
    fetch('/api/featured-slugs')
      .then(r => r.json())
      .then(d => setFeaturedSlugs(new Set(d.slugs || [])))
      .catch(() => {})
  }, [])

  // Merge featured flag from DB into auctions
  const auctions = useMemo(() =>
    remates.map(a => {
      const canonical = getCanonicalSlug(a.consignatariaSlug) || a.consignatariaSlug
      const dbFeatured = featuredSlugs.has(canonical)
      return dbFeatured ? { ...a, featured: true } : a
    }),
    [featuredSlugs, remates]
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
  const counts: Record<Period, number> = {
    hoy: todayAuctions.length,
    proximos: upcomingAuctions.length,
  }

  /* ---- Base set for current tab ---- */
  const baseAuctions = useMemo(() => {
    switch (period) {
      case 'hoy': return todayAuctions
      case 'proximos': return upcomingAuctions
    }
  }, [period, todayAuctions, upcomingAuctions])

  /* ---- Apply filters ---- */
  const advancedActive = session.tier === 'pro' && (filterDateFrom || filterDateTo || filterMinHeads)
  const filteredAuctions = useMemo(() => {
    let result = baseAuctions
    if (filterProvince) result = result.filter((a) => a.province === filterProvince)
    if (filterType) result = result.filter((a) => a.type === filterType)
    // En Vivo filter: only auctions with YouTube streaming
    if (filterEnVivo) result = result.filter((a) => a.youtubeUrl && a.youtubeUrl.length > 0)
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
    // Advanced filters (PRO-only)
    if (session.tier === 'pro') {
      if (filterDateFrom) result = result.filter((a) => a.date >= filterDateFrom)
      if (filterDateTo) result = result.filter((a) => a.date <= filterDateTo)
      const minHeads = parseInt(filterMinHeads, 10)
      if (!Number.isNaN(minHeads) && minHeads > 0) {
        result = result.filter((a) => (a.estimatedHeads ?? 0) >= minHeads)
      }
    }
    return result
  }, [baseAuctions, filterProvince, filterType, filterEnVivo, searchQuery, session.tier, filterDateFrom, filterDateTo, filterMinHeads])
  
  // Count of auctions with streaming in current base set
  const enVivoCount = useMemo(() => 
    baseAuctions.filter(a => a.youtubeUrl && a.youtubeUrl.length > 0).length, 
    [baseAuctions]
  )
  
  // Live streams happening TODAY - for prominent banner
  const todayLiveStreams = useMemo(() => 
    todayAuctions.filter(a => a.youtubeUrl && a.youtubeUrl.length > 0),
    [todayAuctions]
  )

  /* ---- Dropdown options ---- */
  const provinces = useMemo(() => [...new Set(auctions.map((a) => a.province))].filter(Boolean).sort(), [auctions])
  const types = useMemo(() => [...new Set(auctions.map((a) => a.type))].sort(), [auctions])


  /* ---- Bulk ICS Export handler ---- */
  const handleBulkExport = () => {
    if (filteredAuctions.length === 0) return
    if (session.tier !== 'pro') {
      const next = encodeURIComponent('/remates')
      router.push(session.loggedIn ? `/upgrade?next=${next}` : `/login?next=${next}`)
      return
    }
    
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
      url: tieneFicha(auction)
        ? remateUrlAbsoluta(auction)
        : `https://www.consignatarias.com.ar/consignatarias/${getCanonicalSlug(auction.consignatariaSlug) || auction.consignatariaSlug}`,
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
    trackBulkIcsExport(
      events.length,
      period,
      !!(filterProvince || filterType || searchQuery)
    )
  }

  /* ---- Filter handlers (all faceting tracked, none navigates) ---- */
  const hasActiveFilters = !!(
    filterProvince || filterType || filterEnVivo || searchQuery || advancedActive
  )

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    trackFilterApply('period', p)
  }
  const handleToggleEnVivo = () => {
    trackFilterApply('en_vivo', filterEnVivo ? 'off' : 'on')
    setFilterEnVivo((v) => !v)
  }
  const handleProvinceChange = (v: string) => {
    setFilterProvince(v)
    if (v) trackFilterApply('province', v)
  }
  const handleTypeChange = (v: string) => {
    setFilterType(v)
    if (v) trackFilterApply('type', v)
  }
  const handleClearAll = () => {
    setFilterProvince('')
    setFilterType('')
    setFilterEnVivo(false)
    setSearchQuery('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterMinHeads('')
  }
  const handleToggleAdvanced = () => {
    if (session.tier !== 'pro' && !session.loading) {
      const next = encodeURIComponent('/remates')
      router.push(session.loggedIn ? `/upgrade?next=${next}` : `/login?next=${next}`)
      return
    }
    setShowAdvanced((v) => !v)
  }

  /* ---- Render ---- */
  const groups = groupByDay(filteredAuctions)
  let rowIndex = 0
  return (
    <RemateMarksProvider>
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3">
      <div className="terminal-panel">
        <RematesFilterBar
          period={period}
          counts={counts}
          onPeriodChange={handlePeriodChange}
          enVivoCount={enVivoCount}
          filterEnVivo={filterEnVivo}
          onToggleEnVivo={handleToggleEnVivo}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterProvince={filterProvince}
          onProvinceChange={handleProvinceChange}
          provinces={provinces}
          filterType={filterType}
          onTypeChange={handleTypeChange}
          types={types}
          hasActiveFilters={hasActiveFilters}
          onClearAll={handleClearAll}
          showAdvanced={showAdvanced}
          advancedActive={!!advancedActive}
          onToggleAdvanced={handleToggleAdvanced}
          isPro={session.tier === 'pro'}
          sessionLoading={session.loading}
          canExport={filteredAuctions.length > 0 && period === 'proximos'}
          exportCount={filteredAuctions.length}
          onExport={handleBulkExport}
          resultCount={filteredAuctions.length}
        />

        {/* -- Filtros avanzados (PRO) -------------------------- */}
        {showAdvanced && session.tier === 'pro' && (
          <div className="border-b border-terminal-border px-panel py-3 flex items-end flex-wrap gap-3 bg-zinc-900/40">
            <label className="flex flex-col gap-1 text-sm text-zinc-400">
              Desde
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="terminal-input min-h-[44px] rounded-terminal px-3 text-base sm:text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-400">
              Hasta
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="terminal-input min-h-[44px] rounded-terminal px-3 text-base sm:text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-400">
              Cabezas mínimas
              <input
                type="number"
                min={0}
                step={50}
                value={filterMinHeads}
                onChange={(e) => setFilterMinHeads(e.target.value)}
                placeholder="ej. 500"
                className="terminal-input min-h-[44px] w-32 rounded-terminal px-3 text-base sm:text-sm placeholder:text-zinc-500"
              />
            </label>
          </div>
        )}

        {/* -- En vivo hoy: aviso arriba de la lista --------------- */}
        {todayLiveStreams.length > 0 && !filterEnVivo && (
          <div className="border-b border-terminal-border bg-negative/[0.06] px-panel py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ring-pulse absolute inline-flex h-full w-full rounded-full bg-negative" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-negative" />
                </span>
                <span className="text-base font-semibold text-ink">
                  Hoy se transmiten {todayLiveStreams.length} {todayLiveStreams.length === 1 ? 'remate' : 'remates'} en vivo
                </span>
              </div>
              <Link
                href="/remates/en-vivo"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-terminal bg-negative px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                Ver transmisiones
              </Link>
            </div>
          </div>
        )}

        {/* -- Remates, agrupados por día ----------------------- */}
        {filteredAuctions.length === 0 ? (
          <EmptyState
            icon="calendario"
            title="No encontramos remates con esos filtros"
            sub="Probá con otra provincia, otro tipo o borrá la búsqueda"
            cta={
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={handleClearAll}
                  className="terminal-btn-primary min-h-[44px] px-4"
                >
                  Borrar filtros
                </button>
                <Link href="/remates#recibir-remates" className="terminal-btn min-h-[44px] px-4 inline-flex items-center">
                  Avisame por mail
                </Link>
              </div>
            }
          />
        ) : (
          groups.map((g) => (
            <section key={g.date} aria-label={dayHeading(g.date, today)}>
              <h2 className="sticky top-0 z-[1] flex items-baseline justify-between gap-3 border-b border-terminal-border bg-terminal-bg/95 px-panel py-2.5 backdrop-blur-sm">
                <span className={`text-sm font-semibold sm:text-base ${g.date === today ? 'text-positive' : 'text-ink'}`}>
                  {dayHeading(g.date, today)}
                </span>
                <span className="text-sm text-zinc-500 tabular-nums">
                  {g.items.length} {g.items.length === 1 ? 'remate' : 'remates'}
                </span>
              </h2>
              {g.items.map((auction) => (
                <AuctionRow key={auction.id} auction={auction} today={today} index={rowIndex++} />
              ))}
            </section>
          ))
        )}
      </div>

      {/* ¿Falta un remate? — antes era un botón "+ AGREGAR" arriba de todo */}
      <p className="px-2 py-4 text-sm text-zinc-500">
        ¿Falta un remate o hay un dato mal?{' '}
        <button onClick={() => setShowAddModal(true)} className="font-medium text-accent hover:text-accent-bright">
          Avisanos
        </button>
      </p>

      {showAddModal && <AddRemateModal onClose={() => setShowAddModal(false)} />}
    </div>
    </RemateMarksProvider>
  )
}
