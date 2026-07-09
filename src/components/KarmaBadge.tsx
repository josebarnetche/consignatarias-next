'use client'

import { useEffect, useState } from 'react'

interface KarmaData {
  loggedIn: boolean
  score?: number
  coins?: number
  level?: string
  levelIndex?: number
  nextLevel?: string | null
  toNext?: number
  breakdown?: { arranque?: number; hacienda: number; engagement: number; tenure: number; actividad?: number }
  inputs?: { cabezas: number; attended: number; following: number }
}

/**
 * Karma del productor — tu SALDO de coins: lo ganás usando la terminal (hacienda
 * cargada + marcas + antigüedad + actividad in-app) y lo vas a poder gastar para
 * desbloquear funciones. Un solo número, entero. Logueado → se muestra; anónimo → nada.
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
        <span className="text-xxs text-zinc-500 font-terminal tabular-nums">{Math.round(k.score ?? 0)} coins</span>
      </div>
      <div className="px-panel py-4">
        <p className="text-zinc-500 text-xxs leading-relaxed mb-3">
          El karma es tu saldo de <span className="text-sky-300">coins</span>: lo ganás usando la
          terminal — tu hacienda cargada, los remates que marcás, tu antigüedad y tu actividad — y
          lo vas a poder gastar para desbloquear funciones.
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
            {k.breakdown.actividad != null && k.breakdown.actividad > 0 && (
              <Chip label="Actividad" value={k.breakdown.actividad} hint="uso de la app" />
            )}
          </div>
        )}
        <p className="text-zinc-600 text-xxs mt-3">
          Sumá coins cargando tu hacienda en Mi Ganado, marcando los remates en los que estuviste, y
          usando la terminal.
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
