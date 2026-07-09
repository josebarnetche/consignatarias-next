'use client'

import { useState } from 'react'
import KarmaUnlockButton from '@/components/KarmaUnlockButton'

/**
 * Descarga del histórico INMAG completo (2015 → hoy) en CSV.
 *
 * Gating por COINS (Fase 3 del karma): el precio del día y la serie reciente son
 * gratis; el DATASET completo (bulk CSV) se desbloquea gastando los coins que el
 * usuario gana usando la terminal — sin pagar plata. Anónimo/free ve la FORMA del
 * dataset (columnas + filas, estructura pública, no cifras) y el botón de desbloqueo.
 *
 * `rowCount` es real (cuenta de mag_inmag_history), pasado desde el server.
 *
 * Nota: el endpoint /api/market/inmag-export sigue abierto — este gate es de UX/
 * valor, no una barrera dura. Endurecer el endpoint con el mismo unlock = follow-up.
 */
export default function InmagHistoryExport({
  rowCount,
  fromYear,
}: {
  rowCount: number
  fromYear: number
}) {
  const [unlocked, setUnlocked] = useState(false)

  // El "preview" es estructura, no datos: nombres de columna + recuento de filas.
  const datasetShape = (
    <div className="font-terminal text-data text-zinc-400 space-y-2">
      <div className="text-zinc-200">
        {rowCount.toLocaleString('es-AR')} filas · {fromYear} → hoy · 1 fila por día hábil
      </div>
      <div className="grid grid-cols-3 gap-2 text-xxs uppercase tracking-wider text-zinc-500">
        <span className="border border-terminal-border rounded px-2 py-1 text-center">fecha</span>
        <span className="border border-terminal-border rounded px-2 py-1 text-center">inmag_ars_kg_vivo</span>
        <span className="border border-terminal-border rounded px-2 py-1 text-center">cabezas</span>
      </div>
    </div>
  )

  const header = (
    <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
      Descarga del histórico completo (CSV)
    </div>
  )

  if (unlocked) {
    return (
      <div className="terminal-panel" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
        {header}
        <div className="px-panel py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {datasetShape}
          <a
            href="/api/market/inmag-export"
            className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-xxs font-terminal uppercase tracking-wider"
            style={{ background: 'rgba(56, 189, 248, 0.9)', color: '#000', borderRadius: '2px' }}
          >
            Descargar CSV ({fromYear}→)
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="terminal-panel" style={{ borderColor: 'rgba(56, 189, 248, 0.25)' }}>
      {header}
      <div className="px-panel py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {datasetShape}
        <div className="shrink-0">
          <KarmaUnlockButton
            unlock="inmag_history_deep"
            label="el histórico completo"
            onUnlocked={() => setUnlocked(true)}
          />
        </div>
      </div>
      <div className="px-panel pb-4 -mt-1">
        <p className="text-xxs text-zinc-600 font-terminal leading-relaxed">
          El precio del día es gratis. El dataset completo ({fromYear}→) lo desbloqueás con los coins
          que ganás usando la terminal — sin pagar.
        </p>
      </div>
    </div>
  )
}
