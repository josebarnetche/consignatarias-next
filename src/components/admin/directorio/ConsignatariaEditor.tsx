'use client'

import { useEffect, useRef } from 'react'
import Badge from '@/components/ui/Badge'

/**
 * Panel lateral del editor del directorio (/admin/consignatarias).
 * En lg es una columna fija a la derecha del listado; en mobile ocupa toda la
 * pantalla por encima del listado (se cierra con "Cerrar" o Esc).
 * No hace fetch: la página le pasa el formulario y el `onSave`.
 */

export interface ConsignatariaAdmin {
  id: string
  canonical_slug: string
  display_name: string
  name: string | null
  cuit: string | null
  matricula: string | null
  province: string | null
  location: string | null
  category: string | null
  website: string | null
  phone: string | null
  email: string | null
  verified: boolean
  featured: boolean
  claimed_at: string | null
  claimed_by_email: string | null
  updated_at: string
}

export type EditForm = Record<string, string | boolean | null>

export const EDITABLE_FIELDS: { key: keyof ConsignatariaAdmin; label: string; type?: string; wide?: boolean }[] = [
  { key: 'display_name', label: 'Nombre', wide: true },
  { key: 'name', label: 'Razón social', wide: true },
  { key: 'province', label: 'Provincia' },
  { key: 'location', label: 'Localidad' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'category', label: 'Categoría' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Email', type: 'email', wide: true },
  { key: 'website', label: 'Sitio web', type: 'url', wide: true },
]

/** Formulario inicial a partir de la fila (mismo shape que el PATCH de siempre). */
export function formFrom(c: ConsignatariaAdmin): EditForm {
  return {
    display_name: c.display_name,
    name: c.name ?? '',
    province: c.province ?? '',
    location: c.location ?? '',
    cuit: c.cuit ?? '',
    matricula: c.matricula ?? '',
    category: c.category ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    website: c.website ?? '',
    verified: c.verified,
    featured: c.featured,
  }
}

export default function ConsignatariaEditor({
  data,
  form,
  setForm,
  dirty,
  saving,
  error,
  success,
  onSave,
  onClose,
}: {
  data: ConsignatariaAdmin
  form: EditForm
  setForm: (updater: (f: EditForm) => EditForm) => void
  dirty: boolean
  saving: boolean
  error: string
  success: boolean
  onSave: () => void
  onClose: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [data.canonical_slug])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside
      aria-label={`Editar ${data.display_name}`}
      className="fixed inset-0 z-40 overflow-y-auto bg-terminal-bg p-2 lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:max-h-[calc(100vh-2rem)] lg:self-start lg:bg-transparent lg:p-0"
    >
      <form
        className="terminal-panel"
        onSubmit={(e) => {
          e.preventDefault()
          if (!saving && dirty) onSave()
        }}
      >
        <div className="terminal-panel-header flex items-center justify-between gap-3">
          <span>Editar firma</span>
          <button type="button" onClick={onClose} className="normal-case tracking-normal text-xxs text-zinc-500 hover:text-accent">
            Cerrar ✕
          </button>
        </div>

        <div className="px-panel py-3 border-b border-terminal-border">
          <h2 ref={headingRef} tabIndex={-1} className="text-data font-terminal text-ink outline-none">
            {data.display_name}
          </h2>
          <dl className="mt-1 space-y-0.5 text-xxs font-terminal text-zinc-500">
            <div>
              slug <span className="text-zinc-300">{data.canonical_slug}</span>{' '}
              <a
                href={`/consignatarias/${data.canonical_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent"
              >
                ver perfil ↗
              </a>
            </div>
            {data.claimed_by_email && (
              <div>
                reclamada por <span className="text-zinc-300">{data.claimed_by_email}</span>
                {data.claimed_at && <> el {new Date(data.claimed_at).toLocaleDateString('es-AR')}</>}
              </div>
            )}
            <div>
              actualizada el <span className="text-zinc-300">{new Date(data.updated_at).toLocaleDateString('es-AR')}</span>
            </div>
          </dl>
        </div>

        {/* Estado: lo que más se toca, arriba y explícito */}
        <div className="px-panel py-3 border-b border-terminal-border space-y-2">
          <Toggle
            label="Verificada"
            hint="Los datos de la firma están confirmados."
            checked={Boolean(form.verified)}
            tone="positive"
            onChange={(v) => setForm((f) => ({ ...f, verified: v }))}
          />
          <Toggle
            label="Destacada"
            hint="Destaque manual: la firma queda PRO sin suscripción ni vencimiento."
            checked={Boolean(form.featured)}
            tone="warning"
            onChange={(v) => setForm((f) => ({ ...f, featured: v }))}
          />
        </div>

        <div className="px-panel py-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {EDITABLE_FIELDS.map((field) => (
            <label key={field.key} className={`block min-w-0 ${field.wide ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
              <span className="mb-1 block text-xxs font-terminal text-zinc-500">{field.label}</span>
              <input
                type={field.type || 'text'}
                value={(form[field.key] as string) ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="terminal-input text-data"
              />
            </label>
          ))}
        </div>

        <div className="px-panel py-2.5 border-t border-terminal-border flex flex-wrap items-center gap-2">
          <button type="submit" disabled={saving || !dirty} className="terminal-btn-primary disabled:opacity-40">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose} className="terminal-btn">
            Cancelar
          </button>
          <span className="ml-auto text-xxs font-terminal" aria-live="polite">
            {error ? (
              <span className="text-negative">{error}</span>
            ) : success ? (
              <span className="text-positive">Guardado</span>
            ) : dirty ? (
              <span className="text-warning">Cambios sin guardar</span>
            ) : null}
          </span>
        </div>
      </form>
    </aside>
  )
}

function Toggle({
  label,
  hint,
  checked,
  tone,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  tone: 'positive' | 'warning'
  onChange: (v: boolean) => void
}) {
  const on = tone === 'positive' ? 'bg-positive border-positive' : 'bg-warning border-warning'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 text-left"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked ? on : 'bg-zinc-800 border-terminal-border'
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-terminal-panel shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-data font-terminal text-ink">
          {label}
          <Badge tone={checked ? tone : 'neutral'}>{checked ? 'Sí' : 'No'}</Badge>
        </span>
        <span className="block text-xxs font-terminal text-zinc-500">{hint}</span>
      </span>
    </button>
  )
}
