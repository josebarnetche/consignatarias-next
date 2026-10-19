'use client'

import { forwardRef } from 'react'
import { X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { computeSpread } from '@/lib/leads/spread'
import { STATUS_META, arsCorto, ars, fmtFecha, hace, intentLabel, origenDe, pareceTest, provinciaLead, queBits, type Lead } from './model'

/**
 * Una fila de la bandeja: cuándo, qué quiere, quién, qué ofrece, de dónde vino y
 * cuánto vale. Click/Enter abre el detalle; la X lo descarta (spam, prueba).
 */
const LeadRow = forwardRef<
  HTMLLIElement,
  {
    lead: Lead
    selected: boolean
    showStatus: boolean
    sinGestion: boolean
    saving: boolean
    error?: string | null
    onSelect: () => void
    onDiscard: () => void
    children?: React.ReactNode
  }
>(function LeadRow({ lead: l, selected, showStatus, sinGestion, saving, error, onSelect, onDiscard, children }, ref) {
  const sp = computeSpread(l.category, l.desired_price_ars)
  const bits = queBits(l)
  const prov = provinciaLead(l)
  const test = pareceTest(l)
  const cerrado = l.status === 'discarded' || l.status === 'lost'
  const meta = STATUS_META[l.status] ?? STATUS_META.new

  return (
    <li ref={ref} className="border-b border-terminal-border last:border-b-0">
      <div
        className={`group flex items-stretch transition-colors ${
          selected ? 'bg-accent/5 shadow-[inset_2px_0_0_0_rgb(var(--accent))]' : 'hover:bg-zinc-800/20'
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          aria-label={`Abrir lead de ${l.name}`}
          className="flex min-w-0 flex-1 items-start gap-3 px-panel py-2.5 text-left focus:outline-none focus-visible:bg-accent/5"
        >
          <span className="w-12 shrink-0 pt-0.5 text-xxs tabular-nums text-zinc-500" title={fmtFecha(l.created_at)}>
            {hace(l.created_at)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge tone={l.intent === 'vender' ? 'positive' : l.intent === 'comprar' ? 'accent' : 'neutral'}>
                {intentLabel(l.intent)}
              </Badge>
              <span className={`truncate text-data font-terminal ${cerrado ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-ink'}`}>
                {l.name}
              </span>
              {showStatus && <Badge tone={meta.tone}>{meta.label}</Badge>}
              {test && !cerrado && <Badge tone="warning">¿Prueba?</Badge>}
              {sinGestion && !cerrado && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" title="Sin trabajo registrado" aria-label="Sin trabajo registrado" />
              )}
              {saving && <span className="text-xxs text-zinc-500">guardando…</span>}
            </span>
            <span className="mt-0.5 block truncate text-xxs text-zinc-500">
              {[bits.join(' · ') || null, prov || null, origenDe(l)].filter(Boolean).join('  ·  ')}
              {sp && (
                <span
                  className={`ml-2 tabular-nums ${sp.spreadPct > 3 ? 'text-warning' : 'text-positive'}`}
                  title={`Pide vs. mercado ${ars(sp.marketPrice)}/kg`}
                >
                  {sp.spreadPct >= 0 ? '+' : ''}
                  {sp.spreadPct.toFixed(0)}% vs. mercado
                </span>
              )}
            </span>
            {error && <span className="mt-0.5 block text-xxs text-negative">{error}</span>}
          </span>
          <span className="hidden shrink-0 text-right sm:block">
            <span className="block text-data font-terminal tabular-nums text-positive" title={`Fee ${l.fee_pct}%: ${ars(l.fee_ars)}`}>
              {arsCorto(l.fee_ars)}
            </span>
            <span className="block text-xxs tabular-nums text-zinc-500" title={`Operación estimada: ${ars(l.estimated_value_ars)}`}>
              {l.estimated_value_ars ? `op. ${arsCorto(l.estimated_value_ars)}` : 'sin estimar'}
            </span>
          </span>
        </button>
        {!cerrado && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            title="Descartar (spam o prueba)"
            aria-label={`Descartar lead de ${l.name}`}
            className={`shrink-0 px-3 text-zinc-500 transition-opacity hover:text-negative disabled:opacity-30 ${
              selected ? 'opacity-100' : 'opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </li>
  )
})

export default LeadRow
