'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePremium } from '@/lib/use-premium'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'
import { PRO_ABIERTO } from '@/lib/plan-pro'

/**
 * El gate de PAGO. No confundir con `ProReveal`, que es el de login.
 *
 * Lo que hay del otro lado se cobra: histórico profundo, exportación y alertas más allá
 * de la primera. Todo lo demás del sitio sigue abierto.
 *
 * CÓMO SE COMPORTA, Y POR QUÉ
 * Muestra siempre el `preview` —no un cartel vacío— así la página conserva su forma para
 * el visitante y para Google, y el que llega ve exactamente qué se está perdiendo. Un
 * muro que no deja ver nada no vende: espanta y además borra la página del índice.
 */
export function PremiumGate({
  children,
  preview,
  titulo,
  beneficio,
  from,
}: {
  children: ReactNode
  /** Lo que ve quien no paga. Tiene que ser el mismo bloque, recortado — no un cartel. */
  preview: ReactNode
  titulo: string
  /** Qué se lleva quien paga, en una línea concreta. */
  beneficio: string
  /** Clave para medir qué muro se ve y cuál convierte. */
  from: string
}) {
  const { premium, loading } = usePremium()
  const visto = useRef(false)

  useEffect(() => {
    if (loading || premium || visto.current) return
    visto.current = true
    trackEvent('premium_gate_view', { gate: from })
    emitValueBeacon('premium_gate_view', { meta: { gate: from } })
  }, [loading, premium, from])

  // Mientras carga se muestra el preview, no un spinner: el salto de layout es peor que
  // medio segundo de contenido recortado.
  if (premium) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-60" aria-hidden={!premium}>
        {preview}
      </div>

      <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100">{titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{beneficio}</p>
          </div>
          <Link
            href={`/pro?desde=${encodeURIComponent(from)}`}
            onClick={() => {
              trackEvent('premium_gate_click', { gate: from })
              emitValueBeacon('premium_gate_click', { meta: { gate: from } })
            }}
            className="shrink-0 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Ver PRO
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Desde ARS {PRO_ABIERTO.precio.toLocaleString('es-AR')} por mes. El precio del
          día, los remates y las guías siguen siendo gratis para todos.
        </p>
      </div>
    </div>
  )
}
