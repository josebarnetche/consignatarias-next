'use client'

import { useState, useMemo, useEffect } from 'react'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const auctions = rematesData as Auction[]

type Period = 'hoy' | 'proximos' | 'pasados'

/** Province abbreviation codes */
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
}

/** Type badge terminal colors: border + text */
const TYPE_COLORS: Record<Auction['type'], string> = {
  invernada: 'border-positive text-positive',
  cria: 'border-accent text-accent',
  reproductores: 'border-warning text-warning',
  general: 'border-zinc-500 text-zinc-400',
  especial: 'border-negative text-negative',
}

/** Type labels uppercase for terminal display */
const TYPE_LABELS: Record<Auction['type'], string> = {
  invernada: 'INVERNADA',
  cria: 'CRIA',
  reproductores: 'REPROD',
  general: 'GENERAL',
  especial: 'ESPECIAL',
}

/** Category short codes */
const CAT_CODES: Record<Auction['mainCategory'], string> = {
  terneros: 'TERN',
  novillos: 'NOV',
  vaca_gorda: 'V.GOR',
  vaquillonas: 'VAQUI',
  toros: 'TOROS',
  mixto: 'MIXTO',
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/**
 * Get "effective today" date string in YYYY-MM-DD format.
 * After 20:00 ART, we shift to tomorrow so users see upcoming auctions.
 */
function getEffectiveToday(): string {
  const now = new Date()
  // Convert to ART (UTC-3)
  const art = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  if (art.getHours() >= 20) {
    art.setDate(art.getDate() + 1)
  }
  const y = art.getFullYear()
  const m = (art.getMonth() + 1).toString().padStart(2, '0')
  const d = art.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate().toString().padStart(2, '0')
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  return `${day} ${months[d.getMonth()]}`
}

function getCity(location: string): string {
  const parts = location.split(',')
  return parts[0].trim()
}

function getProvinceCode(province: string): string {
  return PROVINCE_CODES[province] || province.substring(0, 4).toUpperCase()
}

/** Get the best link for an auction row click */
function getAuctionHref(auction: Auction): string {
  return auction.sourceUrl || auction.catalogUrl || `/consignatarias/${auction.consignatariaSlug}`
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

  // scheduled
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
/*  AUCTION ROW (clickable, 2-line dense)                              */
/* ------------------------------------------------------------------ */

function AuctionRow({ auction, today }: { auction: Auction; today: string }) {
  const isToday = auction.date === today
  const city = getCity(auction.location)
  const prvCode = getProvinceCode(auction.province)
  const href = getAuctionHref(auction)
  const external = isExternalLink(href)

  function handleRowClick() {
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = href
    }
  }

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
      {/* Line 1: date time consignataria location province */}
      <div className="flex items-center gap-0 px-cell py-px2">
        {/* Date */}
        <span
          className={`w-[52px] flex-shrink-0 text-data tabular-nums font-terminal ${
            isToday ? 'text-positive font-medium' : 'text-zinc-300'
          }`}
        >
          {formatDateShort(auction.date)}
        </span>

        {/* Time or source link */}
        <span className="w-[52px] flex-shrink-0 text-data tabular-nums font-terminal">
          {auction.time ? (
            <span className="text-zinc-300">{auction.time}</span>
          ) : auction.sourceUrl ? (
            <span
              className="text-accent text-xxs cursor-pointer"
              title="Ver horario en fuente"
            >
              VER &rarr;
            </span>
          ) : (
            <span className="text-zinc-600">&mdash;</span>
          )}
        </span>

        {/* Consignataria name */}
        <span
          className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors"
          title={auction.consignatariaName}
        >
          {auction.consignatariaName}
        </span>

        {/* Location city */}
        <span className="hidden sm:block w-[140px] flex-shrink-0 text-data font-terminal text-zinc-500 truncate text-right pr-2">
          {city}
        </span>

        {/* Province code */}
        <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-zinc-600 text-right">
          {prvCode}
        </span>
      </div>

      {/* Line 2: type badge, category, heads, status, links */}
      <div className="flex items-center gap-0 px-cell pb-[3px]">
        {/* Type tag */}
        <span
          className={`terminal-tag ${TYPE_COLORS[auction.type]} mr-1.5 text-[9px]`}
        >
          {TYPE_LABELS[auction.type]}
        </span>

        {/* Category */}
        <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-zinc-500">
          {CAT_CODES[auction.mainCategory]}
        </span>

        {/* Estimated heads */}
        <span className="w-[50px] flex-shrink-0 text-data font-terminal tabular-nums text-zinc-400 text-right">
          {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
        </span>

        {/* Status */}
        <span className="w-[56px] flex-shrink-0 ml-2">
          <StatusBadge status={auction.status} date={auction.date} today={today} />
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Links — stop propagation so they don't trigger row click */}
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {auction.catalogUrl && (
            <a
              href={auction.catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
              title="Descargar catalogo"
            >
              CAT
            </a>
          )}
          {auction.youtubeUrl && (
            <a
              href={auction.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xxs font-terminal text-negative hover:text-red-300 transition-colors"
              title="Ver transmision"
            >
              YT
            </a>
          )}
          {auction.sourceUrl && (
            <a
              href={auction.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xxs font-terminal text-zinc-600 hover:text-zinc-400 transition-colors hidden md:inline"
              title="Fuente"
            >
              SRC
            </a>
          )}
        </span>
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
      className="terminal-input text-xxs py-1 px-2 pr-5 appearance-none cursor-pointer bg-terminal-panel"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%2371717a' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
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
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
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
              <label className="text-xxs text-zinc-500 uppercase tracking-wider font-terminal block mb-1">Cab. Est.</label>
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
    // Recalculate every minute in case the cutoff time passes
    const id = setInterval(() => setToday(getEffectiveToday()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ---- Classify auctions ---- */
  const todayAuctions = useMemo(
    () => auctions.filter((a) => a.date === today),
    [today]
  )
  const upcomingAuctions = useMemo(
    () => auctions.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
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
      case 'hoy':
        return todayAuctions
      case 'proximos':
        return upcomingAuctions
      case 'pasados':
        return pastAuctions
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
      {/* ============================================================ */}
      {/*  MAIN PANEL                                                   */}
      {/* ============================================================ */}
      <div className="terminal-panel">
        {/* -- Panel header ----------------------------------------- */}
        <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-zinc-200 text-label tracking-widest">REMATES</span>
            <span className="text-terminal-border">&mdash;</span>
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">
              Cronograma de Remates Ganaderos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="terminal-btn-primary text-xxs px-3 py-0.5"
            >
              + AGREGAR
            </button>
            <span className="text-xxs tabular-nums text-zinc-500 font-terminal">
              {auctions.length} registros
            </span>
          </div>
        </div>

        {/* -- Summary stats strip ---------------------------------- */}
        <div className="border-b border-terminal-border px-panel py-[5px] flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Total:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{auctions.length}</span>
            <span className="text-xxs text-zinc-600">remates</span>
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
            <span className="text-xxs text-zinc-600 uppercase">Provincias:</span>
            <span className="text-data tabular-nums text-zinc-300 font-terminal">{uniqueProvinces}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-zinc-600 uppercase">Hoy:</span>
            <span className={`text-data tabular-nums font-terminal ${todayAuctions.length > 0 ? 'text-positive' : 'text-zinc-500'}`}>
              {todayAuctions.length}
            </span>
          </div>
        </div>

        {/* -- Tabs + Filters bar ----------------------------------- */}
        <div className="border-b border-terminal-border px-panel py-[5px] flex items-center justify-between flex-wrap gap-2">
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
                className={`terminal-btn text-xxs px-2.5 py-0.5 ${
                  period === tab.key
                    ? 'border-accent text-accent bg-accent/5'
                    : ''
                }`}
              >
                {tab.label}
                <span className={`ml-1 tabular-nums ${
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
                className="text-xxs text-zinc-600 hover:text-negative font-terminal transition-colors px-1"
                title="Limpiar filtros"
              >
                CLR
              </button>
            )}
          </div>
        </div>

        {/* -- Column headers --------------------------------------- */}
        <div className="border-b border-terminal-border px-cell py-px2 flex items-center gap-0 bg-terminal-panel">
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Fecha
          </span>
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Hora
          </span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal">
            Consignataria
          </span>
          <span className="hidden sm:block w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-600 font-terminal text-right pr-2">
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
                &mdash; No hay remates para este periodo con los filtros seleccionados &mdash;
              </p>
              <button
                onClick={() => {
                  setFilterProvince('')
                  setFilterType('')
                }}
                className="mt-2 text-xxs text-accent hover:text-accent-bright font-terminal transition-colors"
              >
                [ LIMPIAR FILTROS ]
              </button>
            </div>
          ) : (
            filteredAuctions.map((auction) => (
              <AuctionRow key={auction.id} auction={auction} today={today} />
            ))
          )}
        </div>

        {/* -- Panel footer ----------------------------------------- */}
        <div className="border-t border-terminal-border px-panel py-[5px] flex items-center justify-between">
          <span className="text-xxs text-zinc-600 font-terminal">
            {filteredAuctions.length} resultado{filteredAuctions.length !== 1 ? 's' : ''}
            {(filterProvince || filterType) && (
              <span className="text-zinc-700"> (filtrado)</span>
            )}
          </span>
          <span className="text-xxs text-zinc-700 font-terminal">
            {period === 'pasados' ? 'Orden: mas reciente primero' : 'Orden: proxima fecha primero'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LEGEND / KEY                                                 */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="px-panel py-[5px] flex items-center flex-wrap gap-x-4 gap-y-1">
          <span className="text-xxs text-zinc-600 font-terminal mr-1">TIPOS:</span>
          {(Object.entries(TYPE_COLORS) as [Auction['type'], string][]).map(([type, cls]) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`terminal-tag ${cls} text-[9px]`}>{TYPE_LABELS[type]}</span>
            </span>
          ))}

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-zinc-600 font-terminal mr-1">STATUS:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-sky-400" />
            <span className="text-xxs text-zinc-500 font-terminal">PROG</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-positive animate-pulse-live" />
            <span className="text-xxs text-zinc-500 font-terminal">VIVO</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-zinc-600" />
            <span className="text-xxs text-zinc-500 font-terminal">FIN</span>
          </span>

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-zinc-600 font-terminal mr-1">LINKS:</span>
          <span className="text-xxs text-accent font-terminal">CAT</span>
          <span className="text-xxs text-zinc-700 font-terminal">=catalogo</span>
          <span className="text-xxs text-negative font-terminal ml-1">YT</span>
          <span className="text-xxs text-zinc-700 font-terminal">=youtube</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ADD REMATE MODAL                                              */}
      {/* ============================================================ */}
      {showAddModal && <AddRemateModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
