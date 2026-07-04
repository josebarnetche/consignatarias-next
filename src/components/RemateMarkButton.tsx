'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface RemateMarkButtonProps {
  /** id del remate (remates.json) para "estuve acá". */
  remateId?: string
  /** slug de consignataria para "sigo". */
  consignatariaSlug?: string
  markType: 'attended' | 'following' | 'trust'
  /** Estado inicial si el server ya lo sabe (evita el primer toggle ambiguo). */
  initialMarked?: boolean
  label: string
  labelMarked: string
}

/**
 * Botón de marca del productor ("estuve en este remate" / "sigo esta consignataria").
 * Es parte del intercambio de valor del usuario free: aporta señal real (asistencia,
 * confianza) que alimenta el karma + la data propietaria. Toggle contra
 * /api/remates/mark; usa la respuesta {marked} como verdad. Trackea cada acción.
 */
export default function RemateMarkButton({
  remateId,
  consignatariaSlug,
  markType,
  initialMarked = false,
  label,
  labelMarked,
}: RemateMarkButtonProps) {
  const [marked, setMarked] = useState(initialMarked)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/remates/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remate_id: remateId, consignataria_slug: consignatariaSlug, mark_type: markType }),
      })
      if (res.status === 401) {
        // Sin sesión → a login (free, con Google).
        trackEvent('remate_mark_login_prompt', { mark_type: markType })
        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
        return
      }
      const data = (await res.json()) as { marked?: boolean; error?: string }
      if (typeof data.marked === 'boolean') {
        setMarked(data.marked)
        trackEvent('remate_mark_toggle', { mark_type: markType, marked: data.marked, remate_id: remateId ?? null, slug: consignatariaSlug ?? null })
      }
    } catch {
      /* silencioso — no rompe la navegación */
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={marked}
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1 text-xxs font-terminal uppercase tracking-wider transition-colors disabled:opacity-50 ${
        marked
          ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/[0.08]'
          : 'border-terminal-border text-zinc-500 hover:text-zinc-200 hover:border-zinc-500'
      }`}
    >
      <span aria-hidden>{marked ? '✓' : '+'}</span>
      {marked ? labelMarked : label}
    </button>
  )
}
