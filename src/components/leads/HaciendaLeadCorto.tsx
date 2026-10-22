'use client'

import { useRef, useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'
import { cuitValido, formatearCuit, soloDigitos } from '@/lib/cuit'
import { CATEGORIAS_FORM, PROVINCIAS_FORM } from '@/lib/leads/contexto-pagina'

/**
 * HaciendaLeadCorto — el formulario corto de "vendo / busco hacienda" (21-10-2026).
 *
 * Va en las plantillas con tráfico que no tenían captura de hacienda (fichas de
 * consignataria y de remate, páginas de provincia de frigoríficos, /precios/*):
 * en los 30 días al 21-10 sumaron miles de vistas y cero leads. Pide sólo lo que el
 * agente (`src/lib/agente/`) necesita para ofrecer sin volver a escribirle al
 * productor: lado, categoría, cabezas, zona, un email y el CUIT. El email es
 * obligatorio porque el agente trabaja por correo — un lead sin email se descarta
 * solo. El CUIT también (José, 22-10): la operación se trabaja a nombre de alguien
 * y sin CUIT no se verifica a nadie. /api/producer-leads lo exige para estos `source`.
 *
 * Diferencias a propósito con `LeadCapture`:
 *  · No pide precio ni razón social.
 *  · Nada se abre en un modal: el formulario está a la vista, inline.
 *  · La página precarga lo que sabe (provincia/zona de la firma, del remate o de la
 *    provincia; categoría de /precios) y el `source` dice qué página lo trajo.
 */

export interface HaciendaLeadCortoProps {
  /** `<tipo>:<clave>` — ver `sourceDePagina()`. */
  source: string
  /** Ancla para enlazar el formulario desde arriba de la página. */
  id?: string
  defaultIntent?: 'vender' | 'comprar'
  presetProvince?: string
  presetZona?: string
  presetCategory?: string
  title?: string
  subtitle?: string
  className?: string
}

const LADOS = [
  { value: 'vender', label: 'Vendo hacienda' },
  { value: 'comprar', label: 'Busco hacienda' },
] as const

export default function HaciendaLeadCorto({
  source,
  id = 'vender-hacienda',
  defaultIntent = 'vender',
  presetProvince = '',
  presetZona = '',
  presetCategory = '',
  title = '¿Vendés o buscás hacienda?',
  subtitle = 'Dejá cuántas cabezas, qué categoría y dónde está. Buscamos la contraparte y te escribimos por email.',
  className = '',
}: HaciendaLeadCortoProps) {
  const [intent, setIntent] = useState<'vender' | 'comprar'>(defaultIntent)
  const [category, setCategory] = useState(presetCategory)
  const [cabezas, setCabezas] = useState('')
  const [province, setProvince] = useState(presetProvince)
  const [zona, setZona] = useState(presetZona)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cuit, setCuit] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const abierto = useRef(false)

  // "Abrir" = primer foco en el formulario. Es el escalón entre la vista y el envío.
  function marcarApertura() {
    if (abierto.current) return
    abierto.current = true
    trackValueEvent('lead_capture_open', { meta: { source, form: 'corto' } })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')
    const n = Number(cabezas)
    if (!category) return fallar('Elegí la categoría.')
    if (!n || n <= 0) return fallar('Decinos cuántas cabezas, aunque sea aproximado.')
    if (!province && !zona.trim()) return fallar('Decinos dónde está la hacienda.')
    if (name.trim().length < 2) return fallar('Decinos tu nombre.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fallar('Necesitamos un email: por ahí te escribimos.')
    if (!cuitValido(cuit)) {
      return fallar(soloDigitos(cuit).length === 11 ? 'Ese CUIT no es válido: revisá el número.' : 'Necesitamos el CUIT completo, con sus 11 dígitos.')
    }
    setState('loading')
    try {
      const res = await fetch('/api/producer-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          source,
          category,
          headCount: n,
          province: province || undefined,
          zona: zona.trim() || undefined,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          cuit: formatearCuit(cuit),
        }),
      })
      if (res.ok) {
        setState('ok')
        trackValueEvent('lead_capture_submit', { meta: { source, intent, form: 'corto' } })
      } else {
        const j = await res.json().catch(() => ({}))
        fallar(j.error || 'No pudimos enviarlo. Probá de nuevo.')
      }
    } catch {
      fallar('Error de conexión. Probá de nuevo.')
    }
  }

  function fallar(msg: string) {
    setState('error')
    setErrMsg(msg)
  }

  if (state === 'ok') {
    return (
      <div id={id} className={`terminal-panel scroll-mt-20 border-positive/40 ${className}`}>
        <div className="px-panel py-4" role="status">
          <p className="text-sm font-semibold text-positive">Recibido, {name.trim().split(' ')[0]}.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Te escribimos a {email.trim()} con los próximos pasos. Tu contacto no se pasa a nadie hasta que la contraparte acepte por escrito.
          </p>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-terminal border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-ink outline-none placeholder:text-zinc-600 focus:border-sky-500/60'
  const labelCls = 'mb-1 block text-xs text-zinc-500'

  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={`terminal-panel scroll-mt-20 border-sky-500/30 ${className}`}>
      <div className="px-panel pt-4">
        <h2 id={`${id}-titulo`} className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
      </div>
      <form onSubmit={submit} onFocus={marcarApertura} className="space-y-3 px-panel py-4" noValidate>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Qué querés hacer</legend>
          {LADOS.map((l) => (
            <label
              key={l.value}
              className={`cursor-pointer rounded-terminal border px-3 py-1.5 text-sm transition-colors ${
                intent === l.value ? 'border-sky-500/60 bg-sky-500/15 text-ink' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <input
                type="radio"
                name={`${id}-lado`}
                value={l.value}
                checked={intent === l.value}
                onChange={() => setIntent(l.value)}
                className="sr-only"
              />
              {l.label}
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>
            <span className={labelCls}>Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} required>
              <option value="">Elegí</option>
              {CATEGORIAS_FORM.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>
            <span className={labelCls}>Cabezas</span>
            <input
              value={cabezas}
              onChange={(e) => setCabezas(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              className={inputCls}
              placeholder="Ej: 120"
              required
            />
          </label>
          <label>
            <span className={labelCls}>Provincia</span>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}>
              <option value="">Elegí</option>
              {PROVINCIAS_FORM.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>
            <span className={labelCls}>Localidad</span>
            <input value={zona} onChange={(e) => setZona(e.target.value)} className={inputCls} placeholder="Ej: Villaguay" maxLength={120} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label>
            <span className={labelCls}>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nombre y apellido" autoComplete="name" required />
          </label>
          <label>
            <span className={labelCls}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tu@email.com" type="email" inputMode="email" autoComplete="email" required />
          </label>
          <label>
            <span className={labelCls}>CUIT</span>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              onBlur={() => setCuit((v) => (cuitValido(v) ? formatearCuit(v) : v))}
              className={inputCls}
              placeholder="20-12345678-9"
              inputMode="numeric"
              required
            />
          </label>
          <label>
            <span className={labelCls}>WhatsApp <span className="text-zinc-600">(opcional)</span></span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Cód. área + número" inputMode="tel" autoComplete="tel" />
          </label>
        </div>

        {state === 'error' && <p className="text-sm text-negative" role="alert">{errMsg}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={state === 'loading'}
            className="rounded-terminal bg-accent px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-sky-300 disabled:opacity-60"
          >
            {state === 'loading' ? 'Enviando…' : intent === 'vender' ? 'Buscar comprador →' : 'Buscar hacienda →'}
          </button>
          <span className="text-xs text-zinc-500">
            Tus datos no se publican: el CUIT lo usamos para verificar antecedentes antes de presentar a la contraparte. No somos consignatarios: te presentamos a la contraparte y el precio lo acuerdan ustedes.
          </span>
        </div>
      </form>
    </section>
  )
}
