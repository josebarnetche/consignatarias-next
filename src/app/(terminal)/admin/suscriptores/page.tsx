'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import { AdminPageHeader, AdminSection, AdminEmpty, KpiRow, KpiCell } from '@/components/admin/kit'
import { AdminSearch, AdminTabsClient } from '@/components/admin/kit-client'
import { KpiSkeleton, SectionSkeleton } from '@/components/admin/metricas/SectionSkeleton'

/**
 * /admin/suscriptores — el newsletter en detalle: ritmo de captación, de dónde
 * vienen y la lista completa (buscar, filtrar reales/tests, paginar, exportar).
 * Lee GET /api/admin/suscriptores (contrato sin cambios). Todo lo derivado se
 * calcula sobre suscriptores REALES (sin tests/healthchecks).
 *
 * El total de activos con su +7 d también figura en Hoy como resumen; las bajas
 * 7 d viven sólo acá (antes estaban en el panel de outreach).
 */

interface Subscriber {
  id: string
  email: string
  source: string | null
  status: string
  subscribed_at: string | null
  created_at: string
  unsubscribed_at?: string | null
}

type Filtro = 'reales' | 'tests' | 'todos'

const PAGE = 50
const DAY = 86_400_000
const nf = (n: number) => n.toLocaleString('es-AR')

const esTest = (s: Subscriber) => /test|healthcheck|jarvis/i.test(s.email)

function fecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** % de cambio; null si no hay base (no inventamos ∞). */
function cambio(cur: number, prev: number): number | null {
  return prev === 0 ? null : ((cur - prev) / prev) * 100
}

function csvCell(v: string | null | undefined): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(rows: Subscriber[], filtro: Filtro) {
  const head = ['email', 'origen', 'estado', 'suscripto', 'alta', 'baja']
  const lines = rows.map((s) =>
    [s.email, s.source, s.status, s.subscribed_at, s.created_at, s.unsubscribed_at ?? ''].map(csvCell).join(','),
  )
  // BOM para que Excel abra bien los acentos.
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `suscriptores-${filtro}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SuscriptoresPage() {
  const [subs, setSubs] = useState<Subscriber[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('reales')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/suscriptores', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los suscriptores.')
      setSubs((data.subscribers ?? []) as Subscriber[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const reales = useMemo(() => (subs ?? []).filter((s) => !esTest(s)), [subs])
  const tests = useMemo(() => (subs ?? []).filter(esTest), [subs])

  // Momentum + fuentes: sobre reales.
  const m = useMemo(() => {
    const now = Date.now()
    const t = (s: Subscriber) => new Date(s.created_at).getTime()
    const win = (from: number, to: number) =>
      reales.filter((s) => t(s) >= now - from * DAY && t(s) < now - to * DAY).length
    const daily = Array.from({ length: 30 }, (_, i) => {
      const end = now - (29 - i) * DAY
      return reales.filter((s) => t(s) >= end - DAY && t(s) < end).length
    })
    const bajas7 = reales.filter(
      (s) => s.status === 'unsubscribed' && s.unsubscribed_at && new Date(s.unsubscribed_at).getTime() >= now - 7 * DAY,
    ).length
    const bySource = new Map<string, number>()
    for (const s of reales) bySource.set(s.source || 'sin origen', (bySource.get(s.source || 'sin origen') ?? 0) + 1)
    return {
      activos: reales.filter((s) => s.status === 'active').length,
      last7: win(7, 0),
      prev7: win(14, 7),
      last30: win(30, 0),
      prev30: win(60, 30),
      bajas7,
      daily,
      sources: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [reales])

  const filtrados = useMemo(() => {
    const base = filtro === 'reales' ? reales : filtro === 'tests' ? tests : (subs ?? [])
    const needle = q.trim().toLowerCase()
    if (!needle) return base
    return base.filter((s) => s.email.toLowerCase().includes(needle) || (s.source ?? '').toLowerCase().includes(needle))
  }, [filtro, q, reales, tests, subs])

  const pages = Math.max(1, Math.ceil(filtrados.length / PAGE))
  const safePage = Math.min(page, pages - 1)
  const visibles = filtrados.slice(safePage * PAGE, safePage * PAGE + PAGE)

  const header = (
    <AdminPageHeader
      title="Suscriptores"
      description="Newsletter: a qué ritmo entra gente, desde dónde y quiénes son."
      actions={
        <>
          <button
            type="button"
            className="terminal-btn text-xxs disabled:opacity-40"
            disabled={!subs || filtrados.length === 0}
            onClick={() => exportCsv(filtrados, filtro)}
          >
            Exportar CSV{subs ? ` (${nf(filtrados.length)})` : ''}
          </button>
          <button type="button" className="terminal-btn text-xxs disabled:opacity-40" disabled={loading} onClick={fetchData}>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </>
      }
    />
  )

  if (error && !subs) {
    return (
      <>
        {header}
        <AdminSection>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-data text-negative font-terminal">{error}</span>
            <button type="button" onClick={fetchData} className="terminal-btn text-xxs">
              Reintentar
            </button>
          </div>
        </AdminSection>
      </>
    )
  }

  if (!subs) {
    return (
      <>
        {header}
        <KpiRow cols={4}>
          {Array.from({ length: 4 }, (_, i) => (
            <KpiCell key={i}>
              <KpiSkeleton />
            </KpiCell>
          ))}
        </KpiRow>
        <SectionSkeleton title="Nuevos por día · 30 d" rows={3} />
        <SectionSkeleton title="Suscriptores" rows={8} />
      </>
    )
  }

  const dailyMax = Math.max(1, ...m.daily)
  const sourceMax = Math.max(1, ...m.sources.map(([, n]) => n))

  return (
    <>
      {header}

      <KpiRow cols={4}>
        <KpiCell>
          <Stat label="Activos" value={nf(m.activos)} sub={`de ${nf(reales.length)} reales en la base`} />
        </KpiCell>
        <KpiCell>
          <Stat label="Nuevos · 7 d" value={nf(m.last7)} delta={cambio(m.last7, m.prev7)} sub={`vs ${nf(m.prev7)} la semana previa`} />
        </KpiCell>
        <KpiCell>
          <Stat label="Nuevos · 30 d" value={nf(m.last30)} delta={cambio(m.last30, m.prev30)} sub={`vs ${nf(m.prev30)} el mes previo`} />
        </KpiCell>
        <KpiCell>
          <Stat label="Bajas · 7 d" value={nf(m.bajas7)} tone={m.bajas7 > 0 ? 'negative' : 'emphasis'} sub="se dieron de baja" />
        </KpiCell>
      </KpiRow>

      <div className="grid gap-px lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminSection title="Nuevos por día · 30 d">
          <div className="flex items-end gap-[2px] h-20" role="img" aria-label="Nuevos suscriptores por día, últimos 30 días">
            {m.daily.map((v, i) => (
              <div
                key={i}
                title={`hace ${29 - i} d: ${v} nuevo${v === 1 ? '' : 's'}`}
                className={`flex-1 rounded-sm ${v > 0 ? 'bg-accent' : 'bg-zinc-800'}`}
                style={{ height: `${v > 0 ? Math.max(8, (v / dailyMax) * 100) : 4}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xxs text-zinc-500 font-terminal">
            <span>hace 30 d</span>
            <span>hace 15 d</span>
            <span>hoy</span>
          </div>
        </AdminSection>

        <AdminSection title="Origen" action={<span className="text-xxs text-zinc-500 font-terminal">reales</span>}>
          {m.sources.length === 0 ? (
            <p className="text-data text-zinc-500 font-terminal">Sin suscriptores reales todavía.</p>
          ) : (
            <ul className="space-y-1.5">
              {m.sources.slice(0, 8).map(([src, n]) => (
                <li key={src}>
                  <div className="flex items-center justify-between gap-2 text-data font-terminal">
                    <span className="truncate text-zinc-300">{src}</span>
                    <span className="tabular-nums text-zinc-400">
                      {nf(n)} <span className="text-zinc-500 text-xxs">{Math.round((n / reales.length) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-zinc-800 overflow-hidden" aria-hidden>
                    <div className="h-full bg-accent/60" style={{ width: `${(n / sourceMax) * 100}%` }} />
                  </div>
                </li>
              ))}
              {m.sources.length > 8 && (
                <li className="text-xxs text-zinc-500 font-terminal">
                  + {m.sources.length - 8} orígenes más con {nf(m.sources.slice(8).reduce((a, [, n]) => a + n, 0))} suscriptores
                </li>
              )}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminTabsClient
        tabs={[
          { key: 'reales', label: 'Reales', count: reales.length },
          { key: 'tests', label: 'Tests', count: tests.length },
          { key: 'todos', label: 'Todos', count: subs.length },
        ]}
        active={filtro}
        onSelect={(k) => {
          setFiltro(k as Filtro)
          setPage(0)
        }}
        trailing={
          <AdminSearch
            value={q}
            onChange={(v) => {
              setQ(v)
              setPage(0)
            }}
            placeholder="Buscar email u origen"
          />
        }
      />

      <AdminSection flush>
        {filtrados.length === 0 ? (
          <AdminEmpty>{q ? `Nadie coincide con “${q}”.` : 'No hay suscriptores en este filtro.'}</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th className="hidden sm:table-cell">Origen</th>
                  <th>Estado</th>
                  <th className="text-right hidden md:table-cell">Alta</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((s) => (
                  <tr key={s.id}>
                    <td className="text-ink max-w-[16rem] truncate" title={s.email}>
                      {s.email}
                      <span className="block sm:hidden text-xxs text-zinc-500">{s.source || 'sin origen'}</span>
                    </td>
                    <td className="text-zinc-400 text-xxs hidden sm:table-cell">{s.source || 'sin origen'}</td>
                    <td>
                      <Badge tone={s.status === 'active' ? 'positive' : s.status === 'unsubscribed' ? 'negative' : 'neutral'}>
                        {s.status === 'active' ? 'Activo' : s.status === 'unsubscribed' ? 'Baja' : s.status}
                      </Badge>
                    </td>
                    <td className="text-right text-xxs tabular-nums text-zinc-500 hidden md:table-cell">{fecha(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="px-panel py-2 border-t border-terminal-border flex items-center justify-between gap-2 text-xxs font-terminal">
            <span className="text-zinc-500 tabular-nums">
              {nf(safePage * PAGE + 1)}–{nf(Math.min(filtrados.length, (safePage + 1) * PAGE))} de {nf(filtrados.length)}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="terminal-btn text-xxs disabled:opacity-40"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="terminal-btn text-xxs disabled:opacity-40"
                disabled={safePage >= pages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Siguiente →
              </button>
            </span>
          </div>
        )}
      </AdminSection>
    </>
  )
}
