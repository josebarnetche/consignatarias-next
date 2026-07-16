import type { PreofertaLote } from '@/lib/data/preofertas'

/* Panel genético de un toro de pedigree: árbol (padre/madre), EPD estrella y
   EPDs decodificados con barra relativa al remate. Traduce el número a beneficio
   — "transmitir valor genético a través de la pantalla". Server component. */

type EpdKey = 'pn' | 'pd' | 'am' | 'lyc' | 'pf' | 'ce'
const META: Record<EpdKey, { label: string; sigla: string; benef: string; higherBetter: boolean; unit?: string }> = {
  pd: { label: 'Peso al destete', sigla: 'P.D.', benef: 'Sus terneros pesan más al destete — el kilo que vendés.', higherBetter: true, unit: 'kg' },
  ce: { label: 'Fertilidad', sigla: 'C.E.', benef: 'Más circunferencia escrotal: preña más vacas y sus hijas se preñan antes.', higherBetter: true },
  pf: { label: 'Peso final', sigla: 'P.F.', benef: 'Novillos que llegan antes al peso de faena — ciclo más corto.', higherBetter: true, unit: 'kg' },
  am: { label: 'Aptitud materna (leche)', sigla: 'A.M.', benef: 'Hijas más lecheras: destetan terneros más pesados.', higherBetter: true },
  lyc: { label: 'Leche y crecimiento', sigla: 'L&C', benef: 'Aporte materno total al destete de su descendencia hembra.', higherBetter: true },
  pn: { label: 'Facilidad de parto', sigla: 'P.N.', benef: 'Peso moderado al nacer: partos sin complicaciones.', higherBetter: false, unit: 'kg' },
}
const ORDER: EpdKey[] = ['pd', 'ce', 'pf', 'am', 'lyc', 'pn']

const val = (l: PreofertaLote, k: EpdKey): number | null => {
  const e = l.epd
  if (!e) return null
  return k === 'lyc' ? e.lyc.v : (e[k] as { v: number }).v
}

export default function PanelGenetico({ lote, lotes }: { lote: PreofertaLote; lotes: PreofertaLote[] }) {
  if (!lote.epd) return null
  const conEpd = lotes.filter((l) => l.epd)

  // rango del remate por EPD (para posicionar la barra — honesto, este toro vs los del remate)
  const range: Record<EpdKey, { min: number; max: number }> = {} as never
  for (const k of ORDER) {
    const vs = conEpd.map((l) => val(l, k)!).filter((v) => v != null)
    range[k] = { min: Math.min(...vs), max: Math.max(...vs) }
  }
  // percentil normalizado (0..1) donde 1 = mejor
  const norm = (k: EpdKey) => {
    const v = val(lote, k)!
    const { min, max } = range[k]
    if (max === min) return 0.5
    const p = (v - min) / (max - min)
    return META[k].higherBetter ? p : 1 - p
  }
  // EPD estrella = donde este toro rankea mejor
  const star = ORDER.reduce((best, k) => (norm(k) > norm(best) ? k : best), ORDER[0])
  const fmtV = (k: EpdKey) => { const v = val(lote, k)!; return (v > 0 && META[k].higherBetter ? '+' : '') + v.toString().replace('.', ',') }

  // prec es una fracción 0..1; clampeamos para no romper el render con datos sucios.
  const dots = (prec?: number) => {
    const n = Math.max(0, Math.min(5, Math.round((prec ?? 0) * 5)))
    return '●'.repeat(n) + '○'.repeat(5 - n)
  }
  const precValida = (prec?: number): prec is number => prec != null && prec >= 0 && prec <= 1

  return (
    <div className="mt-4 rounded-terminal border border-terminal-border bg-black/20 p-3.5">
      <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-400 mb-2.5">Genética · valor de pedigree</div>

      {/* Pedigree */}
      {(lote.padre || lote.madre) && (
        <div className="mb-3">
          <div className="text-zinc-100 font-medium">{lote.nombre ?? `Lote ${lote.lote}`}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
            {lote.padre && <span className="text-zinc-400">Padre <b className="text-zinc-200">{lote.padre}</b></span>}
            {lote.madre && <span className="text-zinc-400">Madre <b className="text-zinc-200">{lote.madre}</b></span>}
          </div>
          <p className="text-zinc-600 text-xxs mt-1">Reproductor registrado — esta es la sangre que estás comprando.</p>
        </div>
      )}

      {/* EPD estrella */}
      <div className="rounded-lg border border-positive/40 bg-positive/[0.06] px-3 py-2.5 mb-3">
        <div className="text-xxs font-terminal uppercase tracking-wider text-positive">⬆ Fortaleza genética</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-zinc-100 font-semibold">{META[star].label}</span>
          <span className="font-mono font-bold text-lg text-zinc-100 tabular-nums">{fmtV(star)}{META[star].unit ? ' ' + META[star].unit : ''}</span>
        </div>
        <p className="text-sm text-zinc-300 leading-snug mt-0.5">{META[star].benef}</p>
      </div>

      {/* EPDs decodificados con barra */}
      <div className="space-y-2.5">
        {ORDER.map((k) => {
          const v = val(lote, k); if (v == null) return null
          const prec = (lote.epd![k] as { prec?: number }).prec
          const pct = Math.round(norm(k) * 100)
          return (
            <div key={k}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-zinc-300">{META[k].label} <span className="text-zinc-600 text-xxs">{META[k].sigla}</span></span>
                <span className="font-mono text-zinc-100 tabular-nums shrink-0">
                  {fmtV(k)}{META[k].unit ? ' ' + META[k].unit : ''}
                  {precValida(prec) && <span className="text-zinc-600 text-xxs ml-1.5" title={`Precisión ${prec}`}>{dots(prec)}</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-positive/70" style={{ width: `${Math.max(6, pct)}%` }} />
              </div>
              <p className="text-zinc-600 text-xxs mt-0.5">{META[k].benef}</p>
            </div>
          )
        })}
      </div>
      <p className="text-zinc-700 text-[10px] mt-2.5 pt-2 border-t border-terminal-border/60">
        EPD = diferencia esperada en la progenie vs. la media de la raza. La barra ubica a este toro entre los del remate. ● = precisión del dato.
      </p>
    </div>
  )
}
