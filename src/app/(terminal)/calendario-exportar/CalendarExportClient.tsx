'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import HeroNumber from '@/components/pro/HeroNumber'
import MultiSelectList from '@/components/calendario/MultiSelectList'
import {
  buildLocalidadTree,
  matchesSelection,
  buildIcal,
} from '@/components/calendario/multiSelectUtils'

const auctions = rematesData as Auction[]

const PROVINCIAS = [
  'BUENOS AIRES', 'SANTA FE', 'CORDOBA', 'CHACO', 'SAN LUIS',
  'ENTRE RIOS', 'CORRIENTES', 'LA PAMPA', 'MISIONES', 'FORMOSA',
]

const TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'invernada', label: 'Invernada' },
  { value: 'cria', label: 'Cría' },
  { value: 'especial', label: 'Especial' },
  { value: 'reproductores', label: 'Reproductores' },
]

const PRE_FILTER_SELECT =
  'w-full px-3 py-2 bg-zinc-900 border border-terminal-border rounded text-data font-terminal text-zinc-200 focus:border-accent focus:outline-none'

export default function CalendarExportClient() {
  const [email, setEmail] = useState('')
  const [provincia, setProvincia] = useState('')
  const [tipo, setTipo] = useState('')
  const [dias, setDias] = useState('30')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'idle' | 'ready'>('idle')

  // ---- Real, date-filtered universe (pre-filter narrows the selectable list) ----
  const filteredAuctions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const max = new Date()
    max.setDate(max.getDate() + parseInt(dias, 10))
    const maxStr = max.toISOString().slice(0, 10)
    return auctions.filter((a) => {
      if (a.date < today || a.date > maxStr) return false
      if (provincia && a.province !== provincia) return false
      if (tipo && a.type !== tipo) return false
      return true
    })
  }, [provincia, tipo, dias])

  const groups = useMemo(() => buildLocalidadTree(filteredAuctions), [filteredAuctions])
  const totalLocalidades = useMemo(
    () => groups.reduce((n, g) => n + g.localidades.length, 0),
    [groups]
  )

  // Number of real remates covered by the current selection.
  const selectedRemates = useMemo(
    () => filteredAuctions.filter((a) => matchesSelection(a, selected)).length,
    [filteredAuctions, selected]
  )

  // ---- Selection handlers ----
  function toggleLocalidad(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleProvince(province: string, select: boolean) {
    const group = groups.find((g) => g.province === province)
    if (!group) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const loc of group.localidades) {
        if (select) next.add(loc.id)
        else next.delete(loc.id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  // After the pre-filter narrows the universe, drop any selected ids that no
  // longer exist in the current groups (keeps the counters honest).
  useEffect(() => {
    const valid = new Set(groups.flatMap((g) => g.localidades.map((l) => l.id)))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [groups])

  // ---- Export (client-side .ics over ALL selected localidades) ----
  async function handleExport() {
    if (selected.size === 0) return

    if (email.trim()) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'calendar-export' }),
        })
      } catch {
        // best-effort
      }
    }

    const chosen = filteredAuctions
      .filter((a) => matchesSelection(a, selected))
      .sort((a, b) => a.date.localeCompare(b.date))

    const ics = buildIcal(chosen)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'remates-ganaderos.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setStatus('ready')
  }

  const provinciasSeleccionadas = useMemo(() => {
    const set = new Set<string>()
    for (const g of groups) {
      if (g.localidades.some((l) => selected.has(l.id))) set.add(g.province)
    }
    return set.size
  }, [groups, selected])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/remates"
          className="mb-4 inline-block text-xxs font-terminal text-accent hover:text-accent-bright"
        >
          ← Volver a remates
        </Link>
        <h1 className="mb-2 text-2xl font-terminal text-zinc-100">Exportar Calendario de Remates</h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Elegí las localidades que te interesan y descargá un único archivo .ics con todos sus
          remates. Sincronizá con Google Calendar, Apple Calendar, Outlook o cualquier app.
        </p>
      </div>

      {status === 'ready' ? (
        <div className="terminal-panel">
          <div className="terminal-panel-header" style={{ color: '#34d399' }}>
            ✓ Calendario descargado
          </div>
          <div className="space-y-4 px-panel py-6 text-center">
            <p className="text-data text-zinc-300">
              Se descargó <span className="font-terminal tabular-nums text-zinc-100">{selectedRemates}</span>{' '}
              {selectedRemates === 1 ? 'remate' : 'remates'} en{' '}
              <span className="font-terminal tabular-nums text-zinc-100">{selected.size}</span>{' '}
              {selected.size === 1 ? 'localidad' : 'localidades'}. Abrí{' '}
              <span className="text-zinc-200">remates-ganaderos.ics</span> con tu app de calendario para
              importarlo.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="text-sm text-accent transition-colors hover:text-accent-bright"
            >
              ← Ajustar selección
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Hero: localidad universe (real data) */}
          <div className="terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.4)' }}>
            <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
              Tu selección
            </div>
            <div className="grid grid-cols-2 gap-4 px-panel py-4">
              <HeroNumber
                label="Remates seleccionados"
                value={selectedRemates.toLocaleString('es-AR')}
                tone={selectedRemates > 0 ? 'accent' : 'neutral'}
                sub={
                  selected.size > 0
                    ? `${selected.size} ${selected.size === 1 ? 'localidad' : 'localidades'} · ${provinciasSeleccionadas} ${provinciasSeleccionadas === 1 ? 'provincia' : 'provincias'}`
                    : 'Tildá localidades abajo'
                }
              />
              <HeroNumber
                label="Disponibles en el filtro"
                value={filteredAuctions.length.toLocaleString('es-AR')}
                sub={`${totalLocalidades} ${totalLocalidades === 1 ? 'localidad' : 'localidades'} · próx. ${dias} días`}
              />
            </div>
          </div>

          {/* Pre-filtros */}
          <div className="terminal-panel">
            <div className="terminal-panel-header">Acotar (opcional)</div>
            <div className="grid grid-cols-1 gap-3 px-panel py-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xxs uppercase tracking-wider text-zinc-500">
                  Provincia
                </label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className={PRE_FILTER_SELECT}
                >
                  <option value="">Todas</option>
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xxs uppercase tracking-wider text-zinc-500">
                  Tipo
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className={PRE_FILTER_SELECT}
                >
                  <option value="">Todos</option>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xxs uppercase tracking-wider text-zinc-500">
                  Período
                </label>
                <select
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className={PRE_FILTER_SELECT}
                >
                  <option value="7">Próximos 7 días</option>
                  <option value="14">Próximos 14 días</option>
                  <option value="30">Próximos 30 días</option>
                  <option value="60">Próximos 60 días</option>
                  <option value="90">Próximos 90 días</option>
                </select>
              </div>
            </div>
          </div>

          {/* Multi-select por localidad */}
          <div className="terminal-panel">
            <div className="terminal-panel-header flex items-center justify-between">
              <span>Localidades</span>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Limpiar
                </button>
              )}
            </div>
            <MultiSelectList
              groups={groups}
              selected={selected}
              onToggleLocalidad={toggleLocalidad}
              onToggleProvince={toggleProvince}
              totalCount={totalLocalidades}
            />
          </div>

          {/* Email (opcional) */}
          <div className="terminal-panel">
            <div className="terminal-panel-header">Tu email (opcional)</div>
            <div className="px-panel py-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded border border-terminal-border bg-zinc-900 px-3 py-2.5 text-data font-terminal text-zinc-200 placeholder-zinc-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-2 text-xxs text-zinc-500">
                Te avisamos cuando agreguemos nuevas funcionalidades al calendario.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="terminal-panel mt-6">
        <div className="terminal-panel-header">Cómo agregar a tu calendario</div>
        <div className="space-y-4 px-panel py-4 text-sm text-zinc-400">
          <div>
            <p className="mb-1 font-medium text-zinc-200">Google Calendar</p>
            <p>Configuración → Importar → Seleccioná el archivo .ics descargado</p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="mb-1 font-medium text-zinc-200">Apple Calendar</p>
            <p>Archivo → Importar → Elegí remates-ganaderos.ics</p>
          </div>
          <div className="border-t border-terminal-border pt-4">
            <p className="mb-1 font-medium text-zinc-200">Outlook</p>
            <p>Agregar calendario → Cargar desde archivo → Seleccioná el .ics</p>
          </div>
        </div>
      </div>

      {/* Sticky selection bar (única acción primaria de la vista) */}
      {status !== 'ready' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-terminal-border bg-terminal-panel/95 backdrop-blur supports-[backdrop-filter]:bg-terminal-panel/80">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-label font-terminal tabular-nums text-zinc-100">
                {selectedRemates.toLocaleString('es-AR')}{' '}
                <span className="text-zinc-400">{selectedRemates === 1 ? 'remate' : 'remates'}</span>
              </div>
              <div className="truncate text-xxs text-zinc-500">
                {selected.size > 0
                  ? `${selected.size} ${selected.size === 1 ? 'localidad seleccionada' : 'localidades seleccionadas'}`
                  : 'Ninguna localidad seleccionada'}
              </div>
            </div>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={selected.size === 0}
              className="terminal-btn-primary disabled:cursor-not-allowed disabled:border-terminal-border disabled:text-zinc-600 disabled:hover:bg-terminal-panel"
            >
              Exportar selección (.ics)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
