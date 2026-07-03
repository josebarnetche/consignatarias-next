'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface KeyRow {
  id: string
  name: string
  prefix: string
  environment: 'live' | 'test'
  created_at: string | null
  last_used_at: string | null
  usedThisMonth: number
}

interface Props {
  initialKeys: KeyRow[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Nunca usada'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Hace instantes'
  if (min < 60) return `Hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `Hace ${hr} h`
  const d = Math.floor(hr / 24)
  return `Hace ${d} d`
}

export default function ApiKeysClient({ initialKeys }: Props) {
  const router = useRouter()
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live')
  const [generatedSecret, setGeneratedSecret] = useState<{
    secret: string
    name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const nameInputId = useId()
  const dialogTitleId = useId()
  const secretDialogTitleId = useId()

  // Escape closes create modal
  useEffect(() => {
    if (!showCreateModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) setShowCreateModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreateModal, creating])

  const create = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), environment: newKeyEnv }),
      })
      const bodyText = await res.text()
      let json: {
        error?: string
        message?: string
        limit?: number
        key?: KeyRow
        secret?: string
      } | null = null
      try {
        json = JSON.parse(bodyText)
      } catch {
        // Server didn't return JSON — surface what we got
        console.error('[create key] non-JSON response', res.status, bodyText)
        setError(`Respuesta inválida del servidor (HTTP ${res.status}). ${bodyText.slice(0, 160)}`)
        setCreating(false)
        return
      }
      if (!res.ok) {
        const msg =
          json?.error === 'max_keys_reached'
            ? `Llegaste al límite de ${json.limit} keys activas. Revocá una primero.`
            : json?.error === 'invalid_name'
              ? 'El nombre debe tener entre 2 y 60 caracteres.'
              : json?.error === 'no_api_access'
                ? 'Tu cuenta no tiene un plan Enterprise activo.'
                : json?.message ?? json?.error ?? `No se pudo crear la key (HTTP ${res.status}).`
        setError(msg)
        setCreating(false)
        return
      }
      if (!json?.key || !json?.secret) {
        setError('Respuesta sin key/secret. Avisanos.')
        setCreating(false)
        return
      }
      setKeys((prev) => [
        {
          id: json!.key!.id,
          name: json!.key!.name,
          prefix: json!.key!.prefix,
          environment: json!.key!.environment,
          created_at: json!.key!.created_at,
          last_used_at: null,
          usedThisMonth: 0,
        },
        ...prev,
      ])
      setGeneratedSecret({ secret: json.secret, name: json.key.name })
      setShowCreateModal(false)
      setNewKeyName('')
      setNewKeyEnv('live')
    } catch (err) {
      console.error('[create key] fetch failed', err)
      const msg = err instanceof Error ? err.message : 'fetch_failed'
      setError(`Error de red: ${msg}`)
    } finally {
      setCreating(false)
    }
  }, [newKeyName, newKeyEnv])

  const revoke = useCallback(
    async (id: string, name: string) => {
      const confirmed = window.confirm(
        `Revocar la key "${name}"? Las integraciones que la usan dejarán de funcionar inmediatamente.`,
      )
      if (!confirmed) return
      setRevoking(id)
      try {
        const res = await fetch(`/api/internal/keys?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          setKeys((prev) => prev.filter((k) => k.id !== id))
          router.refresh()
        }
      } finally {
        setRevoking(null)
      }
    },
    [router],
  )

  const copySecret = useCallback(async () => {
    if (!generatedSecret) return
    try {
      await navigator.clipboard.writeText(generatedSecret.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [generatedSecret])

  return (
    <>
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Tus keys ({keys.length})</span>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="text-xxs font-terminal uppercase tracking-wider text-zinc-300 hover:text-zinc-100"
            style={{ color: '#38bdf8' }}
          >
            + Generar nueva
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="px-panel py-10 text-center">
            <p className="text-zinc-400 text-data mb-4">
              Todavía no generaste ninguna API key.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="terminal-btn"
              style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
            >
              Generar mi primera key →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border">
            {keys.map((k) => (
              <div
                key={k.id}
                className="px-panel py-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-200 font-medium text-data truncate">
                      {k.name}
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-xxs font-terminal uppercase tracking-wider"
                      style={
                        k.environment === 'live'
                          ? {
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              borderRadius: '2px',
                            }
                          : {
                              background: 'rgba(168, 162, 158, 0.1)',
                              color: '#a8a29e',
                              border: '1px solid rgba(168, 162, 158, 0.3)',
                              borderRadius: '2px',
                            }
                      }
                    >
                      {k.environment}
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xxs font-terminal tabular-nums">
                    {k.prefix}…
                    <span className="text-zinc-700 mx-2">·</span>
                    creada {formatDate(k.created_at)}
                  </div>
                  <div className="text-zinc-600 text-xxs mt-1">
                    {relativeTime(k.last_used_at)}
                    <span className="text-zinc-700 mx-2">·</span>
                    <span className="tabular-nums">
                      {k.usedThisMonth.toLocaleString('en-US')} req este mes
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(k.id, k.name)}
                  disabled={revoking === k.id}
                  className="terminal-btn whitespace-nowrap disabled:opacity-50"
                  style={{ borderColor: 'rgba(248, 113, 113, 0.4)', color: '#f87171' }}
                >
                  {revoking === k.id ? 'Revocando…' : 'Revocar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => !creating && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
        >
          <div
            className="terminal-panel w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div id={dialogTitleId} className="terminal-panel-header">
              Generar nueva API key
            </div>
            <div className="px-panel py-5 space-y-4">
              <div>
                <label
                  htmlFor={nameInputId}
                  className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1"
                >
                  Nombre
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ej: Producción · app gestión"
                  maxLength={60}
                  autoFocus
                  className="w-full px-3 py-2 bg-zinc-950 border border-terminal-border text-zinc-100 text-data font-terminal focus:outline-none focus:border-sky-500"
                />
                <p className="text-zinc-600 text-xxs mt-1">
                  Solo para identificarla. No se comparte con la API.
                </p>
              </div>

              <div>
                <label className="block text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-2">
                  Entorno
                </label>
                <div className="flex gap-2">
                  {(['live', 'test'] as const).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setNewKeyEnv(env)}
                      className="flex-1 px-3 py-2 text-data font-terminal uppercase tracking-wider border transition-colors"
                      style={
                        newKeyEnv === env
                          ? {
                              background: 'rgba(56, 189, 248, 0.12)',
                              borderColor: 'rgba(56, 189, 248, 0.6)',
                              color: '#38bdf8',
                            }
                          : {
                              background: 'transparent',
                              borderColor: '#27272a',
                              color: '#a1a1aa',
                            }
                      }
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-xxs text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="terminal-btn flex-1 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={create}
                  disabled={creating || newKeyName.trim().length < 2}
                  className="terminal-btn flex-1 disabled:opacity-50"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
                >
                  {creating ? 'Generando…' : 'Generar key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-time secret modal */}
      {generatedSecret && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={secretDialogTitleId}
        >
          <div
            className="terminal-panel w-full max-w-2xl"
            style={{
              borderColor: 'rgba(251, 191, 36, 0.5)',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.12)',
            }}
          >
            <div
              id={secretDialogTitleId}
              className="terminal-panel-header"
              style={{ color: '#fbbf24', borderBottomColor: 'rgba(251, 191, 36, 0.3)' }}
            >
              ⚠ Guardá tu API key ahora
            </div>
            <div className="px-panel py-5">
              <p className="text-zinc-300 text-data mb-4">
                Esta es la <span className="text-amber-400 font-medium">única vez</span>{' '}
                que vas a ver el secreto completo de la key{' '}
                <span className="text-zinc-100 font-medium">&ldquo;{generatedSecret.name}&rdquo;</span>.
                Si la perdés, vas a tener que generar una nueva.
              </p>

              <div className="bg-zinc-950 border border-terminal-border px-3 py-3 mb-3 flex items-center gap-3">
                <code className="flex-1 text-zinc-100 text-data font-terminal break-all">
                  {generatedSecret.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="terminal-btn whitespace-nowrap"
                  style={{ borderColor: 'rgba(251, 191, 36, 0.5)', color: '#fbbf24' }}
                >
                  {copied ? 'Copiado ✓' : 'Copiar'}
                </button>
              </div>

              <p className="text-zinc-500 text-xxs mb-5">
                Pegala en tu <code className="text-zinc-400 bg-zinc-900 px-1">.env</code>{' '}
                como <code className="text-zinc-400 bg-zinc-900 px-1">CONSIGNATARIAS_API_KEY</code>{' '}
                o usala como header{' '}
                <code className="text-zinc-400 bg-zinc-900 px-1">Authorization: Bearer …</code>
              </p>

              <button
                type="button"
                onClick={() => {
                  setGeneratedSecret(null)
                  setCopied(false)
                  router.refresh()
                }}
                className="terminal-btn w-full"
              >
                Ya la guardé, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
