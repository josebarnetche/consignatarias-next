'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AdminPageHeader, AdminSection, AdminEmpty } from '@/components/admin/kit'
import { AdminTabsClient } from '@/components/admin/kit-client'
import Badge, { type BadgeTone } from '@/components/ui/Badge'

/**
 * Moderación de campos. La sección se abrió invitando a firmas a publicar su
 * cartera: si un aviso entra y nadie lo mira, la invitación queda en nada.
 *
 * Se trae `?status=todos` una sola vez y se filtra acá: así cada pestaña
 * muestra su contador sin pedirle al API una cuenta aparte.
 */
interface Campo {
  id: number
  slug: string | null
  operacion: string
  hectareas: number
  provincia: string
  partido: string | null
  aptitud: string | null
  titulo: string | null
  descripcion: string | null
  mejoras: string | null
  precio_kg_ha_mes: number | null
  precio_usd_ha: number | null
  contacto_nombre: string | null
  contacto_email: string | null
  contacto_telefono: string | null
  consignataria_slug: string | null
  origen: string
  status: string
  destacado: boolean
  vistas: number
  consultas: number
  notas_internas: string | null
  created_at: string
}

type Tab = 'pendiente' | 'publicado' | 'pausado' | 'rechazado' | 'todos'

const TABS: Array<[Tab, string]> = [
  ['pendiente', 'Pendientes'],
  ['publicado', 'Publicados'],
  ['pausado', 'Pausados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
]

const STATUS_TONE: Record<string, BadgeTone> = {
  pendiente: 'warning',
  publicado: 'positive',
  pausado: 'neutral',
  rechazado: 'negative',
}

const fmt = (n: number) => n.toLocaleString('es-AR')

export default function AdminCamposPage() {
  const [campos, setCampos] = useState<Campo[]>([])
  const [tab, setTab] = useState<Tab>('pendiente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState<number | null>(null)
  const [aviso, setAviso] = useState('')

  const traer = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/campos?status=todos')
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudieron traer los campos')
        return
      }
      setCampos(data.campos || [])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    traer()
  }, [traer])

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pendiente: 0, publicado: 0, pausado: 0, rechazado: 0, todos: campos.length }
    for (const x of campos) if (x.status in c) c[x.status as Tab]++
    return c
  }, [campos])

  const visibles = useMemo(() => (tab === 'todos' ? campos : campos.filter((c) => c.status === tab)), [campos, tab])

  async function actuar(id: number, accion: string) {
    setTrabajando(id)
    setError('')
    setAviso('')
    try {
      const res = await fetch('/api/admin/campos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error || 'No se pudo actualizar')
        return
      }
      if (accion === 'publicar') {
        const a = d.aviso as { avisados: number; candidatos: number } | null
        setAviso(
          a && a.candidatos > 0
            ? `Publicado. Se avisó a ${a.avisados} de ${a.candidatos} que estaban buscando algo así.`
            : 'Publicado. Nadie en la lista de espera buscaba algo así todavía.',
        )
      }
      await traer()
    } catch {
      setError('Error de conexión')
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Campos"
        description="Avisos de campos en venta o alquiler. Nada sale al sitio sin que lo revises acá."
        actions={
          <Link href="/campos" className="text-xxs text-accent font-terminal">
            Ver la sección pública →
          </Link>
        }
      />

      <AdminTabsClient
        tabs={TABS.map(([key, label]) => ({ key, label, count: loading ? null : counts[key] }))}
        active={tab}
        onSelect={(k) => setTab(k as Tab)}
      />

      {error && (
        <div role="alert" className="terminal-panel px-panel py-2 text-xxs font-terminal text-negative">
          {error}
        </div>
      )}
      {aviso && (
        <div role="status" className="terminal-panel px-panel py-2 text-xxs font-terminal text-positive">
          {aviso}
        </div>
      )}

      <AdminSection flush>
        {loading ? (
          <AdminEmpty>Cargando…</AdminEmpty>
        ) : visibles.length === 0 ? (
          <AdminEmpty>
            {tab === 'pendiente'
              ? 'No hay campos esperando revisión. Cuando alguien publique uno aparece acá, antes de salir al sitio.'
              : 'No hay campos en esta pestaña.'}
          </AdminEmpty>
        ) : (
          <ul>
            {visibles.map((c) => (
              <CampoFila key={c.id} c={c} ocupado={trabajando === c.id} onAccion={(a) => actuar(c.id, a)} />
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}

function CampoFila({ c, ocupado, onAccion }: { c: Campo; ocupado: boolean; onAccion: (accion: string) => void }) {
  const titulo = c.titulo || `${fmt(c.hectareas)} ha en ${c.partido ? `${c.partido}, ` : ''}${c.provincia}`
  const contacto = [c.contacto_nombre, c.contacto_email, c.contacto_telefono].filter(Boolean).join(' · ')
  const texto = [c.descripcion, c.mejoras].filter(Boolean).join(' · ')

  return (
    <li className="px-panel py-3 border-b border-terminal-border last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-data font-terminal text-ink">{titulo}</h2>
          <p className="mt-0.5 text-xxs font-terminal text-zinc-500">
            {c.operacion} · {fmt(c.hectareas)} ha · {c.provincia}
            {c.aptitud ? ` · ${c.aptitud}` : ''} · cargado el {new Date(c.created_at).toLocaleDateString('es-AR')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {c.destacado && <Badge tone="accent">Destacado</Badge>}
          <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</Badge>
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {c.precio_kg_ha_mes != null && <Dato k="Canon" v={`${c.precio_kg_ha_mes} kg/ha/mes`} />}
        {c.precio_usd_ha != null && <Dato k="Venta" v={`US$${fmt(c.precio_usd_ha)}/ha`} />}
        <Dato k="Origen" v={c.consignataria_slug ?? c.origen} />
        <Dato k="Vistas / consultas" v={`${c.vistas} / ${c.consultas}`} />
      </dl>

      {texto && <p className="mt-2 text-xxs font-terminal leading-relaxed text-zinc-400 line-clamp-3">{texto}</p>}

      {/* El contacto se muestra SOLO acá: en el sitio nunca se publica. */}
      <p className="mt-2 text-xxs font-terminal text-zinc-500">
        Contacto: <span className="text-zinc-300">{contacto || 'sin datos'}</span>
      </p>
      {c.notas_internas && (
        <p className="mt-1 text-xxs font-terminal text-zinc-500">
          Notas internas: <span className="text-zinc-300">{c.notas_internas}</span>
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {c.status !== 'publicado' && (
          <Boton onClick={() => onAccion('publicar')} disabled={ocupado} tono="ok">
            Publicar
          </Boton>
        )}
        {c.status === 'publicado' && (
          <>
            <Boton onClick={() => onAccion('pausar')} disabled={ocupado}>
              Pausar
            </Boton>
            <Boton onClick={() => onAccion(c.destacado ? 'quitar_destacado' : 'destacar')} disabled={ocupado}>
              {c.destacado ? 'Quitar destacado' : 'Destacar'}
            </Boton>
            {c.slug && (
              <Link href={`/campos/${c.slug}`} className="terminal-btn">
                Ver ficha
              </Link>
            )}
          </>
        )}
        {c.status !== 'rechazado' && (
          <Boton onClick={() => onAccion('rechazar')} disabled={ocupado} tono="no">
            Rechazar
          </Boton>
        )}
      </div>
    </li>
  )
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xxs font-terminal text-zinc-500">{k}</dt>
      <dd className="truncate text-xxs font-terminal tabular-nums text-zinc-300">{v}</dd>
    </div>
  )
}

function Boton({
  children,
  onClick,
  disabled,
  tono,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tono?: 'ok' | 'no'
}) {
  const cls =
    tono === 'ok'
      ? 'terminal-btn-primary'
      : tono === 'no'
        ? 'terminal-btn border-negative/50 text-negative'
        : 'terminal-btn'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${cls} disabled:opacity-40`}>
      {children}
    </button>
  )
}
