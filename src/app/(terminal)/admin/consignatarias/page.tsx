'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminPageHeader, AdminSection, AdminEmpty } from '@/components/admin/kit'
import { AdminTabsClient, AdminSearch } from '@/components/admin/kit-client'
import Badge from '@/components/ui/Badge'
import ConsignatariaEditor, {
  formFrom,
  type ConsignatariaAdmin,
  type EditForm,
} from '@/components/admin/directorio/ConsignatariaEditor'

/**
 * Editor del directorio de consignatarias.
 *
 * - Trae la tabla entera una vez (GET /api/admin/consignatarias, sin filtros) y
 *   filtra acá: así cada pestaña muestra su contador.
 * - El editor es un panel lateral (lg) / pantalla completa (mobile), no un
 *   formulario debajo de la tabla.
 * - Deep link `?slug=<canonical_slug>` (lo usa LiveActivityFeed): abre el editor
 *   de esa firma apenas carga la lista.
 */

type Tab = 'all' | 'verified' | 'unverified' | 'featured'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'verified', label: 'Verificadas' },
  { key: 'unverified', label: 'Sin verificar' },
  { key: 'featured', label: 'Destacadas' },
]

const PAGE_SIZE = 50
const nf = (n: number) => n.toLocaleString('es-AR')

function enTab(c: ConsignatariaAdmin, t: Tab): boolean {
  if (t === 'verified') return c.verified
  if (t === 'unverified') return !c.verified
  if (t === 'featured') return c.featured
  return true
}

function AdminConsignatariasInner() {
  const searchParams = useSearchParams()
  const deepLinkSlug = searchParams.get('slug')
  const [consignatarias, setConsignatarias] = useState<ConsignatariaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [deepLinkMiss, setDeepLinkMiss] = useState<string | null>(null)
  const handledDeepLink = useRef<string | null>(null)

  const fetchConsignatarias = useCallback(async () => {
    setLoadError('')
    try {
      const res = await fetch('/api/admin/consignatarias')
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setLoadError(data.error || 'No se pudo traer el directorio')
        return
      }
      setConsignatarias(data.consignatarias || [])
    } catch {
      setLoadError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConsignatarias()
  }, [fetchConsignatarias])

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: consignatarias.length, verified: 0, unverified: 0, featured: 0 }
    for (const x of consignatarias) {
      if (x.verified) c.verified++
      else c.unverified++
      if (x.featured) c.featured++
    }
    return c
  }, [consignatarias])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return consignatarias.filter((c) => {
      if (!enTab(c, activeTab)) return false
      if (!q) return true
      return (
        c.display_name.toLowerCase().includes(q) ||
        c.canonical_slug.toLowerCase().includes(q) ||
        (c.province || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q) ||
        (c.cuit || '').toLowerCase().includes(q)
      )
    })
  }, [consignatarias, activeTab, search])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const selectedData = selected ? consignatarias.find((c) => c.canonical_slug === selected) ?? null : null

  const dirty = useMemo(() => {
    if (!selectedData) return false
    const base = formFrom(selectedData)
    return Object.keys(base).some((k) => (base[k] ?? '') !== (editForm[k] ?? ''))
  }, [selectedData, editForm])

  const openEditor = useCallback(
    (slug: string) => {
      const c = consignatarias.find((x) => x.canonical_slug === slug)
      if (!c) return
      setSelected(slug)
      setSaveError('')
      setSaveSuccess(false)
      setEditForm(formFrom(c))
    },
    [consignatarias],
  )

  const closeEditor = useCallback(() => setSelected(null), [])

  function handleSelect(slug: string) {
    if (selected === slug) {
      setSelected(null)
      return
    }
    openEditor(slug)
  }

  // Deep link: ?slug=<canonical_slug> → abre el editor de esa firma. Una vez por
  // slug, recién cuando la lista ya cargó; salta a la página donde está la fila.
  useEffect(() => {
    if (!deepLinkSlug || loading) return
    if (handledDeepLink.current === deepLinkSlug) return
    handledDeepLink.current = deepLinkSlug
    const idx = consignatarias.findIndex((c) => c.canonical_slug === deepLinkSlug)
    if (idx >= 0) {
      setDeepLinkMiss(null)
      setActiveTab('all')
      setSearch('')
      setPage(Math.floor(idx / PAGE_SIZE))
      openEditor(deepLinkSlug)
    } else {
      setDeepLinkMiss(deepLinkSlug)
    }
  }, [deepLinkSlug, loading, consignatarias, openEditor])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/admin/consignatarias/${selected}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Error al guardar')
        return
      }
      const { consignataria } = (await res.json()) as { consignataria: ConsignatariaAdmin }
      setConsignatarias((prev) => prev.map((c) => (c.canonical_slug === selected ? consignataria : c)))
      setEditForm(formFrom(consignataria))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setSaveError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Directorio de consignatarias"
        meta={loading ? undefined : `${nf(filtered.length)} de ${nf(consignatarias.length)}`}
        description="Datos de contacto, verificación y destaque de cada firma. Tocá una fila para editarla."
      />

      {deepLinkMiss && (
        <div role="alert" className="terminal-panel px-panel py-2 text-xxs font-terminal text-zinc-400">
          <span className="text-warning">⚠</span> No se encontró la consignataria{' '}
          <span className="text-ink">{deepLinkMiss}</span> en el directorio.
        </div>
      )}
      {loadError && (
        <div role="alert" className="terminal-panel px-panel py-2 text-xxs font-terminal text-negative">
          {loadError}
        </div>
      )}

      <AdminTabsClient
        tabs={TABS.map((t) => ({ ...t, count: loading ? null : counts[t.key] }))}
        active={activeTab}
        onSelect={(k) => {
          setActiveTab(k as Tab)
          setPage(0)
        }}
        trailing={
          <AdminSearch
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(0)
            }}
            placeholder="Nombre, slug, provincia, CUIT"
          />
        }
      />

      <div className={`gap-px lg:grid ${selectedData ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
        <AdminSection flush>
          {loading ? (
            <AdminEmpty>Cargando…</AdminEmpty>
          ) : filtered.length === 0 ? (
            <AdminEmpty>{search ? `Nada coincide con "${search}".` : 'No hay firmas en esta pestaña.'}</AdminEmpty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="terminal-table">
                  <thead>
                    <tr>
                      <th>Firma</th>
                      <th className="hidden sm:table-cell">Provincia</th>
                      <th className="hidden xl:table-cell">CUIT</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c) => {
                      const activa = selected === c.canonical_slug
                      return (
                        <tr
                          key={c.canonical_slug}
                          onClick={() => handleSelect(c.canonical_slug)}
                          className={`cursor-pointer ${activa ? 'bg-accent/5 shadow-[inset_2px_0_0_0_rgb(var(--accent))]' : ''}`}
                          aria-selected={activa}
                        >
                          <td className="max-w-[16rem]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelect(c.canonical_slug)
                              }}
                              className="block w-full truncate text-left text-ink hover:text-accent"
                              aria-expanded={activa}
                            >
                              {c.display_name}
                            </button>
                            <span className="block truncate text-xxs text-zinc-500">
                              {c.canonical_slug}
                              <span className="sm:hidden">{c.province ? ` · ${c.province}` : ''}</span>
                            </span>
                          </td>
                          <td className="hidden sm:table-cell text-zinc-500">
                            {[c.location, c.province].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="hidden xl:table-cell text-zinc-500 tabular-nums">{c.cuit || '—'}</td>
                          <td>
                            <span className="flex flex-wrap gap-1">
                              {c.verified ? <Badge tone="positive">Verificada</Badge> : <Badge>Sin verificar</Badge>}
                              {c.featured && <Badge tone="warning">Destacada</Badge>}
                              {c.claimed_by_email && <Badge tone="accent">Reclamada</Badge>}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <nav
                  aria-label="Paginación"
                  className="px-panel py-2 border-t border-terminal-border flex items-center justify-between gap-2 text-xxs font-terminal text-zinc-500"
                >
                  <span className="tabular-nums">
                    {nf(safePage * PAGE_SIZE + 1)}–{nf(Math.min(filtered.length, (safePage + 1) * PAGE_SIZE))} de{' '}
                    {nf(filtered.length)}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="terminal-btn disabled:opacity-40"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      ← Anterior
                    </button>
                    <button
                      type="button"
                      className="terminal-btn disabled:opacity-40"
                      disabled={safePage >= pages - 1}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Siguiente →
                    </button>
                  </span>
                </nav>
              )}
            </>
          )}
        </AdminSection>

        {selectedData && (
          <ConsignatariaEditor
            data={selectedData}
            form={editForm}
            setForm={setEditForm}
            dirty={dirty}
            saving={saving}
            error={saveError}
            success={saveSuccess}
            onSave={handleSave}
            onClose={closeEditor}
          />
        )}
      </div>
    </>
  )
}

export default function AdminConsignatariasPage() {
  return (
    <Suspense fallback={null}>
      <AdminConsignatariasInner />
    </Suspense>
  )
}
