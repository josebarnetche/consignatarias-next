'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Download, X } from 'lucide-react'
import Stat from '@/components/ui/Stat'
import { AdminPageHeader, AdminSection, KpiRow, KpiCell, AdminEmpty } from '@/components/admin/kit'
import { AdminTabsClient, AdminSearch } from '@/components/admin/kit-client'
import { HUMAN_KINDS, type ActivityRow } from '@/lib/leads/activity'
import LeadRow from '@/components/admin/leads/LeadRow'
import LeadDetail from '@/components/admin/leads/LeadDetail'
import Ritmo from '@/components/admin/leads/Ritmo'
import { PorOrigen, Cruces } from '@/components/admin/leads/LeadsInsights'
import { exportLeadsCsv } from '@/components/admin/leads/csv'
import {
  STATUS_META,
  TABS,
  ars,
  computeKpis,
  familyLabel,
  inTab,
  matchesSearch,
  nf,
  pareceTest,
  ritmo14,
  sourceFamily,
  tabFor,
  FEE_OPEN,
  type Lead,
  type TabKey,
} from '@/components/admin/leads/model'

/**
 * /admin/leads — bandeja de trabajo de los leads de productores.
 *
 * Pensada para mover leads rápido: una fila por lead, pestañas por etapa (por
 * defecto "Sin trabajar"), detalle al costado (abajo de la fila en el celular) con
 * contacto, estado, ruteo, fee, notas y bitácora. Atajos: j/k para moverse, Esc
 * para cerrar, / para buscar. Deep link: /admin/leads?lead=<id> (lo usa la portada
 * "Hoy", el digest y los mails — no cambiar la URL).
 *
 * Contrato de la API (no cambia): GET /api/admin/leads → { leads, stats, activity };
 * PATCH { id, status | routed_to_slug | notes | fee_ars } → { lead }.
 * Los KPIs se calculan acá con la MISMA regla que el GET (fee potencial =
 * new+routed+contacted; ganado = won) para que reflejen al instante los cambios
 * optimistas.
 */

type PatchBody = { status?: string; routed_to_slug?: string; notes?: string; fee_ars?: number }

const EMPTY: ActivityRow[] = []

/** Aplica localmente lo mismo que hará el PATCH del server (incluido: slug sin status → routed). */
function aplicar(l: Lead, body: PatchBody): Lead {
  const n = { ...l }
  if (typeof body.status === 'string') n.status = body.status
  if (typeof body.routed_to_slug === 'string') {
    n.routed_to_slug = body.routed_to_slug || null
    if (typeof body.status !== 'string') n.status = 'routed'
  }
  if (typeof body.notes === 'string') n.notes = body.notes
  if (body.fee_ars != null) n.fee_ars = body.fee_ars
  return n
}

function useIsLg() {
  const [lg, setLg] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setLg(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return lg
}

const VACIO: Record<TabKey, string> = {
  'sin-trabajar': 'Nada sin trabajar: todo lo que entró ya tiene un estado.',
  ruteados: 'No hay leads ruteados esperando contacto.',
  contactados: 'No hay leads contactados en curso.',
  ganados: 'Todavía no hay leads ganados.',
  cerrados: 'No hay leads perdidos ni descartados.',
  todos: 'Todavía no hay leads. Cuando un productor pida ser contactado, aparece acá.',
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [activity, setActivity] = useState<Record<number, ActivityRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const [tab, setTab] = useState<TabKey>('sin-trabajar')
  const [q, setQ] = useState('')
  const [family, setFamily] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [aviso, setAviso] = useState<{ id: number; prev: string; texto: string } | null>(null)
  const [deepMiss, setDeepMiss] = useState<string | null>(null)

  const leadsRef = useRef<Lead[]>([])
  leadsRef.current = leads
  const rowRefs = useRef(new Map<number, HTMLLIElement>())
  const deepDone = useRef(false)
  const isLg = useIsLg()

  /* ---------- Carga ---------- */

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/admin/leads', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `Error ${res.status}`)
      setLeads(j.leads || [])
      setActivity(j.activity || {})
      setUpdatedAt(new Date())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudieron leer los leads')
    } finally {
      setLoading(false)
    }
  }, [])

  /** Después de un PATCH la API escribe la línea de bitácora; se trae sólo eso. */
  const refreshActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setActivity(j.activity || {})
    } catch {
      /* la bitácora se ve en la próxima carga */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Deep link ?lead=<id>: abrir ese lead en la pestaña donde vive.
  useEffect(() => {
    if (deepDone.current || loading || leads.length === 0) return
    deepDone.current = true
    const raw = new URLSearchParams(window.location.search).get('lead')
    const id = raw ? Number(raw) : NaN
    if (!Number.isFinite(id)) return
    const l = leads.find((x) => x.id === id)
    if (!l) {
      setDeepMiss(`El lead #${raw} no está entre los últimos 500.`)
      return
    }
    setTab(tabFor(l.status))
    setSelectedId(id)
    requestAnimationFrame(() => rowRefs.current.get(id)?.scrollIntoView({ block: 'center' }))
  }, [loading, leads])

  // La URL refleja el lead abierto (para copiar el link).
  useEffect(() => {
    if (!deepDone.current) return
    const url = new URL(window.location.href)
    if (selectedId != null) url.searchParams.set('lead', String(selectedId))
    else url.searchParams.delete('lead')
    window.history.replaceState(null, '', url.toString())
  }, [selectedId])

  /* ---------- Mutaciones (optimistas, con rollback) ---------- */

  const patch = useCallback(
    async (id: number, body: PatchBody): Promise<boolean> => {
      const prev = leadsRef.current.find((l) => l.id === id)
      if (!prev) return false
      setLeads((ls) => ls.map((l) => (l.id === id ? aplicar(l, body) : l)))
      setSaving((s) => new Set(s).add(id))
      setErrors(({ [id]: _drop, ...rest }) => rest)
      try {
        const res = await fetch('/api/admin/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...body }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j.lead) throw new Error(j.error || `Error ${res.status}`)
        setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...j.lead } : l)))
        if (body.status !== undefined || body.routed_to_slug !== undefined) refreshActivity()
        return true
      } catch (e) {
        setLeads((ls) => ls.map((l) => (l.id === id ? prev : l)))
        setErrors((er) => ({ ...er, [id]: `No se guardó: ${e instanceof Error ? e.message : 'error de red'}` }))
        return false
      } finally {
        setSaving((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
      }
    },
    [refreshActivity],
  )

  /* ---------- Derivados ---------- */

  const filtrados = useMemo(
    () => leads.filter((l) => matchesSearch(l, q) && (!family || sourceFamily(l.source) === family)),
    [leads, q, family],
  )
  const counts = useMemo(() => {
    const c = {} as Record<TabKey, number>
    for (const t of TABS) c[t.key] = filtrados.filter((l) => inTab(l, t.key)).length
    return c
  }, [filtrados])
  // El lead abierto se queda en la lista aunque cambie de etapa, hasta abrir otro.
  const visibles = useMemo(
    () => filtrados.filter((l) => inTab(l, tab) || l.id === selectedId),
    [filtrados, tab, selectedId],
  )
  const selected = leads.find((l) => l.id === selectedId) ?? null
  const kpis = useMemo(() => computeKpis(leads), [leads])
  const feeDePrueba = useMemo(
    () => leads.filter((l) => FEE_OPEN.includes(l.status) && pareceTest(l)).reduce((a, l) => a + Number(l.fee_ars || 0), 0),
    [leads],
  )
  const dias = useMemo(() => ritmo14(leads), [leads])
  const multiEstado = (TABS.find((t) => t.key === tab)?.statuses?.length ?? 2) > 1

  const descartar = useCallback(
    async (l: Lead) => {
      if (l.id === selectedId) {
        const i = visibles.findIndex((x) => x.id === l.id)
        const sig = visibles[i + 1] ?? visibles[i - 1]
        setSelectedId(sig && sig.id !== l.id ? sig.id : null)
      }
      const prev = l.status
      setAviso({ id: l.id, prev, texto: `${l.name} descartado` })
      const ok = await patch(l.id, { status: 'discarded' })
      if (!ok) setAviso(null)
    },
    [patch, selectedId, visibles],
  )

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 7000)
    return () => clearTimeout(t)
  }, [aviso])

  /* ---------- Teclado: j/k, Esc ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable || t.closest('dialog'))) return
      if (e.key === 'Escape' && selectedId != null) {
        setSelectedId(null)
        return
      }
      if (e.key !== 'j' && e.key !== 'k') return
      if (visibles.length === 0) return
      e.preventDefault()
      const i = visibles.findIndex((l) => l.id === selectedId)
      const j = i === -1 ? 0 : Math.min(visibles.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))
      const id = visibles[j].id
      setSelectedId(id)
      rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visibles, selectedId])

  /* ---------- Render ---------- */

  const toggle = (id: number) => setSelectedId((cur) => (cur === id ? null : id))

  const detalle = selected && (
    <LeadDetail
      key={selected.id}
      lead={selected}
      activity={activity[selected.id] ?? EMPTY}
      saving={saving.has(selected.id)}
      error={errors[selected.id]}
      onPatch={(body) => patch(selected.id, body)}
      onActivity={(rows) => setActivity((a) => ({ ...a, [selected.id]: rows }))}
      onClose={() => setSelectedId(null)}
    />
  )

  const feePct = leads[0]?.fee_pct ?? 1

  return (
    <>
      <AdminPageHeader
        title="Leads"
        meta={updatedAt ? `actualizado ${updatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : undefined}
        description={`Productores que pidieron contacto. Ruteá a una firma, seguí el caso y cobrá el ${feePct}% al cierre.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => exportLeadsCsv(leads, activity)}
              disabled={leads.length === 0}
              title="Descarga el pipeline completo con la bitácora de cada lead"
              className="terminal-btn gap-1.5 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={load} className="terminal-btn gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </>
        }
      />

      {loadError && (
        <div role="alert" className="terminal-panel px-panel py-2 text-data text-negative">
          No se pudieron leer los leads ({loadError}).{' '}
          <button type="button" onClick={load} className="underline">
            Reintentar
          </button>
        </div>
      )}

      <KpiRow cols={5}>
        <KpiCell>
          <Stat
            label="Sin trabajar"
            value={nf(kpis.sinTrabajar)}
            tone={kpis.sinTrabajar > 0 ? 'warning' : 'emphasis'}
            sub="nuevos o a revisar"
          />
        </KpiCell>
        <KpiCell>
          <Stat label="Abiertos" value={nf(kpis.abiertos)} sub="sin ganar, perder ni descartar" />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Fee potencial abierto"
            value={ars(kpis.openFeePotential)}
            sub={feeDePrueba > 0 ? <span className="text-warning">{ars(feeDePrueba)} parecen pruebas</span> : 'nuevos, ruteados y contactados'}
          />
        </KpiCell>
        <KpiCell>
          <Stat label="Fee ganado" value={ars(kpis.wonFee)} tone="positive" sub="leads ganados" />
        </KpiCell>
        <KpiCell>
          <Ritmo days={dias} />
        </KpiCell>
      </KpiRow>

      {deepMiss && (
        <div className="terminal-panel flex items-center gap-2 px-panel py-2 text-xxs text-warning">
          <span className="flex-1">{deepMiss}</span>
          <button type="button" onClick={() => setDeepMiss(null)} aria-label="Cerrar aviso" className="text-zinc-500 hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <AdminTabsClient
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
        active={tab}
        onSelect={(k) => {
          setTab(k as TabKey)
          setSelectedId(null)
        }}
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            {family && (
              <button
                type="button"
                onClick={() => setFamily(null)}
                className="terminal-tag gap-1 border-accent text-accent"
                title="Quitar filtro de origen"
              >
                Origen: {familyLabel(family)} <X className="h-3 w-3" />
              </button>
            )}
            <AdminSearch value={q} onChange={setQ} placeholder="Nombre, email, teléfono, provincia…" />
          </div>
        }
      />

      <div className={selected && isLg ? 'grid gap-px lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]' : ''}>
        <AdminSection flush>
          {loading && leads.length === 0 ? (
            <AdminEmpty>Cargando…</AdminEmpty>
          ) : visibles.length === 0 ? (
            <AdminEmpty>{q || family ? 'Ningún lead coincide con la búsqueda en esta pestaña.' : VACIO[tab]}</AdminEmpty>
          ) : (
            <ul aria-label="Leads">
              {visibles.map((l) => {
                const acts = activity[l.id] ?? EMPTY
                return (
                  <LeadRow
                    key={l.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(l.id, el)
                      else rowRefs.current.delete(l.id)
                    }}
                    lead={l}
                    selected={l.id === selectedId}
                    showStatus={multiEstado || !inTab(l, tab)}
                    sinGestion={!acts.some((a) => HUMAN_KINDS.includes(a.kind))}
                    saving={saving.has(l.id)}
                    error={l.id === selectedId ? null : errors[l.id]}
                    onSelect={() => toggle(l.id)}
                    onDiscard={() => descartar(l)}
                  >
                    {!isLg && l.id === selectedId && (
                      <div className="border-t border-terminal-border bg-zinc-900/30">{detalle}</div>
                    )}
                  </LeadRow>
                )
              })}
            </ul>
          )}
          {visibles.length > 0 && (
            <p className="hidden border-t border-terminal-border px-panel py-1.5 text-xxs text-zinc-500 lg:block">
              <kbd>j</kbd>/<kbd>k</kbd> para moverte · <kbd>Esc</kbd> cierra · <kbd>/</kbd> busca
            </p>
          )}
        </AdminSection>

        {selected && isLg && (
          <aside className="terminal-panel self-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto" aria-label="Detalle del lead">
            {detalle}
          </aside>
        )}
      </div>

      <div className="grid gap-px lg:grid-cols-2">
        <Cruces
          leads={leads}
          onOpen={(id) => {
            const l = leads.find((x) => x.id === id)
            if (l && !inTab(l, tab)) setTab(tabFor(l.status))
            setSelectedId(id)
            requestAnimationFrame(() => rowRefs.current.get(id)?.scrollIntoView({ block: 'center' }))
          }}
        />
        <PorOrigen leads={leads} activeFamily={family} onFamily={setFamily} />
      </div>

      {aviso && (
        <div
          role="status"
          className="terminal-panel fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 px-panel py-2 text-data shadow-lg"
        >
          <span className="text-zinc-300">{aviso.texto}</span>
          <button
            type="button"
            onClick={() => {
              const { id, prev } = aviso
              setAviso(null)
              patch(id, { status: prev })
            }}
            className="text-accent hover:underline"
          >
            Deshacer
          </button>
          <span className="text-xxs text-zinc-500">→ {STATUS_META[aviso.prev]?.label ?? aviso.prev}</span>
        </div>
      )}
    </>
  )
}
