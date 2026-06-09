'use client'

import { useSessionTier } from '@/lib/use-session-tier'
import { ProReveal } from '@/components/pro'

/**
 * Descarga PRO del histórico INMAG completo (2015 → hoy) en CSV.
 *
 * Gating unificado al patrón <ProReveal>:
 *  - PRO  → el botón real de descarga (/api/market/inmag-export). El endpoint
 *    además re-valida el tier server-side (defensa en profundidad).
 *  - free/anon → ven la FORMA del dataset (columnas + cantidad de filas, que es
 *    estructura pública, no cifras de mercado) borrosa, con el CTA de PRO.
 *
 * `rowCount` es real (cuenta de mag_inmag_history) y se pasa desde el server.
 */
export default function InmagHistoryExport({
  rowCount,
  fromYear,
}: {
  rowCount: number
  fromYear: number
}) {
  const { tier } = useSessionTier()
  const isPro = tier === 'pro'

  // El borroso es estructura, no datos: nombres de columna + recuento de filas.
  // No filtra ninguna cifra de mercado.
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

  if (isPro) {
    return (
      <div className="terminal-panel" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
        <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
          Descarga del histórico completo (CSV)
        </div>
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
    <ProReveal
      from="/mercado/inmag"
      title="Descarga del histórico completo (CSV)"
      benefit={`Bajá las ${rowCount.toLocaleString('es-AR')} filas del INMAG (${fromYear} → hoy) en CSV para tu planilla: precio por kilo vivo y cabezas operadas, día por día.`}
    >
      {datasetShape}
    </ProReveal>
  )
}
