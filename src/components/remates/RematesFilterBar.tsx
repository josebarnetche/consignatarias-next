'use client'

import { type ReactNode } from 'react'
import { TYPE_LABELS, provinciaNombre } from '@/lib/ui/tokens'
import { Badge } from '@/components/ui'

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

/** "INVERNADA" → "Invernada" (los TYPE_LABELS están en mayúsculas de terminal). */
export function typeLabel(t: string): string {
  const l = (TYPE_LABELS[t] || t).toLowerCase()
  return l === 'cria' ? 'Cría' : l.charAt(0).toUpperCase() + l.slice(1)
}

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
      className={`terminal-input w-full min-h-[44px] text-base sm:text-sm py-2 px-3 pr-8 rounded-terminal appearance-none cursor-pointer focus:border-accent focus:outline-none transition-colors ${
        active
          ? 'border-accent text-accent bg-accent/5'
          : 'bg-terminal-panel text-zinc-300'
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='${
          active ? '%2338bdf8' : '%2371717a'
        }' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '10px',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-full border ${
        live
          ? 'bg-negative/15 text-negative border-negative/30'
          : 'bg-accent/10 text-accent border-accent/25'
      }`}
    >
      {live && <span className="w-1.5 h-1.5 rounded-full bg-negative animate-pulse" />}
      <span>{children}</span>
      <button
        onClick={onRemove}
        className={`min-h-[28px] min-w-[28px] -mr-1.5 flex items-center justify-center text-sm leading-none transition-colors motion-hover ${
          live ? 'hover:text-red-300' : 'hover:text-accent-bright'
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

  // Pestañas con nombre completo y el conteo al lado: "¿qué hay hoy?" es la
  // pregunta más frecuente, así que va primero (antes: HOY/PROXIMOS/PASADOS).
  const TABS: { key: Period; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'proximos', label: 'Próximos' },
    { key: 'pasados', label: 'Anteriores' },
  ]

  return (
    <>
      <div className="border-b border-terminal-border px-panel py-3 space-y-3">
        {/* ── Cuándo: pestañas grandes, fáciles de tocar en el celular ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex rounded-terminal border border-terminal-border bg-terminal-bg/60 p-1"
            role="tablist"
            aria-label="Cuándo"
          >
            {TABS.map((tab) => {
              const on = period === tab.key
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => onPeriodChange(tab.key)}
                  className={`min-h-[44px] rounded-terminal px-4 text-sm font-medium transition-colors motion-hover ${
                    on
                      ? 'bg-terminal-panel text-ink shadow-panel'
                      : 'text-zinc-400 hover:text-zinc-200'
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

          {enVivoCount > 0 && (
            <button
              onClick={onToggleEnVivo}
              aria-pressed={filterEnVivo}
              className={`min-h-[44px] rounded-terminal border px-4 text-sm font-medium flex items-center gap-2 transition-colors motion-hover ${
                filterEnVivo
                  ? 'border-negative bg-negative text-white'
                  : 'border-negative/40 bg-negative/10 text-negative hover:bg-negative/20'
              }`}
              title={filterEnVivo ? 'Mostrando solo los que se transmiten en vivo' : 'Ver solo los que se transmiten en vivo'}
            >
              <span className={`w-2 h-2 rounded-full ${filterEnVivo ? 'bg-white' : 'bg-negative'} animate-pulse`} />
              Se transmiten en vivo
              <span className="tabular-nums">{enVivoCount}</span>
            </button>
          )}
        </div>

        {/* ── Qué y dónde: buscador ancho + provincia y tipo ── */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_200px_200px]">
          <div className="relative col-span-2 md:col-span-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar consignataria o localidad"
              className="terminal-input w-full min-h-[44px] pl-9 pr-9 text-base sm:text-sm rounded-terminal focus:border-accent focus:outline-none placeholder:text-zinc-500"
              aria-label="Buscar remates"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-zinc-500 hover:text-negative text-lg"
                aria-label="Borrar búsqueda"
              >
                ×
              </button>
            )}
          </div>
          <FacetSelect
            value={filterProvince}
            onChange={onProvinceChange}
            options={provinces.map((p) => ({ value: p, label: provinciaNombre(p) }))}
            placeholder="Todas las provincias"
          />
          <FacetSelect
            value={filterType}
            onChange={onTypeChange}
            options={types.map((t) => ({ value: t, label: typeLabel(t) }))}
            placeholder="Todos los tipos"
          />
        </div>

        {/* ── Extras, en segundo plano ── */}
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="min-h-[36px] font-medium text-accent hover:text-accent-bright transition-colors"
            >
              Borrar filtros
            </button>
          )}
          <button
            onClick={onToggleAdvanced}
            aria-pressed={showAdvanced && isPro}
            className={`min-h-[36px] flex items-center gap-1.5 transition-colors hover:text-accent ${
              advancedActive ? 'text-accent' : 'text-zinc-400'
            }`}
            title="Rango de fechas y cantidad mínima de cabezas"
          >
            Más filtros
            {showProBadge && <Badge tone="pro">PRO</Badge>}
          </button>
          {canExport && (
            <button
              onClick={onExport}
              className="min-h-[36px] flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-accent"
              title={
                isPro
                  ? `Agregar ${exportCount} remates a tu calendario`
                  : 'Agregar al calendario es PRO. Tocá para suscribirte.'
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Agregar a mi calendario
              {showProBadge && <Badge tone="pro">PRO</Badge>}
            </button>
          )}
          <span className="ml-auto text-zinc-500 tabular-nums">
            {resultCount} remate{resultCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Filtros aplicados ─────────────────── */}
      {anyChip && (
        <div className="border-b border-terminal-border px-panel py-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-zinc-500">Mostrando:</span>
          {filterEnVivo && (
            <FilterChip tone="live" onRemove={onToggleEnVivo} ariaLabel="Quitar filtro en vivo">
              En vivo
            </FilterChip>
          )}
          {searchQuery && (
            <FilterChip onRemove={() => onSearchChange('')} ariaLabel="Quitar búsqueda">
              &quot;{searchQuery}&quot;
            </FilterChip>
          )}
          {filterProvince && (
            <FilterChip onRemove={() => onProvinceChange('')} ariaLabel="Quitar filtro provincia">
              {provinciaNombre(filterProvince)}
            </FilterChip>
          )}
          {filterType && (
            <FilterChip onRemove={() => onTypeChange('')} ariaLabel="Quitar filtro tipo">
              {typeLabel(filterType)}
            </FilterChip>
          )}
        </div>
      )}
    </>
  )
}
