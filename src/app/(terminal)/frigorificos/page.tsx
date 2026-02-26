'use client'

import { useState, useMemo } from 'react'
import frigorificosData from '@/lib/data/frigorificos.json'
import summaryData from '@/lib/data/frigorificos-summary.json'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
interface Frigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
}

interface ProvinceSummary {
  province: string
  count: number
  pct: number
}

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */
const frigorificos = frigorificosData as Frigorifico[]
const summary = summaryData as {
  total: number
  byProvince: Record<string, number>
  byStage: Record<string, number>
  topProvinces: ProvinceSummary[]
}

/* ------------------------------------------------------------------ */
/*  PROVINCE ABBREVIATIONS                                             */
/* ------------------------------------------------------------------ */
const PROVINCE_ABBR: Record<string, string> = {
  'BUENOS AIRES': 'BSAS',
  'CATAMARCA': 'CATA',
  'CHACO': 'CHAC',
  'CHUBUT': 'CHUB',
  'CORDOBA': 'CORD',
  'CORRIENTES': 'CORR',
  'ENTRE RIOS': 'RIOS',
  'FORMOSA': 'FORM',
  'JUJUY': 'JUJU',
  'LA PAMPA': 'LPAM',
  'LA RIOJA': 'LRIO',
  'MENDOZA': 'MEND',
  'MISIONES': 'MISI',
  'NEUQUEN': 'NEUQ',
  'RIO NEGRO': 'RNEG',
  'SALTA': 'SALT',
  'SAN JUAN': 'SJUA',
  'SAN LUIS': 'SLUI',
  'SANTA CRUZ': 'SCRU',
  'SANTA FE': 'STFE',
  'SANTIAGO DEL ESTERO': 'SEST',
  'TIERRA DEL FUEGO': 'TFUE',
  'TUCUMAN': 'TUCU',
}

function abbr(province: string): string {
  return PROVINCE_ABBR[province] || province.slice(0, 4).toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  STAGE HELPERS                                                      */
/* ------------------------------------------------------------------ */
function stageColor(stage: number): string {
  if (stage === 1) return 'val-positive'
  if (stage === 2) return 'val-warning'
  return 'val-negative'
}

function stageBarColor(stage: number): string {
  if (stage === 1) return 'bg-positive'
  if (stage === 2) return 'bg-warning'
  return 'bg-negative'
}

/* ------------------------------------------------------------------ */
/*  ASCII BAR                                                          */
/* ------------------------------------------------------------------ */
function AsciiBar({
  value,
  max,
  width = 20,
  colorClass = 'text-accent',
}: {
  value: number
  max: number
  width?: number
  colorClass?: string
}) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0
  const empty = width - filled
  return (
    <span className={`font-terminal ${colorClass}`}>
      {'\u2588'.repeat(filled)}
      <span className="text-slate-700">{'\u2591'.repeat(empty)}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  SORT HELPERS                                                       */
/* ------------------------------------------------------------------ */
type SortField = 'matricula' | 'name' | 'province' | 'stage'
type SortDir = 'asc' | 'desc'

function compareFn(field: SortField, dir: SortDir) {
  return (a: Frigorifico, b: Frigorifico): number => {
    let cmp = 0
    switch (field) {
      case 'matricula':
        cmp = Number(a.matricula) - Number(b.matricula)
        break
      case 'name':
        cmp = a.name.localeCompare(b.name, 'es')
        break
      case 'province':
        cmp = a.province.localeCompare(b.province, 'es')
        break
      case 'stage':
        cmp = a.stage - b.stage
        break
    }
    return dir === 'asc' ? cmp : -cmp
  }
}

/* ------------------------------------------------------------------ */
/*  SORT HEADER                                                        */
/* ------------------------------------------------------------------ */
function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className = '',
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentField === field
  const arrow = isActive ? (currentDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''
  return (
    <th
      className={`cursor-pointer select-none hover:text-slate-300 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && <span className="text-accent">{arrow}</span>}
    </th>
  )
}

/* ================================================================== */
/*  PAGE COMPONENT                                                     */
/* ================================================================== */
export default function FrigorificosPage() {
  /* -- Filter state ------------------------------------------------ */
  const [search, setSearch] = useState('')
  const [filterProvince, setFilterProvince] = useState('')
  const [filterStage, setFilterStage] = useState('')

  /* -- Sort state -------------------------------------------------- */
  const [sortField, setSortField] = useState<SortField>('matricula')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  /* -- Province list for sidebar ----------------------------------- */
  const provinces = useMemo(
    () =>
      Object.entries(summary.byProvince)
        .sort((a, b) => b[1] - a[1])
        .map(([province, count]) => ({ province, count })),
    [],
  )

  /* -- Unique province list for dropdown (sorted alpha) ------------ */
  const provinceOptions = useMemo(
    () => Object.keys(summary.byProvince).sort((a, b) => a.localeCompare(b, 'es')),
    [],
  )

  /* -- Filtered + sorted data -------------------------------------- */
  const filtered = useMemo(() => {
    let result = frigorificos

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((f) => f.name.toLowerCase().includes(q))
    }

    if (filterProvince) {
      result = result.filter((f) => f.province === filterProvince)
    }

    if (filterStage) {
      result = result.filter((f) => f.stage === Number(filterStage))
    }

    return [...result].sort(compareFn(sortField, sortDir))
  }, [search, filterProvince, filterStage, sortField, sortDir])

  /* -- Stage stats ------------------------------------------------- */
  const maxProvince = summary.topProvinces[0]?.count ?? 1
  const stageTotal = summary.total

  const stages = [
    { stage: 1, count: summary.byStage['1'] ?? 0 },
    { stage: 2, count: summary.byStage['2'] ?? 0 },
    { stage: 3, count: summary.byStage['3'] ?? 0 },
  ]

  const maxStage = Math.max(...stages.map((s) => s.count))

  /* -- Render ------------------------------------------------------ */
  return (
    <div className="flex flex-col h-full">
      {/* ── PAGE HEADER ──────────────────────────────────────────── */}
      <div className="border-b border-terminal-border bg-terminal-panel px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-label font-terminal uppercase tracking-widest text-slate-100">
            FRIGORIFICOS
          </h1>
          <span className="text-slate-600 font-terminal text-xxs">&mdash;</span>
          <span className="text-xxs font-terminal uppercase tracking-wider text-slate-500">
            Registro Nacional SENASA
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xxs font-terminal text-slate-500 uppercase tracking-wider">
            Mostrando{' '}
            <span className="text-slate-300 tabular-nums">{filtered.length}</span>
            {' '}de{' '}
            <span className="text-slate-300 tabular-nums">{summary.total}</span>
          </span>
          <span className="terminal-tag text-xxs">
            <span className="tabular-nums text-slate-300">{summary.total}</span>
            <span className="ml-1 text-slate-500">registros</span>
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* ── LEFT SIDEBAR: Filters + Province list ───────────────── */}
        <aside className="w-full lg:w-64 xl:w-72 border-b lg:border-b-0 lg:border-r border-terminal-border bg-terminal-panel flex-shrink-0 overflow-y-auto">
          {/* -- FILTROS -------------------------------------------- */}
          <div className="terminal-panel-header flex items-center justify-between">
            <span>FILTROS</span>
            {(search || filterProvince || filterStage) && (
              <button
                onClick={() => {
                  setSearch('')
                  setFilterProvince('')
                  setFilterStage('')
                }}
                className="text-xxs text-accent hover:text-accent-bright transition-colors"
              >
                LIMPIAR
              </button>
            )}
          </div>
          <div className="terminal-panel-body space-y-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Buscar razon social..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="terminal-input"
            />

            {/* Province dropdown */}
            <select
              value={filterProvince}
              onChange={(e) => setFilterProvince(e.target.value)}
              className="terminal-input"
            >
              <option value="">Todas las provincias</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Stage dropdown */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="terminal-input"
            >
              <option value="">Todas las etapas</option>
              <option value="1">Etapa 1</option>
              <option value="2">Etapa 2</option>
              <option value="3">Etapa 3</option>
            </select>
          </div>

          {/* -- PROVINCIAS (sidebar list) -------------------------- */}
          <div className="terminal-panel-header mt-0">PROVINCIAS</div>
          <div className="terminal-panel-body">
            <ul className="space-y-0">
              {provinces.map(({ province, count }) => {
                const isActive = filterProvince === province
                return (
                  <li key={province}>
                    <button
                      onClick={() =>
                        setFilterProvince((prev) => (prev === province ? '' : province))
                      }
                      className={`w-full flex items-center justify-between px-1 py-px2 text-data font-terminal transition-colors hover:bg-accent/5 ${
                        isActive
                          ? 'text-accent bg-accent/5'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{province}</span>
                      <span className="tabular-nums text-slate-500 ml-2 flex-shrink-0">
                        {count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ───────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* ── TOP CHARTS ROW ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-terminal-border flex-shrink-0">
            {/* -- STAGE DISTRIBUTION -------------------------------- */}
            <div className="border-b md:border-b-0 md:border-r border-terminal-border">
              <div className="terminal-panel-header">
                DISTRIBUCION POR ETAPA
              </div>
              <div className="terminal-panel-body space-y-1.5">
                {stages.map(({ stage, count }) => {
                  const pct = stageTotal > 0 ? ((count / stageTotal) * 100).toFixed(0) : '0'
                  return (
                    <div key={stage} className="flex items-center gap-2 text-data font-terminal">
                      <span className={`w-16 ${stageColor(stage)} tabular-nums`}>
                        ETAPA {stage}
                      </span>
                      <div className="flex-1 h-3 bg-slate-800/50 relative overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 ${stageBarColor(stage)} opacity-80`}
                          style={{ width: `${maxStage > 0 ? (count / maxStage) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-slate-300 w-8 text-right">{count}</span>
                      <span className="tabular-nums text-slate-600 w-10 text-right">({pct}%)</span>
                    </div>
                  )
                })}

                {/* Stage legend */}
                <div className="terminal-divider-dashed" />
                <div className="flex gap-4 text-xxs text-slate-600 font-terminal">
                  <span>
                    <span className="val-positive">E1</span> Faena + desposte
                  </span>
                  <span>
                    <span className="val-warning">E2</span> Desposte
                  </span>
                  <span>
                    <span className="val-negative">E3</span> Deposito
                  </span>
                </div>
              </div>
            </div>

            {/* -- PROVINCE DISTRIBUTION ----------------------------- */}
            <div>
              <div className="terminal-panel-header">
                COBERTURA POR PROVINCIA
              </div>
              <div className="terminal-panel-body space-y-0.5 max-h-48 overflow-y-auto">
                {summary.topProvinces.map(({ province, count }) => (
                  <div
                    key={province}
                    className="flex items-center gap-2 text-data font-terminal group cursor-pointer hover:bg-accent/5 px-0.5"
                    onClick={() =>
                      setFilterProvince((prev) => (prev === province ? '' : province))
                    }
                  >
                    <span
                      className={`w-10 text-xxs tracking-wider flex-shrink-0 ${
                        filterProvince === province ? 'text-accent' : 'text-slate-500'
                      } group-hover:text-accent transition-colors`}
                    >
                      {abbr(province)}
                    </span>
                    <AsciiBar
                      value={count}
                      max={maxProvince}
                      width={18}
                      colorClass={
                        filterProvince === province
                          ? 'text-accent'
                          : 'text-slate-500 group-hover:text-accent'
                      }
                    />
                    <span className="tabular-nums text-slate-400 w-6 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MAIN TABLE ─────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <SortHeader
                    label="MATRICULA"
                    field="matricula"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="w-24"
                  />
                  <SortHeader
                    label="RAZON SOCIAL"
                    field="name"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="PROV"
                    field="province"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="w-16"
                  />
                  <SortHeader
                    label="ETAPA"
                    field="stage"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                    className="w-16 text-center"
                  />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-600">
                      No se encontraron resultados para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((f) => (
                    <tr key={f.cuit}>
                      <td className="tabular-nums text-slate-500">{f.matricula}</td>
                      <td className="text-slate-200 cell-truncate max-w-xs">{f.name}</td>
                      <td className="text-slate-500 text-xxs tracking-wider">
                        {abbr(f.province)}
                      </td>
                      <td className={`text-center tabular-nums ${stageColor(f.stage)}`}>
                        {f.stage}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER STATUS BAR ──────────────────────────────────── */}
          <div className="border-t border-terminal-border bg-terminal-panel px-4 py-1 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-xxs font-terminal text-slate-600">
              <span>
                SRC: <span className="text-slate-500">SENASA / MAGyP</span>
              </span>
              <span className="text-terminal-border">|</span>
              <span>
                TOTAL:{' '}
                <span className="text-slate-400 tabular-nums">{summary.total}</span>
              </span>
              <span className="text-terminal-border">|</span>
              <span>
                E1:{' '}
                <span className="val-positive tabular-nums">{summary.byStage['1']}</span>
                {' '}E2:{' '}
                <span className="val-warning tabular-nums">{summary.byStage['2']}</span>
                {' '}E3:{' '}
                <span className="val-negative tabular-nums">{summary.byStage['3']}</span>
              </span>
            </div>
            <div className="text-xxs font-terminal text-slate-600">
              <span className="tabular-nums text-slate-500">{filtered.length}</span>
              <span className="mx-1">/</span>
              <span className="tabular-nums">{summary.total}</span>
              <span className="ml-1">visible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
