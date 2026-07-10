'use client'

import { useEffect, useMemo, useState } from 'react'
import DecimalNumberInput from '@/components/ui/DecimalNumberInput'
import { trackAlertSubscribe } from '@/lib/analytics'

/**
 * Captura liderada por la LIQUIDACIÓN (no por "novedades").
 *
 * El cluster de mayor crecimiento del sitio ("índice novillo arrendamiento") NO
 * es el que vende hacienda: es el arrendador/arrendatario/contador que liquida un
 * canon cada mes. Su trabajo es "qué número va en mi contrato este mes",
 * defendible. Por eso esta captura:
 *  - es self-contained: los inputs del contrato (kg/ha + ha) viven acá, no
 *    dependen de que el usuario haya usado el calculador antes;
 *  - muestra el canon en vivo como ancla de valor;
 *  - promete lo que SÍ entregamos hoy (el cierre mensual con TU canon ya
 *    liquidado), sin sobre-prometer semanal ni constancia PDF que aún no existen;
 *  - sincroniza el contrato con el calculador (mismo localStorage).
 *
 * Postea a /api/newsletter con source='arrendamiento-liquidacion' + kgHa/hectareas
 * (que el server guarda como lease_kg_ha/lease_hectareas) y dispara alert_subscribe.
 */
const STORAGE_KEY = 'arrendamiento-calc-v1'
const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-AR')

export default function ArrendamientoLiquidacionSignup({
  priceToday,
  page = '/mercado/arrendamiento',
}: {
  priceToday: number
  page?: string
}) {
  const [kgHa, setKgHa] = useState(4)
  const [hectareas, setHectareas] = useState(100)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  // Sincronizar con el calculador (mismo localStorage): si ya cargó su contrato, lo trae.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (s) {
        if (typeof s.kgHa === 'number' && s.kgHa > 0) setKgHa(s.kgHa)
        if (typeof s.hectareas === 'number' && s.hectareas > 0) setHectareas(s.hectareas)
      }
    } catch { /* ignore */ }
  }, [])

  const canon = useMemo(() => kgHa * hectareas * priceToday, [kgHa, hectareas, priceToday])
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error'); setMsg('Email inválido'); return
    }
    if (!(kgHa > 0 && hectareas > 0)) {
      setState('error'); setMsg('Completá los kg/ha y las hectáreas de tu contrato'); return
    }
    setState('loading'); setMsg('')

    // Persistir el contrato (compartido con el calculador) antes de mandar.
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, kgHa, hectareas }))
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'arrendamiento-liquidacion', kgHa, hectareas }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState('ok')
        setMsg(
          data.message?.includes('Ya estás')
            ? 'Ya estabas anotado ✓ — actualizamos tu contrato.'
            : `Listo — el 1° de ${nextMonth} te llega tu canon (${hectareas} ha × ${kgHa} kg) ya liquidado al cierre del mes.`,
        )
        trackAlertSubscribe({ source: 'arrendamiento-liquidacion', page })
      } else {
        setState('error'); setMsg(data.error || 'No se pudo anotar. Probá de nuevo.')
      }
    } catch {
      setState('error'); setMsg('Error de red. Probá de nuevo.')
    }
  }

  return (
    <div className="bg-gradient-to-br from-sky-500/[0.06] to-transparent border border-sky-500/20 rounded-2xl p-6 lg:p-8">
      <div className="max-w-2xl">
        <div className="text-xxs text-accent/80 uppercase tracking-widest mb-2 font-mono">Para liquidar tu contrato</div>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex w-8 h-8 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/arrendamiento.png" alt="" className="w-5 h-5" />
          </span>
          <h3 className="text-xl font-bold text-white">Tu canon, ya liquidado, cada cierre de mes</h3>
        </div>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
          Cargá tu contrato una vez y, apenas cierra el mes, te llega <strong className="text-zinc-200">el canon exacto
          de tu campo</strong> calculado al promedio del Índice Novillo — el número y el respaldo para tu liquidación.
          No el promedio genérico: <strong className="text-zinc-200">el de tu contrato</strong>. Gratis.
        </p>

        {state === 'ok' ? (
          <div className="flex items-center gap-2 text-positive font-medium">
            <span className="text-lg">✓</span><span>{msg}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {/* Contrato — inline, no depende del calculador */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Kg novillo / ha / mes</span>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-sky-500/60">
                  <DecimalNumberInput
                    value={kgHa}
                    onChange={(n) => { setKgHa(n); if (state === 'error') setState('idle') }}
                    ariaLabel="Kg novillo por hectárea por mes"
                    className="w-full bg-transparent text-white font-mono outline-none"
                  />
                  <span className="text-zinc-500 text-sm">kg</span>
                </div>
              </label>
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Superficie</span>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-sky-500/60">
                  <DecimalNumberInput
                    value={hectareas}
                    onChange={(n) => { setHectareas(n); if (state === 'error') setState('idle') }}
                    ariaLabel="Superficie en hectáreas"
                    className="w-full bg-transparent text-white font-mono outline-none"
                  />
                  <span className="text-zinc-500 text-sm">ha</span>
                </div>
              </label>
            </div>

            {/* Canon en vivo — ancla de valor antes de pedir el email */}
            {canon > 0 && (
              <p className="text-sm text-zinc-400 font-mono">
                Tu canon hoy: <span className="text-accent font-semibold">${fmt(canon)}</span>
                <span className="text-zinc-600"> ({hectareas} ha × {kgHa} kg × ${fmt(priceToday)}/kg)</span>
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 focus-within:border-sky-500/60">
                <input
                  type="email" inputMode="email" autoComplete="email" placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600"
                />
              </div>
              <button
                type="submit" disabled={state === 'loading'}
                className="bg-accent hover:bg-sky-300 text-zinc-950 font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {state === 'loading' ? 'Anotando…' : 'Recibir mi canon'}
              </button>
            </div>
          </form>
        )}
        {state === 'error' && <p className="text-red-400 text-xs mt-2">{msg}</p>}
        {state !== 'ok' && (
          <p className="text-xs text-zinc-600 mt-3">
            Sin cuenta. Un email al cierre de cada mes. Te podés desuscribir cuando quieras.
          </p>
        )}
      </div>
    </div>
  )
}
