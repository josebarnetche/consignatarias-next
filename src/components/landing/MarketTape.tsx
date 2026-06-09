'use client'

import Link from 'next/link'

export interface TapeItem {
  label: string
  value: string
  change?: number | null // % — colorea ↑/↓; null = sin variación
  href?: string
  live?: boolean // punto rojo (en vivo)
}

function Cell({ it }: { it: TapeItem }) {
  const tone =
    it.change == null ? 'text-zinc-500' : it.change >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'
  const arrow = it.change == null ? '' : it.change >= 0 ? '▲' : '▼'
  const body = (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap px-5">
      {it.live && <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse self-center" />}
      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{it.label}</span>
      <span className="font-terminal tabular-nums text-zinc-100 text-[13px]">{it.value}</span>
      {it.change != null && (
        <span className={`font-terminal tabular-nums text-[11px] ${tone}`}>
          {arrow}{Math.abs(it.change).toFixed(1)}%
        </span>
      )}
    </span>
  )
  const sep = <span className="text-zinc-700 select-none">·</span>
  return it.href ? (
    <Link href={it.href} className="hover:bg-white/[0.03] transition-colors flex items-center">
      {body}{sep}
    </Link>
  ) : (
    <span className="flex items-center">{body}{sep}</span>
  )
}

/** Cinta de mercado en vivo — latido de la página. Transform CSS (GPU), pausa en hover,
 *  se congela con prefers-reduced-motion. La data es real (props del server). */
export default function MarketTape({ items }: { items: TapeItem[] }) {
  if (!items.length) return null
  return (
    <div className="relative w-full overflow-hidden border-y border-zinc-800/80 bg-[#0b0b0e]">
      {/* fades laterales */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#0b0b0e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#0b0b0e] to-transparent" />
      <div className="flex w-max tape-track py-2" aria-hidden={false}>
        {/* duplicado x2 para loop sin costura */}
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
            {items.map((it, i) => (
              <Cell key={`${dup}-${i}`} it={it} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
