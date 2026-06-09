'use client'

import { type ReactNode } from 'react'
import { TYPE_LABELS } from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  UNIFIED REMATES FILTER BAR                                          */
/*                                                                     */
/*  Consolidates the previously-scattered filter surfaces (period      */
/*  tabs, En Vivo toggle, search, province, type, LIMPIAR, FILTROS+,   */
/*  EXPORTAR) into ONE coherent faceted bar + a removable applied-     */
/*  filters chip row.                                                   */
/*                                                                     */
/*  This is purely a controlled presentational component: ALL state    */
/*  and handlers are owned by RematesClient and passed in. It NEVER    */
/*  navigates — faceting is client-side over the already-loaded SSR    */
/*  dataset, so the SEO routes (/remates/{provincia|tipo|hoy|...})     */
/*  stay intact as the crawlable entry points.                         */
/* ------------------------------------------------------------------ */

export type Period = 'hoy' | 'proximos' | 'pasados'

/* ---- Terminal-styled native <select> faceta ---------------------- */
function FacetSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const active = value !== ''
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className={`terminal-input text-xxs py-1.5 px-3 pr-7 appearance-none cursor-pointer min-h-[40px] sm:min-h-0 sm:py-1.5 focus:border-accent focus:outline-none transition-colors ${
        active
          ? 'border-accent text-accent bg-accent/5'
          : 'bg-terminal-panel text-zinc-400'
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='${
          active ? '%2338bdf8' : '%2371717a'
        }' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '8px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/* ---- Removable applied-filter chip ------------------------------- */
function FilterChip({
  children,
  onRemove,
  tone = 'accent',
  ariaLabel,
}: {
  children: ReactNode
  onRemove: () => void
  tone?: 'accent' | 'live'
  ariaLabel: string
}) {
  const live = tone === 'live'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xxs rounded-terminal border font-terminal ${
        live
          ? 'bg-red-500/15 text-red-400 border-red-500/30'
          : 'bg-accent/10 text-accent border-accent/25'
      }`}
    >
      {live && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
      <span>{children}</span>
      <button
        onClick={onRemove}
        className={`min-h-[20px] min-w-[20px] -mr-1 flex items-center justify-center text-sm leading-none transition-colors ${
          live ? 'hover:text-red-200' : 'hover:text-accent-bright'
        }`}
        aria-label={ariaLabel}
      >
        ×
      </button>
    </span>
  )
}

interface RematesFilterBarProps {
  /* period */
  period: Period
  counts: Record<Period, number>
  onPeriodChange: (p: Period) => void
  /* en vivo */
  enVivoCount: number
  filterEnVivo: boolean
  onToggleEnVivo: () => void
  /* search */
  searchQuery: string
  onSearchChange: (v: string) => void
  /* facets */
  filterProvince: string
  onProvinceChange: (v: string) => void
  provinces: string[]
  filterType: string
  onTypeChange: (v: string) => void
  types: string[]
  /* clear */
  hasActiveFilters: boolean
  onClearAll: () => void
  /* advanced (PRO) */
  showAdvanced: boolean
  advancedActive: boolean
  onToggleAdvanced: () => void
  isPro: boolean
  sessionLoading: boolean
  /* export (PRO) */
  canExport: boolean
  exportCount: number
  onExport: () => void
  /* applied-chip count */
  resultCount: number
}

export default function RematesFilterBar({
  period,
  counts,
  onPeriodChange,
  enVivoCount,
  filterEnVivo,
  onToggleEnVivo,
  searchQuery,
  onSearchChange,
  filterProvince,
  onProvinceChange,
  provinces,
  filterType,
  onTypeChange,
  types,
  hasActiveFilters,
  onClearAll,
  showAdvanced,
  advancedActive,
  onToggleAdvanced,
  isPro,
  sessionLoading,
  canExport,
  exportCount,
  onExport,
  resultCount,
}: RematesFilterBarProps) {
  const showProBadge = !sessionLoading && !isPro
  const anyChip = !!(filterProvince || filterType || filterEnVivo || searchQuery)

  const TABS: { key: Period; label: string }[] = [
    { key: 'hoy', label: 'HOY' },
    { key: 'proximos', label: 'PROXIMOS' },
    { key: 'pasados', label: 'PASADOS' },
  ]

  return (
    <>
      {/* ── ONE control row — period (nav) · En Vivo | facets · actions ── */}
      <div className="border-b border-terminal-border px-panel py-2 flex items-center justify-between flex-wrap gap-x-3 gap-y-2">
        {/* LEFT: temporal navigation (above facets) + the lone red faceta */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1" role="tablist" aria-label="Período">
            {TABS.map((tab) => {
              const on = period === tab.key
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => onPeriodChange(tab.key)}
                  className={`terminal-btn text-xxs px-3 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1 ${
                    on ? 'border-accent text-accent bg-accent/5' : ''
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 tabular-nums ${on ? 'text-accent' : 'text-zinc-500'}`}>
                    {counts[tab.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* En Vivo — the ONLY red faceta; binary toggle with live count */}
          {enVivoCount > 0 && (
            <button
              onClick={onToggleEnVivo}
              aria-pressed={filterEnVivo}
              className={`terminal-btn text-xxs px-3 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1 flex items-center gap-1.5 ml-1 ${
                filterEnVivo
                  ? 'border-red-500 text-white bg-red-600 hover:bg-red-500'
                  : 'border-red-800/50 text-red-400 bg-red-900/20 hover:bg-red-900/40 hover:border-red-600/50'
              }`}
              title={filterEnVivo ? 'Mostrando solo remates con transmisión en vivo' : 'Filtrar remates con transmisión en vivo'}
            >
              <span className={`w-2 h-2 rounded-full ${filterEnVivo ? 'bg-white' : 'bg-red-500'} animate-pulse`} />
              EN VIVO
              <span className={`tabular-nums ${filterEnVivo ? 'text-red-200' : 'text-red-500'}`}>{enVivoCount}</span>
            </button>
          )}
        </div>

        {/* RIGHT: refinement facets + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar consignataria, plaza…"
              className={`terminal-input text-xxs w-32 sm:w-44 pl-2 pr-6 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1 rounded-terminal focus:border-accent focus:outline-none placeholder:text-zinc-600 ${
                searchQuery ? 'border-accent text-accent' : 'border-terminal-border'
              }`}
              aria-label="Buscar remates"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[28px] min-w-[28px] flex items-center justify-center text-zinc-500 hover:text-negative text-sm"
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <FacetSelect
            value={filterProvince}
            onChange={onProvinceChange}
            options={provinces.map((p) => ({ value: p, label: p }))}
            placeholder="Provincia"
          />
          <FacetSelect
            value={filterType}
            onChange={onTypeChange}
            options={types.map((t) => ({ value: t, label: TYPE_LABELS[t] || t.toUpperCase() }))}
            placeholder="Tipo"
          />

          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xxs text-zinc-500 hover:text-negative font-terminal transition-colors px-2 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1"
              title="Limpiar todos los filtros"
            >
              LIMPIAR
            </button>
          )}

          {/* FILTROS+ — advanced facets behind PRO */}
          <button
            onClick={onToggleAdvanced}
            aria-pressed={showAdvanced && isPro}
            className={`terminal-btn text-xxs px-2.5 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1 flex items-center gap-1.5 hover:border-accent hover:text-accent ${
              advancedActive ? 'border-accent text-accent bg-accent/5' : ''
            }`}
            title={
              isPro
                ? 'Filtros avanzados: rango de fechas, cabezas mínimas'
                : 'Filtros avanzados (PRO): rango de fechas, cabezas mínimas'
            }
          >
            <span className="hidden sm:inline">FILTROS+</span>
            <span className="sm:hidden">+</span>
            {showProBadge && (
              <span className="ml-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-400 border border-amber-400/40 rounded px-1 leading-none py-0.5">
                PRO
              </span>
            )}
          </button>

          {/* EXPORTAR — bulk .ics behind PRO */}
          {canExport && (
            <button
              onClick={onExport}
              className="terminal-btn text-xxs px-2.5 py-1.5 min-h-[40px] sm:min-h-0 sm:py-1 flex items-center gap-1.5 hover:border-accent hover:text-accent"
              title={
                isPro
                  ? `Exportar ${exportCount} remates al calendario`
                  : 'Exportar el calendario es PRO. Click para suscribirte.'
              }
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">EXPORTAR</span>
              <span className="tabular-nums text-zinc-500">{exportCount}</span>
              {showProBadge && (
                <span className="ml-1 text-[9px] font-mono uppercase tracking-wider text-amber-400 border border-amber-400/40 rounded px-1 leading-none py-0.5">
                  PRO
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Applied-filter chips (unified feedback) ─────────────────── */}
      {anyChip && (
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xxs text-zinc-500 font-terminal uppercase tracking-wider">Filtros</span>
          {filterEnVivo && (
            <FilterChip tone="live" onRemove={onToggleEnVivo} ariaLabel="Quitar filtro en vivo">
              En Vivo
            </FilterChip>
          )}
          {searchQuery && (
            <FilterChip onRemove={() => onSearchChange('')} ariaLabel="Quitar búsqueda">
              &quot;{searchQuery}&quot;
            </FilterChip>
          )}
          {filterProvince && (
            <FilterChip onRemove={() => onProvinceChange('')} ariaLabel="Quitar filtro provincia">
              {filterProvince}
            </FilterChip>
          )}
          {filterType && (
            <FilterChip onRemove={() => onTypeChange('')} ariaLabel="Quitar filtro tipo">
              {TYPE_LABELS[filterType] || filterType.toUpperCase()}
            </FilterChip>
          )}
          <span className="text-xxs text-zinc-600 font-terminal tabular-nums ml-auto">
            {resultCount} resultado{resultCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </>
  )
}
