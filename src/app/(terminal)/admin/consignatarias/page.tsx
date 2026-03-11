'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Consignataria {
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

type Tab = 'all' | 'verified' | 'unverified' | 'featured'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'verified', label: 'Verificadas' },
  { key: 'unverified', label: 'Sin verificar' },
  { key: 'featured', label: 'Destacadas' },
]

const EDITABLE_FIELDS: { key: keyof Consignataria; label: string; type?: string }[] = [
  { key: 'display_name', label: 'Nombre' },
  { key: 'name', label: 'Razón social' },
  { key: 'province', label: 'Provincia' },
  { key: 'location', label: 'Localidad' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'category', label: 'Categoría' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Sitio web', type: 'url' },
]

export default function AdminConsignatariasPage() {
  const [consignatarias, setConsignatarias] = useState<Consignataria[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | boolean | null>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)

  const fetchConsignatarias = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab === 'verified') params.set('verified', 'true')
      if (activeTab === 'unverified') params.set('verified', 'false')
      const res = await fetch(`/api/admin/consignatarias?${params}`)
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      setConsignatarias(data.consignatarias || [])
    } catch {
      setSaveError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchConsignatarias()
  }, [fetchConsignatarias])

  // Client-side filter for featured tab + search
  const filtered = consignatarias.filter(c => {
    if (activeTab === 'featured' && !c.featured) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.display_name.toLowerCase().includes(q) ||
      c.canonical_slug.toLowerCase().includes(q) ||
      (c.province || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    )
  })

  function handleSelect(slug: string) {
    if (selected === slug) {
      setSelected(null)
      return
    }
    const c = consignatarias.find(x => x.canonical_slug === slug)
    if (!c) return
    setSelected(slug)
    setSaveError('')
    setSaveSuccess(false)
    setEditForm({
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
    })
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

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
        const data = await res.json()
        setSaveError(data.error || 'Error al guardar')
        return
      }
      const { consignataria } = await res.json()
      setConsignatarias(prev =>
        prev.map(c => c.canonical_slug === selected ? consignataria : c)
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setSaveError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const selectedData = selected ? consignatarias.find(c => c.canonical_slug === selected) : null

  return (
    <div className="space-y-0">
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">CONSIGNATARIAS</span>
          <span className="text-xxs text-zinc-500 font-terminal">{filtered.length} de {consignatarias.length}</span>
        </div>

        {/* Search + Tabs */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-4 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelected(null) }}
              className={`text-xxs font-terminal uppercase tracking-wider transition-colors ${
                activeTab === tab.key ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="terminal-input text-xxs w-40 sm:w-52 py-1"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="px-panel py-8 text-center">
            <span className="text-zinc-500 text-data font-terminal">Cargando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-panel py-8 text-center">
            <span className="text-zinc-500 text-data font-terminal">Sin resultados</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Nombre</th>
                  <th className="hidden sm:table-cell">Provincia</th>
                  <th className="hidden md:table-cell">CUIT</th>
                  <th className="w-16 text-center">Verif.</th>
                  <th className="w-16 text-center">Dest.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.canonical_slug}
                    onClick={() => handleSelect(c.canonical_slug)}
                    className={`cursor-pointer transition-colors hover:bg-accent/5 ${
                      selected === c.canonical_slug
                        ? 'border-l-2 border-l-accent bg-accent/5'
                        : ''
                    }`}
                  >
                    <td className="text-zinc-500">{i + 1}</td>
                    <td className="text-zinc-200 max-w-[200px] truncate">{c.display_name}</td>
                    <td className="hidden sm:table-cell text-zinc-500">{c.province || '—'}</td>
                    <td className="hidden md:table-cell text-zinc-500 tabular-nums">{c.cuit || '—'}</td>
                    <td className="text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${c.verified ? 'bg-positive' : 'bg-zinc-700'}`} />
                    </td>
                    <td className="text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${c.featured ? 'bg-warning' : 'bg-zinc-700'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Panel */}
      {selected && selectedData && (
        <div ref={editRef} className="terminal-panel mt-px">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">EDITAR — {selectedData.display_name}</span>
            <button
              onClick={() => setSelected(null)}
              className="text-xxs font-terminal text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              CERRAR
            </button>
          </div>

          {/* Read-only info */}
          <div className="border-b border-terminal-border px-panel py-2 flex items-center gap-6 flex-wrap">
            <span className="text-xxs font-terminal text-zinc-500">
              slug: <span className="text-zinc-400">{selectedData.canonical_slug}</span>
            </span>
            {selectedData.claimed_by_email && (
              <span className="text-xxs font-terminal text-zinc-500">
                reclamada: <span className="text-zinc-400">{selectedData.claimed_by_email}</span>
              </span>
            )}
            <span className="text-xxs font-terminal text-zinc-500">
              actualizado: <span className="text-zinc-400">{new Date(selectedData.updated_at).toLocaleDateString('es-AR')}</span>
            </span>
          </div>

          {/* Form */}
          <div className="px-panel py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EDITABLE_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider block mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    value={(editForm[field.key] as string) ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="terminal-input w-full text-data"
                  />
                </div>
              ))}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.verified as boolean ?? false}
                  onChange={e => setEditForm(f => ({ ...f, verified: e.target.checked }))}
                  className="sr-only peer"
                />
                <span className="w-4 h-4 border border-terminal-border peer-checked:bg-positive/20 peer-checked:border-positive flex items-center justify-center transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  {editForm.verified && <span className="text-positive text-xxs">&#10003;</span>}
                </span>
                <span className="text-data font-terminal text-zinc-400">Verificada</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.featured as boolean ?? false}
                  onChange={e => setEditForm(f => ({ ...f, featured: e.target.checked }))}
                  className="sr-only peer"
                />
                <span className="w-4 h-4 border border-terminal-border peer-checked:bg-warning/20 peer-checked:border-warning flex items-center justify-center transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  {editForm.featured && <span className="text-warning text-xxs">&#10003;</span>}
                </span>
                <span className="text-data font-terminal text-zinc-400">Destacada</span>
              </label>
            </div>

            {/* Error / Success */}
            {saveError && (
              <div className="mt-3">
                <span className="text-negative text-xxs font-terminal">{saveError}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="mt-3">
                <span className="text-positive text-xxs font-terminal">Guardado correctamente</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-1.5 border border-terminal-border text-zinc-500 text-xxs font-terminal uppercase tracking-wider hover:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
