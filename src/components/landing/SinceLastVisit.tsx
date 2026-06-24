'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackSinceLastVisitShown, trackSinceLastVisitClick } from '@/lib/analytics'

const LS_KEY = 'cnsg_last_visit'

export interface SinceLastVisitSnapshot {
  /** Fecha del último dato INMAG (YYYY-MM-DD). */
  inmagDate: string
  /** Valor INMAG vigente ($/kg). */
  inmagValue: number
  /** Variación % del INMAG vigente. */
  inmagChange?: number
  /** Remates con date>=hoy (solo necesitamos la fecha para contar nuevos). */
  rematesUpcoming: Array<{ date: string }>
  /** Última actualización del dataset (YYYY-MM-DD). */
  lastUpdate: string
}

function fmt(n: number, d = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

/**
 * Barra fina "Desde tu última visita" — retención sin backend. Lee/escribe
 * localStorage; si no hay visita previa (primer ingreso) o localStorage falla,
 * no renderiza nada (soft-fail natural).
 */
export default function SinceLastVisit({ snapshot }: { snapshot: SinceLastVisitSnapshot }) {
  const [parts, setParts] = useState<string[] | null>(null)

  useEffect(() => {
    let lastVisit: string | null = null
    try {
      lastVisit = window.localStorage.getItem(LS_KEY)
    } catch {
      return // localStorage no disponible → no renderiza
    }

    if (lastVisit) {
      const segments: string[] = []

      if (snapshot.inmagDate > lastVisit) {
        const chg =
          typeof snapshot.inmagChange === 'number'
            ? ` (${snapshot.inmagChange >= 0 ? '+' : '−'}${fmt(Math.abs(snapshot.inmagChange), 1)}%)`
            : ''
        segments.push(`INMAG $${fmt(snapshot.inmagValue)}${chg}`)
      }

      const nuevos = snapshot.rematesUpcoming.filter((r) => r.date > lastVisit!).length
      if (nuevos > 0) {
        segments.push(`${nuevos} ${nuevos === 1 ? 'remate nuevo' : 'remates nuevos'}`)
      }

      if (segments.length > 0) {
        setParts(segments)
        // La barra efectivamente se muestra → instrumentar (gate de medición).
        trackSinceLastVisitShown({
          has_delta: true,
          page: window.location.pathname,
        })
      }
    }

    // Registrar la visita actual para la próxima.
    try {
      window.localStorage.setItem(LS_KEY, new Date().toISOString())
    } catch {
      /* noop */
    }
  }, [snapshot])

  if (!parts) return null

  return (
    <Link
      href="/overview"
      onClick={() => trackSinceLastVisitClick({ page: window.location.pathname })}
      className="flex items-center gap-2 overflow-hidden border-b border-terminal-border bg-terminal-panel px-3 sm:px-4 py-2 sm:py-1.5 text-xxs font-terminal tabular-nums text-zinc-400 transition-colors hover:bg-terminal-border/30"
    >
      <span className="status-dot-live flex-shrink-0" />
      <span className="hidden sm:inline uppercase tracking-widest text-zinc-500 flex-shrink-0">Desde tu última visita</span>
      <span className="sm:hidden uppercase tracking-widest text-zinc-500 flex-shrink-0">Última visita</span>
      <span className="text-terminal-border flex-shrink-0">·</span>
      <span className="text-zinc-300 truncate">{parts.join(' · ')}</span>
    </Link>
  )
}
