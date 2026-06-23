import { fetchChicagoCattle, type ChicagoQuote } from '@/lib/markets/chicago'
import { Delta } from '@/components/ui'

function Row({ q }: { q: ChicagoQuote }) {
  return (
    <div className="px-panel py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-data font-terminal text-zinc-200 truncate">{q.label}</div>
        <div className="text-xxs font-terminal text-zinc-500 tabular-nums">
          {q.symbol}
          {q.asOf ? ` · ${q.asOf}` : ''}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-terminal tabular-nums text-zinc-100">
          <span className="text-base">US$ {q.usdPerKg.toFixed(2)}</span>
          <span className="text-xxs text-zinc-500">/kg</span>
        </div>
        <div className="flex justify-end mt-0.5">
          <Delta change={q.changePct} />
        </div>
      </div>
    </div>
  )
}

/**
 * Referencia internacional · Chicago (CME). Novillo gordo (Live Cattle) e
 * invernada (Feeder Cattle) en USD/kg vivo — el benchmark financiero global del
 * mismo producto que cotiza el sitio. Server component; si el feed falla, no
 * renderiza nada (no rompe /mercado).
 */
export async function ChicagoReference() {
  const { liveCattle, feederCattle } = await fetchChicagoCattle()
  const rows = [liveCattle, feederCattle].filter((q): q is ChicagoQuote => q !== null)
  if (rows.length === 0) return null

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between gap-2">
        <span className="text-zinc-200 text-label tracking-widest">
          Referencia internacional · Chicago (CME)
        </span>
        <span className="text-xxs font-terminal text-zinc-500">USD/kg en pie · diferido</span>
      </div>
      <div className="divide-y divide-terminal-border">
        {rows.map((q) => (
          <Row key={q.symbol} q={q} />
        ))}
      </div>
      <div className="px-panel py-2 border-t border-terminal-border text-xxs font-terminal text-zinc-600 leading-relaxed">
        Futuros CME convertidos a USD/kg vivo (¢/lb ÷ 100 × 2,2046). Es la referencia global del
        precio de la hacienda en pie en EE.UU. — no un precio local. Cotización diferida.
      </div>
    </div>
  )
}
