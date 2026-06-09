'use client'

import type { ProvinceGroup } from './multiSelectUtils'

/** Terminal-styled checkbox: square w-4 h-4, accent when checked, dash when
 * indeterminate. No native browser blue. The clickable hit-area (≥40px) lives in
 * the parent <label>/<button>. */
function TerminalCheckbox({
  checked,
  indeterminate = false,
}: {
  checked: boolean
  indeterminate?: boolean
}) {
  const on = checked || indeterminate
  return (
    <span
      aria-hidden
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
        on ? 'bg-accent border-accent' : 'border-terminal-border bg-terminal-bg'
      }`}
    >
      {indeterminate ? (
        <span className="block h-0.5 w-2 rounded-full bg-zinc-950" />
      ) : checked ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-zinc-950" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6.2l2.6 2.6L10 3.2" />
        </svg>
      ) : null}
    </span>
  )
}

interface MultiSelectListProps {
  groups: ProvinceGroup[]
  /** Currently-selected localidad ids. */
  selected: Set<string>
  /** Toggle a single localidad. */
  onToggleLocalidad: (id: string) => void
  /** Select/deselect every localidad in a province (select=true marks all). */
  onToggleProvince: (province: string, select: boolean) => void
  totalCount: number
}

export default function MultiSelectList({
  groups,
  selected,
  onToggleLocalidad,
  onToggleProvince,
  totalCount,
}: MultiSelectListProps) {
  const allSelected = totalCount > 0 && selected.size === totalCount
  const someSelected = selected.size > 0 && !allSelected

  function handleToggleAll() {
    // Fully-on → clear everything; otherwise select everything.
    const select = !allSelected
    for (const g of groups) onToggleProvince(g.province, select)
  }

  if (groups.length === 0) {
    return (
      <div className="px-panel py-cell">
        <p className="text-data text-zinc-500">
          No hay remates programados para este filtro. Ampliá el período o cambiá provincia/tipo.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Seleccionar todos */}
      <button
        type="button"
        onClick={handleToggleAll}
        className="flex w-full items-center gap-3 border-b border-terminal-border px-panel py-2.5 text-left transition-colors hover:bg-accent/5"
      >
        <TerminalCheckbox checked={allSelected} indeterminate={someSelected} />
        <span className="text-label font-terminal uppercase tracking-wider text-zinc-200">
          Seleccionar todos
        </span>
        <span className="ml-auto text-xxs font-terminal tabular-nums text-zinc-500">{totalCount}</span>
      </button>

      <div className="max-h-[460px] overflow-y-auto">
        {groups.map((group) => (
          <ProvinceBlock
            key={group.province}
            group={group}
            selected={selected}
            onToggleLocalidad={onToggleLocalidad}
            onToggleProvince={onToggleProvince}
          />
        ))}
      </div>
    </div>
  )
}

function ProvinceBlock({
  group,
  selected,
  onToggleLocalidad,
  onToggleProvince,
}: {
  group: ProvinceGroup
  selected: Set<string>
  onToggleLocalidad: (id: string) => void
  onToggleProvince: (province: string, select: boolean) => void
}) {
  const ids = group.localidades.map((l) => l.id)
  const selectedInGroup = ids.filter((id) => selected.has(id)).length
  const allInGroup = selectedInGroup === ids.length && ids.length > 0
  const someInGroup = selectedInGroup > 0 && !allInGroup

  return (
    <div className="border-b border-terminal-border last:border-b-0">
      {/* Province header */}
      <button
        type="button"
        onClick={() => onToggleProvince(group.province, !allInGroup)}
        className="flex w-full items-center gap-3 bg-terminal-panel px-panel py-2.5 text-left transition-colors hover:bg-accent/5"
      >
        <TerminalCheckbox checked={allInGroup} indeterminate={someInGroup} />
        <span className="text-label font-heading uppercase tracking-widest text-zinc-300">
          {group.province}
        </span>
        <span className="ml-auto text-xxs font-terminal tabular-nums text-zinc-500">
          {selectedInGroup > 0 ? `${selectedInGroup}/${ids.length}` : ids.length}
        </span>
      </button>

      {/* Localidades */}
      <ul>
        {group.localidades.map((loc) => {
          const isChecked = selected.has(loc.id)
          return (
            <li key={loc.id}>
              <button
                type="button"
                onClick={() => onToggleLocalidad(loc.id)}
                aria-pressed={isChecked}
                className={`flex w-full items-center gap-3 py-2 pl-9 pr-panel text-left transition-colors hover:bg-accent/5 ${
                  isChecked ? 'bg-accent/[0.06]' : ''
                }`}
              >
                <TerminalCheckbox checked={isChecked} />
                <span className={`text-data ${isChecked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {loc.label}
                </span>
                <span className="ml-auto text-xxs font-terminal tabular-nums text-zinc-600">
                  {loc.count}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
