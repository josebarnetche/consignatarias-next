'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'
import { AdminSection, AdminEmpty, KpiRow, KpiCell } from '@/components/admin/kit'
import { KpiSkeleton, SectionSkeleton } from './SectionSkeleton'

/**
 * Datos de /admin/dashboard ("Negocio") — UNA lectura de GET /api/admin/dashboard
 * (contrato sin cambios) compartida por varias piezas vía contexto, para que la
 * página server pueda intercalar sus propios paneles (frescura, outreach, email)
 * entre ellas sin volver a pedir nada.
 *
 * El campo `claims` de la respuesta se ignora a propósito: los pendientes están
 * en la barra lateral y en Hoy; acá sólo queda un enlace a Verificaciones.
 */

export interface DashboardData {
  revenue: {
    mrr: number
    paidSubscriptions: number
    bonifiedSubscriptions: number
    totalPro: number
    proRate: number
    breakdown: { b2bMrr: number; proUserMrr: number; apiMrr: number }
    proUserCount: number
    apiByTier: Record<string, number>
    internalSubs: number
  }
  profiles: {
    totalConsignatarias: number
    verifiedConsignatarias: number
    verificationRate: number
  }
  engagement: {
    totalViews: number
    views30d: number
    views7d: number
    topViewed: { entity_slug: string; view_count: number }[]
  }
  users: { total: number; admins: number; owners: number }
  subscriptions: {
    entityType: string
    entitySlug: string
    planName: string
    status: string
    periodEnd: string | null
    createdAt: string
  }[]
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: DashboardData }

const Ctx = createContext<{ state: State; reload: () => void }>({ state: { status: 'loading' }, reload: () => {} })

const nf = (n: number) => n.toLocaleString('es-AR')
const ars = (n: number) => `$${nf(n)}`

export function NegocioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const r = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (r.status === 401 || r.status === 403) {
        window.location.href = '/login'
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setState({ status: 'ok', data: (await r.json()) as DashboardData })
    } catch {
      setState({ status: 'error', message: 'No se pudieron cargar los datos de negocio.' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return <Ctx.Provider value={{ state, reload: load }}>{children}</Ctx.Provider>
}

function useNegocio() {
  return useContext(Ctx)
}

/** Botón chico para volver a pedir los datos (va en el encabezado). */
export function NegocioReload() {
  const { state, reload } = useNegocio()
  return (
    <button type="button" onClick={reload} disabled={state.status === 'loading'} className="terminal-btn text-xxs disabled:opacity-40">
      {state.status === 'loading' ? 'Cargando…' : 'Actualizar'}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Ingresos                                                           */
/* ------------------------------------------------------------------ */

export function IngresosKpis() {
  const { state, reload } = useNegocio()
  if (state.status === 'loading') {
    return (
      <KpiRow cols={4}>
        {Array.from({ length: 4 }, (_, i) => (
          <KpiCell key={i}>
            <KpiSkeleton />
          </KpiCell>
        ))}
      </KpiRow>
    )
  }
  if (state.status === 'error') {
    return (
      <AdminSection title="Ingresos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-data text-negative font-terminal">{state.message}</span>
          <button type="button" onClick={reload} className="terminal-btn text-xxs">
            Reintentar
          </button>
        </div>
      </AdminSection>
    )
  }
  const { revenue: r } = state.data
  const apiCount = Object.values(r.apiByTier).reduce((a, b) => a + b, 0)
  const apiTiers = Object.entries(r.apiByTier)
    .map(([t, n]) => `${t} ${nf(n)}`)
    .join(' · ')
  return (
    <KpiRow cols={4}>
      <KpiCell>
        <Stat
          label="MRR"
          value={ars(r.mrr)}
          tone={r.mrr > 0 ? 'positive' : 'neutral'}
          sub={r.internalSubs > 0 ? `ARS/mes · sin ${nf(r.internalSubs)} cuenta${r.internalSubs === 1 ? '' : 's'} interna${r.internalSubs === 1 ? '' : 's'}` : 'ARS/mes'}
        />
      </KpiCell>
      <KpiCell>
        <Stat
          label="PRO Consignataria · pagas"
          value={nf(r.paidSubscriptions)}
          tone={r.paidSubscriptions > 0 ? 'positive' : 'neutral'}
          sub={`${ars(r.breakdown.b2bMrr)}/mes · + ${nf(r.bonifiedSubscriptions)} bonificadas · ${r.proRate}% de los perfiles`}
        />
      </KpiCell>
      <KpiCell>
        <Stat
          label="API Enterprise"
          value={nf(apiCount)}
          tone={apiCount > 0 ? 'positive' : 'neutral'}
          sub={`${ars(r.breakdown.apiMrr)}/mes${apiTiers ? ` · ${apiTiers}` : ''}`}
        />
      </KpiCell>
      <KpiCell>
        <Stat
          label="PRO usuario · pagas"
          value={nf(r.proUserCount)}
          tone={r.proUserCount > 0 ? 'positive' : 'neutral'}
          sub={`${ars(r.breakdown.proUserMrr)}/mes · sólo con cobro en Rebill`}
        />
      </KpiCell>
    </KpiRow>
  )
}

/* ------------------------------------------------------------------ */
/*  Suscripciones (tabla)                                              */
/* ------------------------------------------------------------------ */

const STATUS: Record<string, { label: string; tone: 'positive' | 'warning' | 'negative' | 'neutral' }> = {
  active: { label: 'Activa', tone: 'positive' },
  past_due: { label: 'Vencida', tone: 'warning' },
  cancelled: { label: 'Cancelada', tone: 'negative' },
  canceled: { label: 'Cancelada', tone: 'negative' },
}

export function SuscripcionesTabla() {
  const { state } = useNegocio()
  if (state.status === 'loading') return <SectionSkeleton title="Suscripciones de firmas" rows={5} />
  if (state.status === 'error') return null
  const subs = [...state.data.subscriptions].sort(
    (a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.createdAt.localeCompare(a.createdAt),
  )
  const activas = subs.filter((s) => s.status === 'active').length
  return (
    <AdminSection
      title="Suscripciones de firmas"
      action={
        <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
          {nf(activas)} activas de {nf(subs.length)}
        </span>
      }
      flush
    >
      {subs.length === 0 ? (
        <AdminEmpty>Ninguna firma contrató PRO todavía. Cuando lo haga, aparece acá con su vencimiento.</AdminEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Firma</th>
                <th className="hidden sm:table-cell">Tipo</th>
                <th>Plan</th>
                <th>Estado</th>
                <th className="text-right hidden sm:table-cell">Vence</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => {
                const st = STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const }
                return (
                  <tr key={`${s.entitySlug}-${i}`}>
                    <td className="text-ink max-w-[14rem] truncate" title={s.entitySlug}>
                      {s.entityType === 'consignataria' ? (
                        <Link href={`/admin/consignatarias?slug=${encodeURIComponent(s.entitySlug)}`} className="hover:text-accent">
                          {s.entitySlug}
                        </Link>
                      ) : (
                        s.entitySlug
                      )}
                    </td>
                    <td className="text-zinc-500 text-xxs hidden sm:table-cell">
                      {s.entityType === 'consignataria' ? 'Consignataria' : 'Frigorífico'}
                    </td>
                    <td className="text-zinc-400 text-xxs">{s.planName}</td>
                    <td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="text-right text-xxs tabular-nums text-zinc-500 hidden sm:table-cell">
                      {s.periodEnd ? new Date(s.periodEnd).toLocaleDateString('es-AR') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  )
}

/* ------------------------------------------------------------------ */
/*  Audiencia: vistas 30 d / históricas + top 30 d                     */
/* ------------------------------------------------------------------ */

export function AudienciaKpis() {
  const { state } = useNegocio()
  if (state.status === 'error') return null
  if (state.status === 'loading') {
    return (
      <KpiRow cols={3}>
        {Array.from({ length: 3 }, (_, i) => (
          <KpiCell key={i}>
            <KpiSkeleton />
          </KpiCell>
        ))}
      </KpiRow>
    )
  }
  const { engagement: e, users: u } = state.data
  return (
    <KpiRow cols={3}>
      <KpiCell>
        <Stat
          label="Vistas de perfil · 30 d"
          value={nf(e.views30d)}
          sub={<Link href="/admin" className="text-accent">7 días y variación en Hoy →</Link>}
        />
      </KpiCell>
      <KpiCell>
        <Stat label="Vistas de perfil · históricas" value={nf(e.totalViews)} sub="desde el lanzamiento" />
      </KpiCell>
      <KpiCell>
        <Stat label="Usuarios con cuenta" value={nf(u.total)} sub={`${nf(u.admins)} admin · ${nf(u.owners)} dueños de ficha`} />
      </KpiCell>
    </KpiRow>
  )
}

export function TopPerfiles30d() {
  const { state } = useNegocio()
  if (state.status === 'loading') return <SectionSkeleton title="Perfiles más vistos · 30 d" rows={6} />
  if (state.status === 'error') return null
  const top = state.data.engagement.topViewed
  const max = Math.max(1, ...top.map((t) => t.view_count))
  return (
    <AdminSection title="Perfiles más vistos · 30 d" flush>
      {top.length === 0 ? (
        <AdminEmpty>Sin vistas registradas en 30 días.</AdminEmpty>
      ) : (
        <ol>
          {top.map((t, i) => (
            <li key={t.entity_slug} className="border-b border-terminal-border last:border-b-0 px-panel py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 text-right text-xxs text-zinc-500 tabular-nums font-terminal">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-data font-terminal text-ink" title={t.entity_slug}>
                  {t.entity_slug}
                </span>
                <span className="text-data font-terminal tabular-nums text-zinc-300">{nf(t.view_count)}</span>
              </div>
              <div className="ml-7 mt-1 h-1 rounded-full bg-zinc-800 overflow-hidden" aria-hidden>
                <div className="h-full bg-accent/60" style={{ width: `${(t.view_count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </AdminSection>
  )
}

/* ------------------------------------------------------------------ */
/*  Verificaciones: una fila con enlace (los pendientes están en la    */
/*  barra lateral; acá sólo la cobertura del directorio).              */
/* ------------------------------------------------------------------ */

export function VerificacionesFila() {
  const { state } = useNegocio()
  const p = state.status === 'ok' ? state.data.profiles : null
  return (
    <Link
      href="/admin/claims"
      className="terminal-panel px-panel py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-zinc-800/20 transition-colors group"
    >
      <span className="text-data text-ink font-terminal">Verificaciones</span>
      <span className="text-xxs text-zinc-500 font-terminal tabular-nums flex-1">
        {p
          ? `${nf(p.verifiedConsignatarias)} de ${nf(p.totalConsignatarias)} perfiles verificados (${p.verificationRate}%) · los pendientes están en la barra lateral`
          : 'Solicitudes de consignatarias y frigoríficos'}
      </span>
      <span className="text-zinc-500 group-hover:text-accent font-terminal" aria-hidden>
        →
      </span>
    </Link>
  )
}
