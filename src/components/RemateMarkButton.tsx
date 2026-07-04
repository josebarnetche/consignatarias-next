'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useRemateMarks } from './RemateMarksContext'

interface RemateMarkButtonProps {
  /** id del remate (remates.json) para "estuve acá". */
  remateId?: string
  /** slug de consignataria para "sigo". */
  consignatariaSlug?: string
  markType: 'attended' | 'following' | 'trust'
  /** Estado inicial (fallback cuando no hay context). */
  initialMarked?: boolean
  label: string
  labelMarked: string
}

/**
 * Botón de marca del productor ("estuve en este remate" / "sigo esta consignataria")
 * con social proof: para 'attended' con remateId usa el RemateMarksContext para
 * mostrar "X fueron" y compartir el estado/contador entre botones. Toggle contra
 * /api/remates/mark; trackea cada acción.
 */
export default function RemateMarkButton({
  remateId,
  consignatariaSlug,
  markType,
  initialMarked = false,
  label,
  labelMarked,
}: RemateMarkButtonProps) {
  const { counts, mine, bump } = useRemateMarks()
  const useCtx = markType === 'attended' && !!remateId
  const key = remateId ?? ''

  const [localMarked, setLocalMarked] = useState(initialMarked)
  const [loading, setLoading] = useState(false)

  const marked = useCtx ? mine.has(key) : localMarked
  const count = useCtx ? counts[key] ?? 0 : 0

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
        trackEvent('remate_mark_login_prompt', { mark_type: markType })
        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
        return
      }
      const data = (await res.json()) as { marked?: boolean; error?: string }
      if (typeof data.marked === 'boolean') {
        if (useCtx) bump(key, data.marked)
        else setLocalMarked(data.marked)
        trackEvent('remate_mark_toggle', { mark_type: markType, marked: data.marked, remate_id: remateId ?? null, slug: consignatariaSlug ?? null })
      }
    } catch {
      /* silencioso */
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
      className={`inline-flex items-center gap-1 rounded-[2px] border px-2 py-1 text-xxs font-terminal uppercase tracking-wider transition-colors disabled:opacity-50 ${
        marked
          ? 'border-sky-500/60 text-sky-300 bg-sky-500/[0.08]'
          : 'border-terminal-border text-zinc-500 hover:text-zinc-200 hover:border-zinc-500'
      }`}
      title={count > 0 ? `${count} ${count === 1 ? 'productor fue' : 'productores fueron'} a este remate` : undefined}
    >
      <span aria-hidden>{marked ? '✓' : '+'}</span>
      {marked ? labelMarked : label}
      {useCtx && count > 0 && (
        <span className="text-zinc-500 normal-case">· {count} {count === 1 ? 'fue' : 'fueron'}</span>
      )}
    </button>
  )
}
