'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { tabClass, type AdminTab } from './kit'

const nf = (n: number) => n.toLocaleString('es-AR')

/** Pestañas manejadas por estado local (para páginas cliente). */
export function AdminTabsClient({
  tabs,
  active,
  onSelect,
  trailing,
}: {
  tabs: AdminTab[]
  active: string
  onSelect: (key: string) => void
  /** Algo a la derecha de las pestañas (buscador, conteo). */
  trailing?: ReactNode
}) {
  return (
    <div className="terminal-panel px-panel flex flex-wrap items-center gap-x-4 border-b border-terminal-border">
      <div role="tablist" className="flex flex-wrap gap-x-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            onClick={() => onSelect(t.key)}
            className={tabClass(t.key === active)}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 tabular-nums text-zinc-500">{nf(t.count)}</span>}
          </button>
        ))}
      </div>
      {trailing && <div className="ml-auto py-1.5">{trailing}</div>}
    </div>
  )
}

/** Buscador chico, con atajo "/" para enfocarlo. */
export function AdminSearch({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key === '/' && t && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <input
      ref={ref}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`${placeholder}  /`}
      className="terminal-input w-56 max-w-full py-1 text-xxs"
      aria-label={placeholder}
    />
  )
}

/**
 * Diálogo para pedir un motivo antes de una acción (rechazar). Reemplaza los
 * `prompt()`/`alert()` del navegador: se puede cancelar con Esc y valida el
 * largo mínimo en el lugar.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  minLength = 0,
  placeholder = 'Motivo',
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  minLength?: number
  placeholder?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setReason('')
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  const tooShort = reason.trim().length < minLength

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="terminal-panel w-[min(32rem,calc(100vw-2rem))] p-0 text-zinc-300 backdrop:bg-black/60"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          if (!tooShort && !busy) onConfirm(reason.trim())
        }}
      >
        <div className="terminal-panel-header">{title}</div>
        <div className="terminal-panel-body space-y-2">
          {description && <div className="text-xxs text-zinc-500 font-terminal">{description}</div>}
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            className="terminal-input w-full text-data"
          />
          {minLength > 0 && (
            <div className="text-xxs text-zinc-500 font-terminal tabular-nums">
              {tooShort ? `Mínimo ${minLength} caracteres` : ' '}
            </div>
          )}
        </div>
        <div className="px-panel py-2 border-t border-terminal-border flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="terminal-btn">
            Cancelar
          </button>
          <button type="submit" disabled={tooShort || busy} className="terminal-btn-primary disabled:opacity-40">
            {busy ? 'Guardando…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
