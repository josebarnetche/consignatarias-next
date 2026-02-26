'use client'

export interface RematesFilters {
  provincia: string
  consignataria: string
  tipo: string
  categoria: string
}

interface RematesFiltersProps {
  filters: RematesFilters
  onChange: (filters: RematesFilters) => void
  provincias: string[]
  consignatarias: string[]
  tipos: string[]
  categorias: string[]
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/\s\w/g, (m) => m.toUpperCase())
}

export default function RematesFiltersBar({
  filters,
  onChange,
  provincias,
  consignatarias,
  tipos,
  categorias,
}: RematesFiltersProps) {
  function update(key: keyof RematesFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  const selectClass =
    'w-full appearance-none rounded-lg border border-stone-200 bg-white pl-3 pr-8 py-2.5 text-sm text-stone-700 shadow-sm focus:border-campo-500 focus:ring-2 focus:ring-campo-500/20 focus:outline-none transition-all cursor-pointer'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <select
            value={filters.provincia}
            onChange={(e) => update('provincia', e.target.value)}
            className={selectClass}
          >
            <option value="">Provincia</option>
            {provincias.map((p) => (
              <option key={p} value={p}>{titleCase(p)}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <select
            value={filters.consignataria}
            onChange={(e) => update('consignataria', e.target.value)}
            className={selectClass}
          >
            <option value="">Consignataria</option>
            {consignatarias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <select
            value={filters.tipo}
            onChange={(e) => update('tipo', e.target.value)}
            className={selectClass}
          >
            <option value="">Tipo de remate</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <select
            value={filters.categoria}
            onChange={(e) => update('categoria', e.target.value)}
            className={selectClass}
          >
            <option value="">Categor&iacute;a</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange({ provincia: '', consignataria: '', tipo: '', categoria: '' })}
          className="text-xs font-medium text-campo-700 hover:text-campo-900 transition-colors"
        >
          &times; Limpiar filtros
        </button>
      )}
    </div>
  )
}
