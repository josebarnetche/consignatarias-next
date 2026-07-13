import { MESES, CALENDARIO_MENSUAL, SEGUNDA_CAMPANA_NOTA } from '@/lib/data/senasa-sanidad'

/**
 * Vista de 12 meses del calendario de vacunación antiaftosa. Pinta los meses de la
 * 1ra campaña (enero→abril, Res. 711/2025) y destaca el grueso (marzo). La 2da campaña
 * va como nota (2do semestre, según ente) — no se pinta mes por mes porque el mes exacto
 * lo fija el Ente Sanitario y no es citable con precisión.
 */
export default function CalendarioMensual({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {MESES.map((m) => {
          const d = CALENDARIO_MENSUAL[m]
          const primera = d.campana === '1ra'
          const segunda = d.campana === '2da'
          return (
            <div
              key={m}
              title={d.nota || (primera ? '1ra campaña' : segunda ? '2da campaña (tentativa · según ente)' : '')}
              className={[
                'rounded-terminal border px-1 py-2 text-center transition-colors',
                primera
                  ? d.grueso
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                    : 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300'
                  : segunda
                    ? 'border-dashed border-accent/40 bg-accent/[0.05] text-accent/80'
                    : 'border-terminal-border bg-terminal-panel/50 text-zinc-600',
              ].join(' ')}
            >
              <div className="text-xxs font-terminal tracking-wide">{m}</div>
              {d.grueso && <div className="mt-0.5 h-1 w-1 rounded-full bg-emerald-400 mx-auto" />}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xxs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/40" />
          1ra campaña · todas las categorías
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          grueso del país (marzo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-accent/50 bg-accent/[0.06]" />
          2da campaña · tentativa (según ente)
        </span>
      </div>

      {!compact && (
        <p className="mt-2 text-xxs text-zinc-500">{SEGUNDA_CAMPANA_NOTA}</p>
      )}
    </div>
  )
}
