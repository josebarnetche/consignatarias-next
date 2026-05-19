'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReviewRow } from '@/lib/dal/reviews'

interface Props {
  initialReviews: ReviewRow[]
  adminEmail: string
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 font-terminal tracking-wider">
      {'★'.repeat(rating)}
      <span className="text-zinc-700">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function ageLabel(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime()
  const hours = ageMs / 3_600_000
  if (hours < 1) return `hace ${Math.round(hours * 60)} min`
  if (hours < 24) return `hace ${Math.round(hours)} h`
  return `hace ${Math.round(hours / 24)} d`
}

export default function ReviewsModerationClient({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  async function approve(id: string) {
    setBusy(prev => new Set(prev).add(id))
    const res = await fetch(`/api/admin/reviews/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      setReviews(prev => prev.filter(r => r.id !== id))
    }
    setBusy(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function submitReject() {
    if (!rejectingId) return
    if (rejectReason.trim().length < 5) {
      alert('El motivo de rechazo debe tener al menos 5 caracteres.')
      return
    }
    setBusy(prev => new Set(prev).add(rejectingId))
    const res = await fetch(`/api/admin/reviews/${rejectingId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    })
    if (res.ok) {
      setReviews(prev => prev.filter(r => r.id !== rejectingId))
    }
    setBusy(prev => {
      const next = new Set(prev)
      next.delete(rejectingId)
      return next
    })
    setRejectingId(null)
    setRejectReason('')
  }

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto space-y-3">
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">MODERACIÓN DE RESEÑAS</span>
          <span className="text-xxs font-terminal text-zinc-500 tabular-nums">
            {reviews.length} pendientes
          </span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="terminal-panel">
          <div className="px-panel py-8 text-center">
            <p className="text-data font-terminal text-zinc-400">Cola vacía.</p>
            <p className="text-xxs font-terminal text-zinc-600 mt-1">
              Las reseñas aprobadas aparecen públicamente en el perfil del consignatario.
            </p>
          </div>
        </div>
      ) : (
        reviews.map(r => {
          const isBusy = busy.has(r.id)
          return (
            <div key={r.id} className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/consignatarias/${r.consignataria_slug}`}
                    target="_blank"
                    className="text-data text-accent hover:underline font-terminal"
                  >
                    {r.consignataria_slug}
                  </Link>
                  <span className="text-terminal-border text-xxs">·</span>
                  <StarRow rating={r.rating} />
                </div>
                <span className="text-xxs font-terminal text-zinc-500">{ageLabel(r.created_at)}</span>
              </div>

              <div className="px-panel py-3 space-y-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xxs font-terminal">
                  <span className="text-zinc-400">
                    <span className="text-zinc-500 uppercase tracking-wider">De: </span>
                    <span className="text-zinc-200">{r.submitter_name}</span>{' '}
                    <span className="text-zinc-500">&lt;{r.submitter_email}&gt;</span>
                  </span>
                  {r.submitter_role && (
                    <span className="text-zinc-400">
                      <span className="text-zinc-500 uppercase tracking-wider">Rol: </span>
                      <span className="text-zinc-200">{r.submitter_role}</span>
                    </span>
                  )}
                  {r.submitter_provincia && (
                    <span className="text-zinc-400">
                      <span className="text-zinc-500 uppercase tracking-wider">Prov: </span>
                      <span className="text-zinc-200">{r.submitter_provincia}</span>
                    </span>
                  )}
                </div>
                <p className="text-data font-terminal text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {r.body}
                </p>
              </div>

              <div className="px-panel py-2 border-t border-terminal-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingId(r.id)}
                  disabled={isBusy}
                  className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 rounded-terminal px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => approve(r.id)}
                  disabled={isBusy}
                  className="text-xxs font-terminal uppercase tracking-wider text-positive border border-positive/30 rounded-terminal px-3 py-1.5 hover:bg-positive/10 transition-colors disabled:opacity-50"
                >
                  {isBusy ? 'Procesando…' : 'Aprobar'}
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Reject modal */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setRejectingId(null)
            setRejectReason('')
          }}
        >
          <div
            className="terminal-panel max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="terminal-panel-header">
              <span className="text-zinc-200 text-label tracking-widest">RECHAZAR RESEÑA</span>
            </div>
            <div className="px-panel py-3 space-y-3">
              <p className="text-xxs font-terminal text-zinc-400 leading-relaxed">
                El motivo se guarda para auditoría. No se envía al productor en v1.
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Por ej.: spam · contenido inapropiado · no es reseña real · duplicado"
                rows={3}
                className="w-full text-data font-terminal text-zinc-200 bg-terminal-bg border border-terminal-border rounded-terminal px-3 py-2 focus:border-accent focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null)
                    setRejectReason('')
                  }}
                  className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  className="text-xxs font-terminal uppercase tracking-wider text-red-400 border border-red-500/40 hover:bg-red-500/10 rounded-terminal px-3 py-1.5 transition-colors"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
