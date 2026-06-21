'use client'

/**
 * Tabs — tira de pestañas headless para el bloque unificado de REMATES.
 * Controlada: el estado vive en el componente padre (para que la barra sticky y
 * los anclas del hero puedan deep-linkear una pestaña). Solo renderiza los
 * triggers; los paneles los renderiza el padre (así el panel default queda en el
 * HTML inicial para SEO). Minimal: jerarquía por tipografía, no por cajas.
 */
export interface TabDef {
  id: string
  label: string
  count?: number
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  idPrefix = 'tab',
}: {
  tabs: TabDef[]
  activeId: string
  onChange: (id: string) => void
  idPrefix?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Vistas de remates"
      className="terminal-panel-header flex items-center gap-4 overflow-x-auto"
    >
      {tabs.map((t) => {
        const active = t.id === activeId
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${idPrefix}-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`shrink-0 -mb-px border-b py-1 text-xxs font-terminal uppercase tracking-widest transition-colors ${
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className="ml-1.5 tabular-nums text-zinc-600">{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
