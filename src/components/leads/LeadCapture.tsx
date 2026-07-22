'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * LeadCapture — captura de intención de productor para el negocio comisionista.
 * El productor pide un SERVICIO ("te conseguimos comprador / campo / arrendatario"):
 * deja qué quiere, cuánto, en qué zona y a qué precio. La data va a `producer_leads`
 * (Supabase) y dispara la alerta al founder, que trabaja el lead y comisiona / captura
 * el spread de precio. NO se le promete conectar con una consignataria puntual.
 *
 * Dos presentaciones:
 *  - variant="card": banner con progressive-disclosure (bajo perfil, para embeber).
 *  - variant="section": sección dedicada, siempre visible, promocionada como servicio.
 */

const INTENTS: Array<{ value: string; label: string }> = [
  { value: 'vender', label: 'Vender hacienda' },
  { value: 'comprar', label: 'Comprar hacienda' },
  { value: 'consignar', label: 'Consignar / rematar' },
  { value: 'arrendar', label: 'Arrendar campo' },
  { value: 'tasar', label: 'Tasar / asesorarme' },
]

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'novillos', label: 'Novillos' },
  { value: 'novillitos', label: 'Novillitos' },
  { value: 'vaquillonas', label: 'Vaquillonas' },
  { value: 'vacas', label: 'Vacas' },
  { value: 'toros', label: 'Toros' },
  { value: 'terneros', label: 'Terneros' },
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
  /** Presentación: 'card' (banner colapsable) o 'section' (dedicada, siempre visible). */
  variant?: 'card' | 'section'
  /** Intención por defecto según el contexto de la página. */
  defaultIntent?: string
  /** Opciones del dropdown de intención. Si se omite, usa el set completo. */
  intents?: Array<{ value: string; label: string }>
  /** Provincia pre-cargada si la página la conoce. */
  presetProvince?: string
  /** Categoría contextual fija (no se muestra); mejora la estimación. Ignorada si askCategory. */
  presetCategory?: string
  /** Si true, muestra un selector de categoría de hacienda (novillos, vacas…). */
  askCategory?: boolean
  /** Campo cantidad: cabezas (venta) o hectáreas (arrendamiento). */
  quantityField?: 'headCount' | 'hectareas'
  quantityLabel?: string
  quantityPlaceholder?: string
  /** Si true, pide el precio deseado (el spread es negocio). */
  askPrice?: boolean
  priceLabel?: string
  pricePlaceholder?: string
  emoji?: string
  /** Etiqueta chica arriba del título (solo variant="section"). Sin mención de costo. */
  badge?: string
  title?: string
  subtitle?: string
  /** Texto del botón de envío. */
  submitLabel?: string
  /** CTA colapsado (solo variant="card"). */
  ctaLabel?: string
  className?: string
}

export default function LeadCapture({
  source,
  variant = 'card',
  defaultIntent = 'vender',
  intents,
  presetProvince,
  presetCategory,
  askCategory = false,
  quantityField = 'headCount',
  quantityLabel,
  quantityPlaceholder,
  askPrice = false,
  priceLabel = 'Precio que buscás',
  pricePlaceholder,
  emoji = '🐄',
  badge,
  title = 'Te lo conseguimos',
  subtitle = 'Decinos qué necesitás y a qué precio. Nosotros te conseguimos la contraparte.',
  submitLabel = 'Quiero que me lo consigan →',
  ctaLabel = 'Quiero que me lo consigan →',
  className = '',
}: LeadCaptureProps) {
  const isSection = variant === 'section'
  const [open, setOpen] = useState(isSection)
  const [intent, setIntent] = useState(defaultIntent)
  const [category, setCategory] = useState(askCategory ? CATEGORIES[0].value : '')
  const [province, setProvince] = useState(presetProvince || '')
  const [zona, setZona] = useState('')
  const [quantity, setQuantity] = useState('')
  const [desiredPrice, setDesiredPrice] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const qLabel = quantityLabel ?? (quantityField === 'hectareas' ? 'Hectáreas' : 'Cabezas')
  const qPlaceholder = quantityPlaceholder ?? (quantityField === 'hectareas' ? 'Ej: 200' : 'Ej: 120')

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
      const qty = quantity ? Number(quantity) : undefined
      const res = await fetch('/api/producer-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          source,
          category: (askCategory ? category : presetCategory) || undefined,
          province: province || undefined,
          zona: zona.trim() || undefined,
          headCount: quantityField === 'headCount' ? qty : undefined,
          hectareas: quantityField === 'hectareas' ? qty : undefined,
          desiredPriceArs: desiredPrice ? Number(desiredPrice.replace(/\D/g, '')) : undefined,
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
        setErrMsg(j.error || 'No pudimos enviar tu pedido. Probá de nuevo.')
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
            <p className="mt-1 text-sm text-zinc-400">Ya lo estamos moviendo. Te contactamos por email a la brevedad.</p>
          </div>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/60'
  const labelCls = 'mb-1 block text-xs text-zinc-500'

  const formEl = (
    <form onSubmit={submit} className={`space-y-3 ${isSection ? '' : 'border-t border-sky-500/15 p-5 pt-4'}`}>
      <div className="grid grid-cols-2 gap-3">
        {(intents ?? INTENTS).length > 1 && (
          <label className="col-span-2 sm:col-span-1">
            <span className={labelCls}>Qué necesitás</span>
            <select value={intent} onChange={(e) => setIntent(e.target.value)} className={inputCls}>
              {(intents ?? INTENTS).map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </label>
        )}
        {askCategory && (
          <label className="col-span-2 sm:col-span-1">
            <span className={labelCls}>Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        )}
        <label className="col-span-2 sm:col-span-1">
          <span className={labelCls}>Provincia</span>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}>
            <option value="">Elegí tu provincia</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="col-span-2 sm:col-span-1">
          <span className={labelCls}>Zona / localidad <span className="text-zinc-600">(opcional)</span></span>
          <input value={zona} onChange={(e) => setZona(e.target.value)} className={inputCls} placeholder="Ej: 25 de Mayo, Cnel. Suárez…" />
        </label>
        <label className="col-span-2 sm:col-span-1">
          <span className={labelCls}>{qLabel} <span className="text-zinc-600">(aprox.)</span></span>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} placeholder={qPlaceholder} />
        </label>
        {askPrice && (
          <label className="col-span-2 sm:col-span-1">
            <span className={labelCls}>{priceLabel} <span className="text-zinc-600">(opcional)</span></span>
            <input value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className={inputCls} placeholder={pricePlaceholder ?? 'Ej: 4500'} />
          </label>
        )}
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

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={state === 'loading'}
          className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {state === 'loading' ? 'Enviando…' : submitLabel}
        </button>
        <span className="text-xs text-zinc-500">Te contactamos por email · tus datos no se publican</span>
      </div>
    </form>
  )

  // --- variant="section": sección dedicada, siempre visible, framing de servicio ---
  if (isSection) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/12 via-zinc-900/60 to-zinc-900/40 ${className}`}>
        <div className="flex items-start gap-4 p-6 pb-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-2xl">{emoji}</span>
          <div className="min-w-0 flex-1">
            {badge && <span className="inline-block rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">{badge}</span>}
            <h3 className={`text-xl font-bold text-white ${badge ? 'mt-2' : ''}`}>{title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>
        <div className="px-6 pb-6">{formEl}</div>
      </div>
    )
  }

  // --- variant="card": banner con progressive disclosure ---
  return (
    <div className={`overflow-hidden rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-zinc-900/40 ${className}`}>
      <button
        type="button"
        onClick={expand}
        aria-expanded={open}
        className={`group flex w-full items-center gap-4 p-5 text-left transition-colors ${open ? 'cursor-default' : 'hover:bg-sky-500/5'}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xl">{emoji}</span>
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
          <button type="button" onClick={expand} className="w-full rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-zinc-950">
            {ctaLabel}
          </button>
        </div>
      )}

      {open && formEl}
    </div>
  )
}
