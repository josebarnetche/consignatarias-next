'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * Form de captura de lead para consignatarias SIN contacto público
 * (whatsapp/tel/email/web). Antes esas firmas eran un dead-end ("Sin datos de
 * contacto"). Ahora el productor deja sus datos, los guardamos (/api/leads) y
 * podemos derivarlos / usarlos para reclamar la firma. Se mide como `lead_form`.
 */
export default function ContactlessLeadForm({
  slug,
  consignatariaName,
}: {
  slug: string
  consignatariaName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          phone: phone || undefined,
          email: email || undefined,
          source: 'profile',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar. Probá de nuevo.')
        return
      }
      setSent(true)
      trackValueEvent('lead_form', { entityType: 'consignataria', entitySlug: slug })
    } catch {
      setError('Error de conexión.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-sm text-positive">
        ✅ Listo. Recibimos tus datos y te vamos a contactar.
      </div>
    )
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="text-xs text-zinc-500">Esta firma todavía no publicó contacto.</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-terminal bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-sm font-semibold text-white transition-colors"
        >
          Pedí que te contacten
        </button>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-terminal border border-terminal-border bg-terminal-bg/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500'

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="text-xs text-zinc-500">Dejanos tus datos y te contactamos por {consignatariaName}.</div>
      <input className={inputCls} placeholder="Tu nombre *" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={inputCls} type="tel" placeholder="Teléfono / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <div className="text-sm text-red-400">{error}</div>}
      <button
        type="submit"
        disabled={sending || !name || (!phone && !email)}
        className="rounded-terminal bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 px-3 py-2 text-sm font-semibold text-white transition-colors"
      >
        {sending ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  )
}
