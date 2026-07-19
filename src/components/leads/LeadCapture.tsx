'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * LeadCapture — captura de intención de productor, reusable en las herramientas
 * gratis (arrendamiento, valuation, mercado, remates). Es el top-of-funnel de la
 * máquina de lead-gen: el productor pide gratis que una consignataria de su zona
 * lo contacte; nosotros ruteamos y cobramos 1% al cierre.
 *
 * UX 2027: progressive disclosure. Un banner con propuesta de valor fuerte
 * ("gratis · tu zona · te contactan") que se despliega al form sólo cuando el
 * productor decide. Menos fricción, más conversión. Terminal dark, acento cielo.
 */

const INTENTS: Array<{ value: string; label: string }> = [
  { value: 'vender', label: 'Vender hacienda' },
  { value: 'comprar', label: 'Comprar hacienda' },
  { value: 'consignar', label: 'Consignar / rematar' },
  { value: 'arrendar', label: 'Arrendar campo' },
  { value: 'tasar', label: 'Tasar / asesorarme' },
]

const PROVINCES = [
  'Buenos Aires', 'Córdoba', 'Santa Fe', 'Entre Ríos', 'La Pampa', 'Corrientes',
  'Chaco', 'Formosa', 'Santiago del Estero', 'Salta', 'Tucumán', 'San Luis',
  'Misiones', 'Mendoza', 'Río Negro', 'La Rioja', 'Catamarca', 'Jujuy',
  'Neuquén', 'Chubut', 'Santa Cruz', 'San Juan',
]

export interface LeadCaptureProps {
  /** De qué herramienta viene (analytics + ruteo). */
  source: string
  /** Intención por defecto según el contexto de la página. */
  defaultIntent?: string
  /** Cabezas pre-cargadas si la página ya las conoce. */
  presetHeadCount?: number
  /** Provincia pre-cargada si la página la conoce. */
  presetProvince?: string
  /** Categoría contextual (novillos, vacas…) — no se muestra como campo, mejora
   *  la estimación de valor/fee del lead. */
  presetCategory?: string
  title?: string
  subtitle?: string
  /** CTA colapsado (texto del banner). */
  ctaLabel?: string
  className?: string
}

export default function LeadCapture({
  source,
  defaultIntent = 'vender',
  presetHeadCount,
  presetProvince,
  presetCategory,
  title = 'Conectate con una consignataria de tu zona',
  subtitle = 'Gratis para vos. Una firma de tu región te contacta para operar tu hacienda.',
  ctaLabel = 'Que me contacte una consignataria →',
  className = '',
}: LeadCaptureProps) {
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState(defaultIntent)
  const [province, setProvince] = useState(presetProvince || '')
  const [zona, setZona] = useState('')
  const [headCount, setHeadCount] = useState<string>(presetHeadCount ? String(presetHeadCount) : '')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  function expand() {
    if (open) return
    setOpen(true)
    trackValueEvent('lead_capture_open', { meta: { source } })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')
    if (name.trim().length < 2) { setState('error'); setErrMsg('Decinos tu nombre.'); return }
    if (!phone.trim() && !email.trim()) { setState('error'); setErrMsg('Dejanos un teléfono o email.'); return }
    setState('loading')
    try {
      const res = await fetch('/api/producer-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          source,
          category: presetCategory || undefined,
          province: province || undefined,
          zona: zona.trim() || undefined,
          headCount: headCount ? Number(headCount) : undefined,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })
      if (res.ok) {
        setState('ok')
        trackValueEvent('lead_capture_submit', { meta: { source, intent } })
      } else {
        const j = await res.json().catch(() => ({}))
        setState('error')
        setErrMsg(j.error || 'No pudimos enviar tu consulta. Probá de nuevo.')
      }
    } catch {
      setState('error')
      setErrMsg('Error de conexión. Probá de nuevo.')
    }
  }

  if (state === 'ok') {
    return (
      <div className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</span>
          <div>
            <p className="font-semibold text-emerald-300">Listo, {name.split(' ')[0]}.</p>
            <p className="mt-1 text-sm text-zinc-400">Una consignataria de tu zona te va a contactar. El servicio es sin costo para vos.</p>
          </div>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/60'
  const labelCls = 'mb-1 block text-xs text-zinc-500'

  return (
    <div className={`overflow-hidden rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-zinc-900/40 ${className}`}>
      {/* Banner / CTA colapsado */}
      <button
        type="button"
        onClick={expand}
        aria-expanded={open}
        className={`group flex w-full items-center gap-4 p-5 text-left transition-colors ${open ? 'cursor-default' : 'hover:bg-sky-500/5'}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xl">🐄</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">{title}</span>
          <span className="mt-0.5 block text-sm text-zinc-400">{subtitle}</span>
        </span>
        {!open && (
          <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-transform group-hover:translate-x-0.5 sm:flex">
            {ctaLabel}
          </span>
        )}
      </button>

      {!open && (
        <div className="px-5 pb-5 sm:hidden">
          <button
            type="button"
            onClick={expand}
            className="w-full rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-zinc-950"
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {/* Form desplegado */}
      {open && (
        <form onSubmit={submit} className="space-y-3 border-t border-sky-500/15 p-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Qué necesitás</span>
              <select value={intent} onChange={(e) => setIntent(e.target.value)} className={inputCls}>
                {INTENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Provincia</span>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}>
                <option value="">Elegí tu provincia</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Zona / localidad <span className="text-zinc-600">(opcional)</span></span>
              <input value={zona} onChange={(e) => setZona(e.target.value)} className={inputCls} placeholder="Ej: Mercedes, Cnel. Suárez…" />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Cabezas <span className="text-zinc-600">(aprox., opcional)</span></span>
              <input value={headCount} onChange={(e) => setHeadCount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} placeholder="Ej: 120" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className={labelCls}>Tu nombre</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nombre y apellido" autoComplete="name" />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Teléfono / WhatsApp</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Cód. área + número" inputMode="tel" autoComplete="tel" />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={labelCls}>Email <span className="text-zinc-600">(opcional)</span></span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tu@email.com" inputMode="email" autoComplete="email" />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Algo más que quieras contar <span className="text-zinc-600">(opcional)</span></span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={inputCls} placeholder="Ej: novillos terminados para fin de mes…" />
          </label>

          {state === 'error' && <p className="text-sm text-red-400">{errMsg}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={state === 'loading'}
              className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
            >
              {state === 'loading' ? 'Enviando…' : 'Que me contacten →'}
            </button>
            <span className="text-xs text-zinc-500">Gratis · sin compromiso · tus datos no se publican</span>
          </div>
        </form>
      )}
    </div>
  )
}
