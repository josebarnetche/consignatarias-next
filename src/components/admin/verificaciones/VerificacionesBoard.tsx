'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { AdminPageHeader, AdminEmpty } from '@/components/admin/kit'
import { AdminTabsClient, ReasonDialog } from '@/components/admin/kit-client'

/**
 * Bandeja única de verificaciones (reclamos de perfil). La usan
 * /admin/claims (consignatarias) y /admin/frigorifico-claims (frigoríficos):
 * las dos URLs son contrato porque las enlazan los mails.
 *
 * Contratos (no cambiar sin tocar los route handlers):
 *   GET   /api/admin/{claims|frigorifico-claims}?status=all  → { claims: [...] }
 *   PATCH /api/admin/{claims|frigorifico-claims}/[id]        { status: 'approved'|'rejected', admin_notes: string }
 *         409 si ya fue procesada; al aprobar, el servidor rechaza las otras
 *         pendientes del mismo perfil (por eso se resincroniza después).
 */

export type VerificacionKind = 'consignatarias' | 'frigorificos'
type Status = 'pending' | 'approved' | 'rejected'
type Tab = Status | 'all'

interface RawClaim {
  id: string
  claimant_name: string | null
  claimant_email: string
  claimant_phone: string | null
  claimant_role: string | null
  status: Status
  admin_notes: string | null
  created_at: string
  // consignatarias
  consignataria_slug?: string
  cuit?: string | null
  consignatarias?: { display_name: string } | null
  // frigoríficos
  frigorifico_cuit?: string
  frigorifico_name?: string
}

/** Forma común para pintar las dos fuentes con la misma fila. */
interface Claim {
  id: string
  status: Status
  createdAt: string
  adminNotes: string | null
  name: string | null
  email: string
  phone: string | null
  role: string | null
  /** CUIT declarado por quien reclama (solo consignatarias). */
  claimantCuit: string | null
  profileKey: string
  profileName: string
  profileHref: string
  /** CUIT del perfil (solo frigoríficos: el perfil ES el CUIT). */
  profileCuit: string | null
}

const KINDS: Record<
  VerificacionKind,
  { label: string; api: string; href: string; empty: string }
> = {
  consignatarias: {
    label: 'Consignatarias',
    api: '/api/admin/claims',
    href: '/admin/claims',
    empty: 'firma',
  },
  frigorificos: {
    label: 'Frigoríficos',
    api: '/api/admin/frigorifico-claims',
    href: '/admin/frigorifico-claims',
    empty: 'frigorífico',
  },
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}
const STATUS_TONE = { pending: 'warning', approved: 'positive', rejected: 'negative' } as const

const nf = (n: number) => n.toLocaleString('es-AR')

function formatCuit(cuit: string): string {
  const d = cuit.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : cuit
}

function hace(iso: string): string {
  const min = (Date.now() - new Date(iso).getTime()) / 60_000
  if (min < 60) return `hace ${Math.max(1, Math.round(min))} min`
  const h = min / 60
  if (h < 24) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} d`
}

function normalize(kind: VerificacionKind, c: RawClaim): Claim {
  const base = {
    id: c.id,
    status: c.status,
    createdAt: c.created_at,
    adminNotes: c.admin_notes,
    name: c.claimant_name,
    email: c.claimant_email,
    phone: c.claimant_phone,
    role: c.claimant_role,
  }
  if (kind === 'frigorificos') {
    const cuit = c.frigorifico_cuit ?? ''
    return {
      ...base,
      claimantCuit: null,
      profileKey: cuit,
      profileName: c.frigorifico_name || formatCuit(cuit),
      profileHref: `/frigorificos/${cuit}`,
      profileCuit: cuit,
    }
  }
  const slug = c.consignataria_slug ?? ''
  return {
    ...base,
    claimantCuit: c.cuit ?? null,
    profileKey: slug,
    profileName: c.consignatarias?.display_name || slug,
    profileHref: `/consignatarias/${slug}`,
    profileCuit: null,
  }
}

async function fetchClaims(kind: VerificacionKind, status: Tab): Promise<RawClaim[] | 'auth'> {
  const res = await fetch(`${KINDS[kind].api}?status=${status}`, { cache: 'no-store' })
  if (res.status === 401 || res.status === 403) return 'auth'
  if (!res.ok) throw new Error(String(res.status))
  const data = (await res.json()) as { claims?: RawClaim[] | null }
  return data.claims ?? []
}

export default function VerificacionesBoard({ kind }: { kind: VerificacionKind }) {
  const other: VerificacionKind = kind === 'consignatarias' ? 'frigorificos' : 'consignatarias'
  const cfg = KINDS[kind]

  const [claims, setClaims] = useState<Claim[] | null>(null)
  const [otherPending, setOtherPending] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('pending')
  const [loadError, setLoadError] = useState('')
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [rejecting, setRejecting] = useState<Claim | null>(null)

  // Traemos todas las del tipo actual (pocas filas) y filtramos acá: así cada
  // pestaña tiene su conteo sin un request por estado.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoadError('')
      try {
        const [mine, theirs] = await Promise.all([
          fetchClaims(kind, 'all'),
          fetchClaims(other, 'pending').catch(() => null),
        ])
        if (mine === 'auth' || theirs === 'auth') {
          window.location.href = '/login'
          return
        }
        setClaims(mine.map((c) => normalize(kind, c)))
        setOtherPending(theirs ? theirs.length : null)
      } catch {
        if (!silent) setLoadError('No se pudieron leer las verificaciones. Revisá la conexión y recargá.')
      }
    },
    [kind, other],
  )

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: 0 }
    for (const x of claims ?? []) {
      c[x.status]++
      c.all++
    }
    return c
  }, [claims])

  // Cuántas pendientes hay por perfil: aprobar una rechaza las otras.
  const pendingByProfile = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of claims ?? []) if (x.status === 'pending') m.set(x.profileKey, (m.get(x.profileKey) ?? 0) + 1)
    return m
  }, [claims])

  const visible = useMemo(
    () => (claims ?? []).filter((c) => tab === 'all' || c.status === tab),
    [claims, tab],
  )

  const setBusyId = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  async function review(claim: Claim, status: 'approved' | 'rejected', notes: string) {
    const prev = claims
    setBusyId(claim.id, true)
    setRowError((r) => {
      const next = { ...r }
      delete next[claim.id]
      return next
    })
    // Optimista: la fila sale de "Pendientes" ya mismo.
    setClaims((cs) =>
      (cs ?? []).map((c) => (c.id === claim.id ? { ...c, status, adminNotes: notes || null } : c)),
    )
    try {
      const res = await fetch(`${cfg.api}/${claim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes || '' }),
      })
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Error ${res.status}`)
      }
      // Al aprobar, el servidor rechaza las otras pendientes del mismo perfil.
      void load(true)
    } catch (e) {
      setClaims(prev)
      setRowError((r) => ({
        ...r,
        [claim.id]: `No se pudo ${status === 'approved' ? 'aprobar' : 'rechazar'}: ${
          e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'error de conexión'
        }. La solicitud sigue pendiente.`,
      }))
      // Si falló porque otro admin ya la procesó (409), traemos el estado real.
      void load(true)
    } finally {
      setBusyId(claim.id, false)
    }
  }

  const rows = visible
  // Un error cuya fila ya no está en la pestaña (p. ej. otro admin la procesó
  // y la resincronización la movió) se muestra arriba para que no se pierda.
  const orphanErrors = Object.entries(rowError).filter(([id]) => !rows.some((r) => r.id === id))

  const tabs = [
    { key: 'pending', label: 'Pendientes', count: claims ? counts.pending : null },
    { key: 'approved', label: 'Aprobadas', count: claims ? counts.approved : null },
    { key: 'rejected', label: 'Rechazadas', count: claims ? counts.rejected : null },
    { key: 'all', label: 'Todas', count: claims ? counts.all : null },
  ]

  const kindCount = (k: VerificacionKind) => (k === kind ? (claims ? counts.pending : null) : otherPending)

  return (
    <>
      <AdminPageHeader
        title="Verificaciones"
        description="Firmas y frigoríficos que reclaman su perfil. Al aprobar, quien reclama queda como dueño y le llega un mail."
        actions={
          <nav aria-label="Tipo de perfil" className="flex rounded-terminal border border-terminal-border overflow-hidden">
            {(['consignatarias', 'frigorificos'] as const).map((k) => {
              const active = k === kind
              const n = kindCount(k)
              return (
                <Link
                  key={k}
                  href={KINDS[k].href}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 min-h-[36px] inline-flex items-center gap-2 text-xxs font-terminal transition-colors border-l border-terminal-border first:border-l-0 ${
                    active ? 'bg-accent/10 text-ink' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                  }`}
                >
                  {KINDS[k].label}
                  {n != null && n > 0 && (
                    <span className="tabular-nums text-accent" aria-label={`${n} pendientes`}>
                      {nf(n)}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        }
      />

      <AdminTabsClient tabs={tabs} active={tab} onSelect={(k) => setTab(k as Tab)} />

      <section className="terminal-panel" aria-live="polite">
        {loadError && (
          <div className="px-panel py-2 border-b border-negative/30 text-negative text-data font-terminal flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <button type="button" onClick={() => void load()} className="terminal-btn">
              Reintentar
            </button>
          </div>
        )}

        {orphanErrors.map(([id, msg]) => (
          <div
            key={id}
            role="alert"
            className="px-panel py-2 border-b border-negative/30 text-negative text-xxs font-terminal flex items-center justify-between gap-3"
          >
            <span>{msg.replace(' La solicitud sigue pendiente.', '')}</span>
            <button
              type="button"
              onClick={() =>
                setRowError((r) => {
                  const next = { ...r }
                  delete next[id]
                  return next
                })
              }
              className="text-zinc-500 hover:text-ink"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        ))}

        {claims == null ? (
          !loadError && <AdminEmpty>Cargando…</AdminEmpty>
        ) : rows.length === 0 ? (
          <AdminEmpty>
            {tab === 'pending'
              ? `No hay verificaciones pendientes. Cuando una ${cfg.empty} reclame su perfil aparece acá y te llega un mail.`
              : tab === 'approved'
                ? 'Todavía no se aprobó ninguna solicitud.'
                : tab === 'rejected'
                  ? 'No hay solicitudes rechazadas.'
                  : `Todavía no hubo solicitudes de ${cfg.label.toLowerCase()}.`}
          </AdminEmpty>
        ) : (
          <ul className="divide-y divide-terminal-border">
            {rows.map((c) => (
              <ClaimRow
                key={c.id}
                claim={c}
                showStatus={tab !== 'pending'}
                siblings={(pendingByProfile.get(c.profileKey) ?? 1) - 1}
                busy={busy.has(c.id)}
                error={rowError[c.id]}
                onApprove={() => void review(c, 'approved', '')}
                onReject={() => setRejecting(c)}
              />
            ))}
          </ul>
        )}
      </section>

      <ReasonDialog
        open={rejecting != null}
        title="Rechazar verificación"
        description={
          rejecting && (
            <>
              <span className="text-ink">{rejecting.name || rejecting.email}</span> pidió{' '}
              <span className="text-ink">{rejecting.profileName}</span>. El motivo va en el mail de rechazo; si lo
              dejás vacío, el mail sale sin motivo.
            </>
          )
        }
        placeholder="Motivo (opcional). Ej.: no pudimos confirmar que trabajes en la firma."
        confirmLabel="Rechazar"
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => {
          const c = rejecting
          setRejecting(null)
          if (c) void review(c, 'rejected', reason)
        }}
      />
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xxs text-zinc-500 font-terminal">{label}</dt>
      <dd className="text-data text-zinc-300 font-terminal break-words">{children}</dd>
    </div>
  )
}

function ClaimRow({
  claim: c,
  showStatus,
  siblings,
  busy,
  error,
  onApprove,
  onReject,
}: {
  claim: Claim
  showStatus: boolean
  siblings: number
  busy: boolean
  error?: string
  onApprove: () => void
  onReject: () => void
}) {
  const fecha = new Date(c.createdAt).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const tel = c.phone ? c.phone.replace(/[^\d+]/g, '') : ''
  const who = c.name || c.email

  return (
    <li className="px-panel py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              href={c.profileHref}
              target="_blank"
              rel="noopener"
              className="text-data font-terminal text-ink hover:text-accent underline-offset-2 hover:underline"
            >
              {c.profileName}
              <span className="sr-only"> (abre el perfil público en otra pestaña)</span>
              <span aria-hidden className="text-zinc-500"> ↗</span>
            </Link>
            {c.profileCuit && (
              <span className="text-xxs text-zinc-500 font-terminal tabular-nums">CUIT {formatCuit(c.profileCuit)}</span>
            )}
            {showStatus && <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>}
            <time dateTime={c.createdAt} title={fecha} className="text-xxs text-zinc-500 font-terminal tabular-nums">
              {hace(c.createdAt)} · {fecha}
            </time>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Quién reclama">{c.name || <span className="text-zinc-500">Sin nombre</span>}</Field>
            <Field label="Email">
              <a href={`mailto:${c.email}`} className="hover:text-accent break-all">
                {c.email}
              </a>
            </Field>
            {c.phone && (
              <Field label="Teléfono">
                <a href={`tel:${tel}`} className="hover:text-accent tabular-nums">
                  {c.phone}
                </a>
              </Field>
            )}
            {c.role && <Field label="Rol">{c.role}</Field>}
            {c.claimantCuit && (
              <Field label="CUIT declarado">
                <span className="tabular-nums">{formatCuit(c.claimantCuit)}</span>
              </Field>
            )}
          </dl>

          {c.adminNotes && (
            <p className="text-xxs text-zinc-500 font-terminal">
              <span className="text-zinc-400">Nota:</span> {c.adminNotes}
            </p>
          )}
          {c.status === 'pending' && siblings > 0 && (
            <p className="text-xxs text-warning font-terminal">
              Hay {siblings === 1 ? 'otra solicitud pendiente' : `${siblings} solicitudes pendientes más`} para este
              perfil. Si aprobás esta, las demás se rechazan solas.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xxs text-negative font-terminal">
              {error}
            </p>
          )}
        </div>

        {c.status === 'pending' && (
          <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              aria-label={`Aprobar a ${who} como dueño de ${c.profileName}`}
              className="terminal-btn flex-1 border-positive/40 text-positive hover:border-positive hover:text-positive hover:bg-positive/10 disabled:opacity-40"
            >
              {busy ? 'Guardando…' : 'Aprobar'}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              aria-label={`Rechazar la solicitud de ${who} para ${c.profileName}`}
              className="terminal-btn flex-1 hover:border-negative hover:text-negative hover:bg-negative/10 disabled:opacity-40"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
