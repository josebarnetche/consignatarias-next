'use client'

import { useState } from 'react'
import type { PublicReview, SubmitterRole } from '@/lib/dal/reviews'

interface Props {
  consignatariaSlug: string
  consignatariaName: string
  reviews: PublicReview[]
  stats: { count: number; avgRating: number | null }
}

const ROLES: { value: SubmitterRole; label: string }[] = [
  { value: 'productor', label: 'Productor' },
  { value: 'asesor', label: 'Asesor / ingeniero' },
  { value: 'comprador', label: 'Comprador / frigorífico' },
  { value: 'otro', label: 'Otro' },
]

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-lg' : 'text-data'
  return (
    <span className={`${cls} text-amber-400 font-terminal tracking-wider tabular-nums`}>
      {'★'.repeat(rating)}
      <span className="text-zinc-700">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function relativeDate(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime()
  const days = Math.round(ageMs / 86_400_000)
  if (days < 1) return 'hoy'
  if (days < 30) return `hace ${days} d`
  if (days < 365) return `hace ${Math.round(days / 30)} mes`
  return `hace ${Math.round(days / 365)} año(s)`
}

export default function ReviewsPanel({ consignatariaSlug, consignatariaName, reviews, stats }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<null | { ok: boolean; message: string }>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<SubmitterRole | ''>('')
  const [provincia, setProvincia] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (body.trim().length < 30) {
      setSubmitted({ ok: false, message: 'El comentario debe tener al menos 30 caracteres.' })
      return
    }
    setSubmitting(true)
    setSubmitted(null)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consignatariaSlug,
          submitterName: name,
          submitterEmail: email,
          submitterRole: role || undefined,
          submitterProvincia: provincia || undefined,
          rating,
          body,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSubmitted({ ok: true, message: data.message || 'Reseña recibida. Queda pendiente de revisión.' })
        // Clear form on success
        setName('')
        setEmail('')
        setRole('')
        setProvincia('')
        setRating(5)
        setBody('')
      } else {
        setSubmitted({ ok: false, message: data.message || data.error || 'No se pudo enviar la reseña.' })
      }
    } catch {
      setSubmitted({ ok: false, message: 'Error de red. Probá de nuevo en unos segundos.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="terminal-panel mt-px">
      <div className="terminal-panel-header flex items-center justify-between flex-wrap gap-2">
        <span className="text-zinc-400 text-xxs tracking-widest">RESEÑAS DE PRODUCTORES</span>
        <div className="flex items-center gap-3">
          {stats.count > 0 && (
            <div className="flex items-center gap-2">
              <Stars rating={Math.round(stats.avgRating ?? 0)} />
              <span className="text-xxs font-terminal text-zinc-400">
                <span className="text-zinc-200 tabular-nums">{stats.avgRating?.toFixed(1)}</span>{' '}
                · {stats.count} reseña{stats.count === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright border border-accent/30 rounded-terminal px-2.5 py-1 transition-colors hover:bg-accent/10"
          >
            {showForm ? 'Cerrar formulario' : 'Dejar reseña →'}
          </button>
        </div>
      </div>

      {/* Submission form */}
      {showForm && (
        <form onSubmit={submit} className="px-panel py-3 border-b border-terminal-border space-y-2.5">
          <p className="text-xxs font-terminal text-zinc-500 leading-relaxed">
            Tu reseña queda pendiente de revisión antes de publicarse. Un email por consignataria.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder="Tu nombre (visible)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder="Tu email (no se publica)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as SubmitterRole | '')}
              className="text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
            >
              <option value="">Rol (opcional)</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Provincia (opcional)"
              value={provincia}
              onChange={e => setProvincia(e.target.value)}
              className="text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">Calificación:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-lg leading-none font-terminal transition-colors ${
                    n <= rating ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-700 hover:text-zinc-500'
                  }`}
                  aria-label={`Calificación ${n} estrellas`}
                >
                  ★
                </button>
              ))}
              <span className="text-xxs text-zinc-500 tabular-nums ml-1">({rating})</span>
            </div>
          </div>

          <textarea
            required
            minLength={30}
            maxLength={2000}
            rows={4}
            placeholder={`Tu experiencia operando con ${consignatariaName} — al menos 30 caracteres. Especificá si vendiste / compraste, qué tipo de hacienda, qué te pareció el trato.`}
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xxs font-terminal text-zinc-600 tabular-nums">{body.length} / 2000</span>
            <button
              type="submit"
              disabled={submitting}
              className="text-xxs font-terminal uppercase tracking-wider text-positive border border-positive/30 rounded-terminal px-3 py-1.5 hover:bg-positive/10 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar reseña'}
            </button>
          </div>
          {submitted && (
            <p className={`text-xxs font-terminal ${submitted.ok ? 'text-positive' : 'text-red-400'}`}>
              {submitted.message}
            </p>
          )}
        </form>
      )}

      {/* Approved reviews list */}
      {reviews.length === 0 ? (
        <div className="px-panel py-4 text-center">
          <p className="text-xxs font-terminal text-zinc-500 leading-relaxed">
            Todavía no hay reseñas publicadas. Si operaste con {consignatariaName}, sumá la tuya — los productores que leen este perfil agradecen el dato.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-terminal-border">
          {reviews.map(r => (
            <div key={r.id} className="px-panel py-3 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars rating={r.rating} />
                  <span className="text-data font-medium text-zinc-100">{r.submitterName}</span>
                  {r.submitterRole && (
                    <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">· {r.submitterRole}</span>
                  )}
                  {r.submitterProvincia && (
                    <span className="text-xxs font-terminal text-zinc-500">· {r.submitterProvincia}</span>
                  )}
                </div>
                <span className="text-xxs font-terminal text-zinc-600">{relativeDate(r.createdAt)}</span>
              </div>
              <p className="text-data font-terminal text-zinc-300 leading-relaxed whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
