'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui'

/**
 * Moderación de campos. La sección se abrió invitando a firmas a publicar su
 * cartera: si un aviso entra y nadie lo mira, la invitación queda en nada.
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

type Tab = 'pendiente' | 'publicado' | 'rechazado' | 'todos'

const TABS: Array<[Tab, string]> = [
  ['pendiente', 'Pendientes'],
  ['publicado', 'Publicados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
]

export default function AdminCamposPage() {
  const [campos, setCampos] = useState<Campo[]>([])
  const [tab, setTab] = useState<Tab>('pendiente')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState<number | null>(null)

  const traer = useCallback(async (t: Tab) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/campos?status=${t}`)
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      setCampos(data.campos || [])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    traer(tab)
  }, [tab, traer])

  async function actuar(id: number, accion: string) {
    setTrabajando(id)
    setError('')
    try {
      const res = await fetch('/api/admin/campos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'No se pudo actualizar')
        return
      }
      await traer(tab)
    } catch {
      setError('Error de conexión')
    } finally {
      setTrabajando(null)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR')

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-sm">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-zinc-100 text-lg font-medium">Campos</h1>
        <Link href="/campos" className="text-xs text-zinc-500 hover:text-accent">
          Ver la sección pública →
        </Link>
      </div>

      <div className="flex gap-1 mb-5 border-b border-zinc-800">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs border border-red-500/30 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-zinc-500 text-xs">Cargando…</p>
      ) : campos.length === 0 ? (
        <EmptyState
          icon="arrendamiento"
          title={tab === 'pendiente' ? 'No hay campos esperando revisión' : 'No hay campos acá'}
          sub={
            tab === 'pendiente'
              ? 'Cuando alguien publique un campo aparece en esta pestaña, antes de salir al sitio.'
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {campos.map((c) => (
            <article key={c.id} className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                  <h2 className="text-zinc-100 font-medium">
                    {c.titulo || `${fmt(c.hectareas)} ha en ${c.partido ? `${c.partido}, ` : ''}${c.provincia}`}
                  </h2>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {c.operacion} · {fmt(c.hectareas)} ha · {c.provincia}
                    {c.aptitud ? ` · ${c.aptitud}` : ''} ·{' '}
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.destacado && (
                    <span className="text-xxs uppercase tracking-wider border border-accent/50 text-accent rounded px-2 py-0.5">
                      Destacado
                    </span>
                  )}
                  <span className="text-xxs uppercase tracking-wider border border-zinc-700 text-zinc-400 rounded px-2 py-0.5">
                    {c.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                {c.precio_kg_ha_mes != null && (
                  <Dato k="Canon" v={`${c.precio_kg_ha_mes} kg/ha/mes`} />
                )}
                {c.precio_usd_ha != null && (
                  <Dato k="Venta" v={`US$${fmt(c.precio_usd_ha)}/ha`} />
                )}
                <Dato k="Origen" v={c.consignataria_slug ?? c.origen} />
                <Dato k="Vistas / consultas" v={`${c.vistas} / ${c.consultas}`} />
              </div>

              {(c.descripcion || c.mejoras) && (
                <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
                  {[c.descripcion, c.mejoras].filter(Boolean).join(' · ')}
                </p>
              )}

              {/* El contacto se muestra SOLO acá: en el sitio nunca se publica. */}
              <p className="text-zinc-500 text-xs mb-3">
                Contacto:{' '}
                {[c.contacto_nombre, c.contacto_email, c.contacto_telefono].filter(Boolean).join(' · ') ||
                  'sin datos'}
              </p>

              <div className="flex flex-wrap gap-2">
                {c.status !== 'publicado' && (
                  <Boton
                    onClick={() => actuar(c.id, 'publicar')}
                    disabled={trabajando === c.id}
                    tono="ok"
                  >
                    Publicar
                  </Boton>
                )}
                {c.status === 'publicado' && (
                  <>
                    <Boton onClick={() => actuar(c.id, 'pausar')} disabled={trabajando === c.id}>
                      Pausar
                    </Boton>
                    <Boton
                      onClick={() => actuar(c.id, c.destacado ? 'quitar_destacado' : 'destacar')}
                      disabled={trabajando === c.id}
                    >
                      {c.destacado ? 'Quitar destacado' : 'Destacar'}
                    </Boton>
                    {c.slug && (
                      <Link
                        href={`/campos/${c.slug}`}
                        className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:text-accent hover:border-accent rounded transition-colors"
                      >
                        Ver ficha
                      </Link>
                    )}
                  </>
                )}
                {c.status !== 'rechazado' && (
                  <Boton onClick={() => actuar(c.id, 'rechazar')} disabled={trabajando === c.id} tono="no">
                    Rechazar
                  </Boton>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-zinc-600 text-xxs uppercase tracking-wider">{k}</p>
      <p className="text-zinc-300 font-mono text-xs">{v}</p>
    </div>
  )
}

function Boton({
  children,
  onClick,
  disabled,
  tono,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tono?: 'ok' | 'no'
}) {
  const base = 'px-3 py-1.5 text-xs rounded transition-colors disabled:opacity-40'
  const estilo =
    tono === 'ok'
      ? 'bg-accent hover:bg-accent-bright text-zinc-950 font-medium'
      : tono === 'no'
        ? 'border border-red-500/40 text-red-400 hover:bg-red-500/10'
        : 'border border-zinc-700 text-zinc-400 hover:text-zinc-200'
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${estilo}`}>
      {children}
    </button>
  )
}
