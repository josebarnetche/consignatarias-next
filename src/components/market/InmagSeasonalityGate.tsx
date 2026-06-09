'use client'

import type { ReactNode } from 'react'
import { ProReveal } from '@/components/pro'

interface Props {
  recentSvg: string // last ~3 years — free gancho
  recentYears: number
  fullFromYear: number
  toYear: number
  bestMonth: string
  worstMonth: string
  currentMonth: string
  currentReading: string
  currentRank: number // 0 = mejor mes; total-1 = peor
  totalMonths: number
  fullPanel: ReactNode // the PRO 12-month ranking + decade heatmap, pre-rendered server-side
}

/**
 * Gate de la estacionalidad del INMAG en el patrón <ProReveal>.
 *
 * - GANCHO GRATIS (siempre visible, incluso anónimo): el heatmap de los años
 *   recientes + el titular de la decisión (mejor/peor mes histórico + lectura
 *   del mes en curso). Data pública, valor por sí solo.
 * - CAPA PRO (dentro de <ProReveal>): el ranking mes a mes de la década completa
 *   con el z-score promedio de cada mes — la lectura fina que decide retener vs.
 *   vender. El no-PRO ve la FORMA borrosa (el skeleton neutro de <ProReveal>),
 *   nunca los números del ranking.
 */
export default function InmagSeasonalityGate({
  recentSvg,
  recentYears,
  fullFromYear,
  toYear,
  bestMonth,
  worstMonth,
  currentMonth,
  currentReading,
  currentRank,
  totalMonths,
  fullPanel,
}: Props) {
  // Posición del mes actual en el ranking, en lenguaje llano (gancho gratis).
  const rankLabel =
    currentRank < 0
      ? null
      : currentRank <= 2
        ? `top ${currentRank + 1} de ${totalMonths} meses más firmes`
        : currentRank >= totalMonths - 3
          ? `entre los ${totalMonths - currentRank} meses más flojos`
          : `mes ${currentRank + 1}.º de ${totalMonths} en firmeza`

  return (
    <>
      {/* ---- GANCHO GRATIS ---- */}
      <div className="px-panel py-4" dangerouslySetInnerHTML={{ __html: recentSvg }} />

      <div className="px-panel pb-4 grid sm:grid-cols-2 gap-3">
        <div className="border border-[#34d399]/25 bg-[#34d399]/[0.05] rounded px-4 py-3">
          <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
            Mejor mes para vender (histórico)
          </div>
          <div className="text-[#34d399] font-terminal text-2xl tabular-nums leading-none">
            {bestMonth}
          </div>
        </div>
        <div className="border border-[#f87171]/25 bg-[#f87171]/[0.05] rounded px-4 py-3">
          <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
            Peor mes para vender (histórico)
          </div>
          <div className="text-[#f87171] font-terminal text-2xl tabular-nums leading-none">
            {worstMonth}
          </div>
        </div>
      </div>

      {/* Lectura del mes en curso — la decisión, gratis, como anzuelo. */}
      <div className="px-panel pb-4">
        <div className="border border-terminal-border rounded px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
              {currentMonth} hoy
            </span>
            {rankLabel && (
              <span className="text-[#38bdf8] text-xxs font-terminal uppercase tracking-wider">
                {rankLabel}
              </span>
            )}
          </div>
          <p className="text-zinc-300 text-data leading-relaxed">{currentReading}</p>
        </div>
      </div>

      {/* ---- CAPA PRO: el ranking completo de la década ---- */}
      <div className="px-panel pb-2">
        <ProReveal
          from="/mercado/inmag"
          title={`La década completa — ranking mes a mes (${fullFromYear}–${toYear})`}
          benefit={`El z-score promedio de los 12 meses sobre ${toYear - fullFromYear + 1} años: cuánto suele estar cada mes por encima o por debajo de su propio año. Es la lectura que decide retener o vender.`}
        >
          {fullPanel}
        </ProReveal>
      </div>

      {/* Nota: estás viendo los recientes; PRO abre la década. Solo informativo;
          el gate real es el panel de arriba. */}
      <div className="px-panel pb-2 text-zinc-600 text-xxs">
        El heatmap muestra los últimos {recentYears} años. El ranking PRO usa la
        década completa ({fullFromYear}–{toYear}).
      </div>
    </>
  )
}
