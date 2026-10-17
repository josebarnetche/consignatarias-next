'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReviewRow } from '@/lib/dal/reviews'
import { AdminPageHeader, AdminEmpty } from '@/components/admin/kit'
import { ReasonDialog } from '@/components/admin/kit-client'

/**
 * Cola de reseñas pendientes.
 * Contratos: POST /api/admin/reviews/[id]/approve
 *            POST /api/admin/reviews/[id]/reject  { reason } (mínimo 5 caracteres, si no 400)
 */

interface Props {
  initialReviews: ReviewRow[]
  adminEmail: string
}

const nf = (n: number) => n.toLocaleString('es-AR')

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="font-terminal tracking-wider" aria-label={`${rating} de 5 estrellas`}>
      <span className="text-warning">{'★'.repeat(rating)}</span>
      <span className="text-zinc-700">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

function ageLabel(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (hours < 1) return `hace ${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 24) return `hace ${Math.round(hours)} h`
  return `hace ${Math.round(hours / 24)} d`
}

export default function ReviewsModerationClient({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rejecting, setRejecting] = useState<ReviewRow | null>(null)

  const setBusyId = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const setError = (id: string, msg: string | null) =>
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[id] = msg
      else delete next[id]
      return next
    })

  /** Saca la reseña de la cola ya mismo; si el servidor falla, la devuelve a su lugar. */
  async function act(review: ReviewRow, action: 'approve' | 'reject', reason?: string) {
    const index = reviews.findIndex((r) => r.id === review.id)
    setBusyId(review.id, true)
    setError(review.id, null)
    setReviews((prev) => prev.filter((r) => r.id !== review.id))
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/${action}`, {
        method: 'POST',
        ...(action === 'reject'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }
          : {}),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
        throw new Error(data.message || data.error || `Error ${res.status}`)
      }
    } catch (e) {
      setReviews((prev) => {
        if (prev.some((r) => r.id === review.id)) return prev
        const next = [...prev]
        next.splice(Math.min(Math.max(index, 0), next.length), 0, review)
        return next
      })
      setError(
        review.id,
        `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'}: ${
          e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'error de conexión'
        }. Probá de nuevo.`,
      )
    } finally {
      setBusyId(review.id, false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Reseñas"
        meta={`${nf(reviews.length)} por moderar`}
        description="Reseñas de productores sobre consignatarias. Lo que aprobás se publica en el perfil de la firma."
      />

      {reviews.length === 0 ? (
        <section className="terminal-panel">
          <AdminEmpty>
            No hay reseñas por moderar. Cuando un productor deje una aparece acá; las aprobadas se ven en el perfil
            de la consignataria.
          </AdminEmpty>
        </section>
      ) : (
        <ul className="space-y-px" aria-live="polite">
          {reviews.map((r) => {
            const isBusy = busy.has(r.id)
            const err = errors[r.id]
            return (
              <li key={r.id} className="terminal-panel">
                <div className="px-panel pt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={`/consignatarias/${r.consignataria_slug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-data font-terminal text-ink hover:text-accent hover:underline underline-offset-2"
                    >
                      {r.consignataria_slug}
                      <span className="sr-only"> (abre el perfil en otra pestaña)</span>
                      <span aria-hidden className="text-zinc-500"> ↗</span>
                    </Link>
                    <StarRow rating={r.rating} />
                  </div>
                  <time
                    dateTime={r.created_at}
                    title={new Date(r.created_at).toLocaleString('es-AR')}
                    className="text-xxs font-terminal text-zinc-500 tabular-nums"
                  >
                    {ageLabel(r.created_at)}
                  </time>
                </div>

                <div className="px-panel py-3 space-y-2">
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xxs font-terminal">
                    <div className="min-w-0">
                      <dt className="inline text-zinc-500">De: </dt>
                      <dd className="inline text-zinc-300">
                        {r.submitter_name}{' '}
                        <a href={`mailto:${r.submitter_email}`} className="text-zinc-500 hover:text-accent break-all">
                          &lt;{r.submitter_email}&gt;
                        </a>
                      </dd>
                    </div>
                    {r.submitter_role && (
                      <div>
                        <dt className="inline text-zinc-500">Rol: </dt>
                        <dd className="inline text-zinc-300">{r.submitter_role}</dd>
                      </div>
                    )}
                    {r.submitter_provincia && (
                      <div>
                        <dt className="inline text-zinc-500">Provincia: </dt>
                        <dd className="inline text-zinc-300">{r.submitter_provincia}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="text-data font-terminal text-ink whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  {err && (
                    <p role="alert" className="text-xxs text-negative font-terminal">
                      {err}
                    </p>
                  )}
                </div>

                <div className="px-panel py-2 border-t border-terminal-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejecting(r)}
                    disabled={isBusy}
                    aria-label={`Rechazar la reseña de ${r.submitter_name}`}
                    className="terminal-btn hover:border-negative hover:text-negative hover:bg-negative/10 disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(r, 'approve')}
                    disabled={isBusy}
                    aria-label={`Aprobar y publicar la reseña de ${r.submitter_name}`}
                    className="terminal-btn border-positive/40 text-positive hover:border-positive hover:text-positive hover:bg-positive/10 disabled:opacity-40"
                  >
                    {isBusy ? 'Guardando…' : 'Aprobar'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ReasonDialog
        open={rejecting != null}
        title="Rechazar reseña"
        description="El motivo queda guardado para auditoría. No se le manda al productor."
        placeholder="Ej.: spam · contenido inapropiado · no es una reseña real · duplicada"
        confirmLabel="Rechazar"
        minLength={5}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => {
          const r = rejecting
          setRejecting(null)
          if (r) void act(r, 'reject', reason)
        }}
      />
    </>
  )
}
