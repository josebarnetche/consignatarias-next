'use client'

import { useMemo, useState } from 'react'
import { familyLabel, intentLabel, nf, ars, origenLabel, sourceFamily, provinciaLead, type Lead } from './model'

/**
 * Paneles secundarios de la bandeja, plegados por defecto: de dónde vienen los
 * leads (agrupado por familia) y los cruces posibles entre puntas opuestas.
 */

function Plegable({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="terminal-panel group" open={defaultOpen}>
      <summary className="terminal-panel-header flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-zinc-500 transition-transform group-open:rotate-90">
          ▸
        </span>
        <span>{title}</span>
        <span className="tabular-nums text-zinc-500 normal-case tracking-normal">{nf(count)}</span>
      </summary>
      <div className="terminal-panel-body">{children}</div>
    </details>
  )
}

/* ---------- Por origen ---------- */

export function PorOrigen({
  leads,
  activeFamily,
  onFamily,
}: {
  leads: Lead[]
  activeFamily: string | null
  onFamily: (f: string | null) => void
}) {
  const [abierta, setAbierta] = useState<string | null>(null)

  const familias = useMemo(() => {
    const map = new Map<string, { n: number; detalle: Map<string, number> }>()
    for (const l of leads) {
      const f = sourceFamily(l.source)
      const e = map.get(f) ?? { n: 0, detalle: new Map() }
      e.n++
      const d = origenLabel(l.source)
      e.detalle.set(d, (e.detalle.get(d) || 0) + 1)
      map.set(f, e)
    }
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n)
  }, [leads])
  const max = Math.max(1, ...familias.map(([, e]) => e.n))

  return (
    <Plegable title="Por origen" count={familias.length}>
      <ul className="space-y-1">
        {familias.map(([f, e]) => {
          const detalle = [...e.detalle.entries()].sort((a, b) => b[1] - a[1])
          const activa = activeFamily === f
          return (
            <li key={f}>
              <div className="flex items-center gap-2 text-data">
                <button
                  type="button"
                  onClick={() => setAbierta((x) => (x === f ? null : f))}
                  title={detalle.map(([d, n]) => `${d}: ${n}`).join('\n')}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-ink"
                  aria-expanded={abierta === f}
                >
                  <span className="w-36 shrink-0 truncate text-zinc-300">{familyLabel(f)}</span>
                  <span className="relative h-1.5 flex-1 rounded-full bg-zinc-800">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-accent/60" style={{ width: `${(e.n / max) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-zinc-400">{nf(e.n)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFamily(activa ? null : f)}
                  className={`shrink-0 text-xxs ${activa ? 'text-accent' : 'text-zinc-500 hover:text-accent'}`}
                >
                  {activa ? 'Quitar filtro' : 'Filtrar'}
                </button>
              </div>
              {abierta === f && (
                <ul className="mb-2 ml-4 mt-1 space-y-0.5 border-l border-terminal-border pl-3">
                  {detalle.map(([d, n]) => (
                    <li key={d} className="flex justify-between gap-2 text-xxs text-zinc-500">
                      <span className="truncate">{d}</span>
                      <span className="tabular-nums">{nf(n)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </Plegable>
  )
}

/* ---------- Cruces posibles ---------- */

const norm = (s: string | null) => (s || '').toLowerCase().trim()
/** Vivos para cruzar puntas: mismo criterio que antes (new/routed/contacted). */
const VIVOS = ['new', 'routed', 'contacted']

export function Cruces({ leads, onOpen }: { leads: Lead[]; onOpen: (id: number) => void }) {
  const { hacienda, campo } = useMemo(() => {
    const alive = leads.filter((l) => VIVOS.includes(l.status))
    const hacienda: Array<{ a: Lead; b: Lead }> = []
    for (const s of alive.filter((l) => l.intent === 'vender')) {
      for (const b of alive.filter((l) => l.intent === 'comprar')) {
        if (s.category && b.category && norm(s.category) === norm(b.category)) hacienda.push({ a: s, b })
      }
    }
    const campo: Array<{ a: Lead; b: Lead }> = []
    for (const o of alive.filter((l) => l.intent === 'arrendar_ofrezco')) {
      for (const k of alive.filter((l) => l.intent === 'arrendar_busco')) {
        if (o.province && k.province && norm(o.province) === norm(k.province)) campo.push({ a: o, b: k })
      }
    }
    return { hacienda, campo }
  }, [leads])
  const total = hacienda.length + campo.length

  const punta = (l: Lead, rol: string) => (
    <button type="button" onClick={() => onOpen(l.id)} className="min-w-0 text-left hover:text-accent">
      <span className="mr-1.5 text-xxs uppercase tracking-wider text-zinc-500">{rol}</span>
      <span className="text-ink">{l.name}</span>
      <span className="ml-1.5 text-zinc-500">
        {[
          l.head_count ? `${nf(l.head_count)} cab` : null,
          l.hectareas ? `${nf(l.hectareas)} ha` : null,
          l.category,
          l.desired_price_ars ? `pide ${ars(l.desired_price_ars)}` : null,
          provinciaLead(l),
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </button>
  )

  return (
    <Plegable title="Cruces posibles" count={total} defaultOpen={total > 0}>
      {total === 0 ? (
        <p className="text-xxs text-zinc-500">
          Sin cruces. Hacen falta las dos puntas: vende ↔ compra de la misma categoría, u ofrece ↔ busca campo en la misma provincia.
        </p>
      ) : (
        <ul className="space-y-1.5 text-data">
          {[...hacienda, ...campo].map(({ a, b }) => (
            <li key={`${a.id}-${b.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {punta(a, intentLabel(a.intent))}
              <span aria-hidden className="text-warning">↔</span>
              {punta(b, intentLabel(b.intent))}
            </li>
          ))}
        </ul>
      )}
    </Plegable>
  )
}
