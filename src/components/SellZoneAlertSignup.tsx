'use client'

import { useState } from 'react'
import { trackAlertSubscribe } from '@/lib/analytics'

/**
 * SellZoneAlertSignup — captura de la alerta personalizada de ZONA DE VENTA
 * (FASE 1 del motor de alertas). A diferencia de PriceAlertSignup (cierre mensual,
 * sin motor de umbral), esta promesa SÍ tiene motor real detrás: el cron
 * /api/cron/sell-zone-alerts manda un mail cuando la categoría entra en zona de
 * venta (percentil alto en dólares reales).
 *
 * Es el "aha" hecho sticky: el productor ya vio el veredicto arriba; acá se lleva
 * el aviso para la PRÓXIMA vez sin tener que volver a entrar. Email-first, sin
 * login, single opt-in. Postea a /api/alertas/venta con la categoría del lote que
 * el usuario acaba de calcular y dispara trackAlertSubscribe para medir el embudo.
 */
export default function SellZoneAlertSignup({
  categoria,
  categoriaLabel,
  page,
  enZonaDeVenta = false,
}: {
  /** categoría seleccionada en la calculadora (novillos, terneros, …) */
  categoria: string
  /** etiqueta singular para el copy ('novillo', 'ternero', …) */
  categoriaLabel: string
  /** ruta de montaje, para el evento GA */
  page: string
  /** si hoy ya está en zona de venta, el copy lo refleja */
  enZonaDeVenta?: boolean
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error'); setMsg('Email inválido'); return
    }
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/alertas/venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, categoria, source: 'vender-ahora' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setState('ok')
        setMsg(`Listo — te avisamos cuando el ${categoriaLabel} entre en zona de venta.`)
        trackAlertSubscribe({ source: `alerta-venta:${categoria}`, page })
      } else {
        setState('error'); setMsg(data.error || 'No se pudo anotar. Probá de nuevo.')
      }
    } catch {
      setState('error'); setMsg('Error de red. Probá de nuevo.')
    }
  }

  return (
    <div
      className="border rounded-lg p-5"
      style={{ borderColor: 'rgba(52, 211, 153, 0.3)', background: 'rgba(52, 211, 153, 0.04)' }}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <span className="inline-flex w-6 h-6 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/iconos-color/alerta.png" alt="" className="w-4 h-4" />
        </span>
        <h3 className="text-zinc-100 text-sm font-medium">
          {enZonaDeVenta
            ? `Avisame la próxima vez que el ${categoriaLabel} entre en zona de venta`
            : `Avisame cuando el ${categoriaLabel} entre en zona de venta`}
        </h3>
      </div>
      <p className="text-zinc-400 text-xs leading-relaxed mb-4 pl-8">
        Un solo mail cuando esté caro vs el año <strong className="text-zinc-300">y empiece a girar</strong> —
        no por cada movimiento, ni un &quot;vendé&quot; mientras el mercado todavía sube. Gratis, sin tarjeta.
      </p>

      {state === 'ok' ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium pl-8">
          <span className="text-lg">✓</span><span>{msg}</span>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 pl-8">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/60"
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="bg-accent hover:bg-sky-300 text-zinc-950 font-medium px-5 py-2 rounded text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {state === 'loading' ? 'Anotando…' : 'Avisame'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="text-red-400 text-xs mt-2 pl-8">{msg}</p>}
      {state !== 'ok' && (
        <p className="text-xs text-zinc-600 mt-3 pl-8">
          Te podés desuscribir cuando quieras.
        </p>
      )}
    </div>
  )
}
