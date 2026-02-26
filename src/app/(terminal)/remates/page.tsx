'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const auctions = rematesData as Auction[]

const TODAY = '2026-02-26'

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
  general: 'border-slate-500 text-slate-400',
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate().toString().padStart(2, '0')
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  return `${day} ${months[d.getMonth()]}`
}

function getCity(location: string): string {
  // location format: "City, Province" — take just the city
  const parts = location.split(',')
  return parts[0].trim()
}

function getProvinceCode(province: string): string {
  return PROVINCE_CODES[province] || province.substring(0, 4).toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  STATUS INDICATOR                                                   */
/* ------------------------------------------------------------------ */

function StatusBadge({ status, date }: { status: Auction['status']; date: string }) {
  const isToday = date === TODAY

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
        <span className="inline-block w-1.5 h-1.5 bg-slate-600" />
        <span className="text-slate-500 font-terminal text-xxs">FIN</span>
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
/*  AUCTION ROW (2-line dense)                                         */
/* ------------------------------------------------------------------ */

function AuctionRow({ auction, index }: { auction: Auction; index: number }) {
  const isToday = auction.date === TODAY
  const city = getCity(auction.location)
  const prvCode = getProvinceCode(auction.province)

  return (
    <div
      className={`group border-b border-terminal-border hover:bg-accent/[0.03] transition-colors duration-75 ${
        isToday ? 'bg-positive/[0.02]' : ''
      }`}
    >
      {/* Line 1: date time consignataria location province */}
      <div className="flex items-center gap-0 px-cell py-px2">
        {/* Date */}
        <span
          className={`w-[52px] flex-shrink-0 text-data tabular-nums font-terminal ${
            isToday ? 'text-positive font-medium' : 'text-slate-300'
          }`}
        >
          {formatDateShort(auction.date)}
        </span>

        {/* Time */}
        <span className="w-[42px] flex-shrink-0 text-data tabular-nums font-terminal text-slate-400">
          {auction.time ?? '—'}
        </span>

        {/* Consignataria name */}
        <Link
          href={`/consignatarias/${auction.consignatariaSlug}`}
          className="flex-1 min-w-0 text-data font-terminal text-slate-200 truncate hover:text-accent transition-colors"
          title={auction.consignatariaName}
        >
          {auction.consignatariaName}
        </Link>

        {/* Location city */}
        <span className="hidden sm:block w-[140px] flex-shrink-0 text-data font-terminal text-slate-500 truncate text-right pr-2">
          {city}
        </span>

        {/* Province code */}
        <span className="w-[36px] flex-shrink-0 text-xxs font-terminal text-slate-600 text-right">
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
        <span className="w-[42px] flex-shrink-0 text-xxs font-terminal text-slate-500">
          {CAT_CODES[auction.mainCategory]}
        </span>

        {/* Estimated heads */}
        <span className="w-[50px] flex-shrink-0 text-data font-terminal tabular-nums text-slate-400 text-right">
          {auction.estimatedHeads != null ? `~${auction.estimatedHeads.toLocaleString('es-AR')}` : '—'}
        </span>

        {/* Status */}
        <span className="w-[56px] flex-shrink-0 ml-2">
          <StatusBadge status={auction.status} date={auction.date} />
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Links */}
        <span className="flex items-center gap-2">
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
              className="text-xxs font-terminal text-slate-700 hover:text-slate-400 transition-colors hidden md:inline"
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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%2364748b' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
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
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function RematesPage() {
  const [period, setPeriod] = useState<Period>('proximos')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterType, setFilterType] = useState('')

  /* ---- Classify auctions ---- */
  const todayAuctions = useMemo(
    () => auctions.filter((a) => a.date === TODAY),
    []
  )
  const upcomingAuctions = useMemo(
    () => auctions.filter((a) => a.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')),
    []
  )
  const pastAuctions = useMemo(
    () => auctions.filter((a) => a.date < TODAY).sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')),
    []
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
            <span className="text-slate-200 text-label tracking-widest">REMATES</span>
            <span className="text-terminal-border">—</span>
            <span className="text-xxs text-slate-500 uppercase tracking-wider">
              Cronograma de Remates Ganaderos
            </span>
          </div>
          <span className="text-xxs tabular-nums text-slate-500 font-terminal">
            {auctions.length} registros
          </span>
        </div>

        {/* -- Summary stats strip ---------------------------------- */}
        <div className="border-b border-terminal-border px-panel py-[5px] flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-slate-600 uppercase">Total:</span>
            <span className="text-data tabular-nums text-slate-300 font-terminal">{auctions.length}</span>
            <span className="text-xxs text-slate-600">remates</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-slate-600 uppercase">Cab.Est:</span>
            <span className="text-data tabular-nums text-slate-300 font-terminal">
              ~{totalHeads.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-slate-600 uppercase">Provincias:</span>
            <span className="text-data tabular-nums text-slate-300 font-terminal">{uniqueProvinces}</span>
          </div>
          <div className="text-terminal-border text-xxs select-none hidden sm:block">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs text-slate-600 uppercase">Hoy:</span>
            <span className={`text-data tabular-nums font-terminal ${todayAuctions.length > 0 ? 'text-positive' : 'text-slate-500'}`}>
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
                  period === tab.key ? 'text-accent' : 'text-slate-600'
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
                className="text-xxs text-slate-600 hover:text-negative font-terminal transition-colors px-1"
                title="Limpiar filtros"
              >
                CLR
              </button>
            )}
          </div>
        </div>

        {/* -- Column headers --------------------------------------- */}
        <div className="border-b border-terminal-border px-cell py-px2 flex items-center gap-0 bg-terminal-panel">
          <span className="w-[52px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-slate-600 font-terminal">
            Fecha
          </span>
          <span className="w-[42px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-slate-600 font-terminal">
            Hora
          </span>
          <span className="flex-1 min-w-0 text-xxs font-medium uppercase tracking-wider text-slate-600 font-terminal">
            Consignataria
          </span>
          <span className="hidden sm:block w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-slate-600 font-terminal text-right pr-2">
            Plaza
          </span>
          <span className="w-[36px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-slate-600 font-terminal text-right">
            Prv
          </span>
        </div>

        {/* -- Auction rows ----------------------------------------- */}
        <div className="divide-y-0">
          {filteredAuctions.length === 0 ? (
            <div className="px-panel py-8 text-center">
              <p className="text-data text-slate-600 font-terminal">
                — No hay remates para este periodo con los filtros seleccionados —
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
            filteredAuctions.map((auction, i) => (
              <AuctionRow key={auction.id} auction={auction} index={i} />
            ))
          )}
        </div>

        {/* -- Panel footer ----------------------------------------- */}
        <div className="border-t border-terminal-border px-panel py-[5px] flex items-center justify-between">
          <span className="text-xxs text-slate-600 font-terminal">
            {filteredAuctions.length} resultado{filteredAuctions.length !== 1 ? 's' : ''}
            {(filterProvince || filterType) && (
              <span className="text-slate-700"> (filtrado)</span>
            )}
          </span>
          <span className="text-xxs text-slate-700 font-terminal">
            {period === 'pasados' ? 'Orden: mas reciente primero' : 'Orden: proxima fecha primero'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LEGEND / KEY                                                 */}
      {/* ============================================================ */}
      <div className="terminal-panel mt-px">
        <div className="px-panel py-[5px] flex items-center flex-wrap gap-x-4 gap-y-1">
          <span className="text-xxs text-slate-600 font-terminal mr-1">TIPOS:</span>
          {(Object.entries(TYPE_COLORS) as [Auction['type'], string][]).map(([type, cls]) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`terminal-tag ${cls} text-[9px]`}>{TYPE_LABELS[type]}</span>
            </span>
          ))}

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-slate-600 font-terminal mr-1">STATUS:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-sky-400" />
            <span className="text-xxs text-slate-500 font-terminal">PROG</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-positive animate-pulse-live" />
            <span className="text-xxs text-slate-500 font-terminal">VIVO</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-slate-600" />
            <span className="text-xxs text-slate-500 font-terminal">FIN</span>
          </span>

          <span className="text-terminal-border text-xxs select-none hidden sm:inline">|</span>

          <span className="text-xxs text-slate-600 font-terminal mr-1">LINKS:</span>
          <span className="text-xxs text-accent font-terminal">CAT</span>
          <span className="text-xxs text-slate-700 font-terminal">=catalogo</span>
          <span className="text-xxs text-negative font-terminal ml-1">YT</span>
          <span className="text-xxs text-slate-700 font-terminal">=youtube</span>
        </div>
      </div>
    </div>
  )
}
