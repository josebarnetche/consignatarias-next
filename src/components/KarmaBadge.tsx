'use client'

import { useEffect, useState } from 'react'

interface KarmaData {
  loggedIn: boolean
  score?: number
  level?: string
  levelIndex?: number
  nextLevel?: string | null
  toNext?: number
  breakdown?: { arranque?: number; hacienda: number; engagement: number; tenure: number }
  inputs?: { cabezas: number; attended: number; following: number }
}

/**
 * Karma del productor — reputación como contribuidor de dato (hacienda cargada +
 * marcas + antigüedad). Es la contracara del "gratis": cuanto más aportás, más
 * karma. Se muestra al usuario logueado; anónimo → nada.
 */
export default function KarmaBadge() {
  const [k, setK] = useState<KarmaData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/karma', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setK(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!k || !k.loggedIn || k.score == null) return null

  return (
    <div className="terminal-panel">
      <div
        className="terminal-panel-header flex items-center justify-between"
        style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}
      >
        <span>Tu karma</span>
        <span className="text-xxs text-zinc-500 font-terminal tabular-nums">{k.score} pts</span>
      </div>
      <div className="px-panel py-4">
        <p className="text-zinc-500 text-xxs leading-relaxed mb-3">
          El karma es tu reputación de productor en la terminal: mide lo que aportás al dato del
          mercado — tu hacienda cargada, los remates que marcás y tu antigüedad.
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-terminal text-sky-300">{k.level}</span>
          {k.nextLevel && k.toNext != null && (
            <span className="text-zinc-500 text-data">· faltan {k.toNext} pts para {k.nextLevel}</span>
          )}
        </div>
        {k.breakdown && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {k.breakdown.arranque != null && <Chip label="Arranque" value={k.breakdown.arranque} hint="checklist" />}
            <Chip label="Hacienda" value={k.breakdown.hacienda} hint={k.inputs ? `${k.inputs.cabezas} cab` : undefined} />
            <Chip label="Marcas" value={k.breakdown.engagement} hint={k.inputs ? `${k.inputs.attended} remates · ${k.inputs.following} seguidas` : undefined} />
            <Chip label="Antigüedad" value={k.breakdown.tenure} />
          </div>
        )}
        <p className="text-zinc-600 text-xxs mt-3">
          Subí tu karma cargando tu hacienda en Mi Ganado y marcando los remates en los que estuviste.
        </p>
      </div>
    </div>
  )
}

function Chip({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[2px] border border-terminal-border px-2 py-0.5 text-xxs font-terminal text-zinc-400">
      {label} <span className="tabular-nums text-zinc-200">+{value}</span>
      {hint && <span className="text-zinc-600">· {hint}</span>}
    </span>
  )
}
