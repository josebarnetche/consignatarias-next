'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

interface NewsletterSignupProps {
  source?: string
  buttonText?: string
  placeholder?: string
  compact?: boolean
  /** Promesa declarada arriba del form (qué recibís y cada cuánto). */
  promise?: string
}

export default function NewsletterSignup({
  source = 'cierre-mensual',
  buttonText = 'Suscribirme',
  placeholder = 'tu@email.com',
  compact = false,
  promise = 'El número del novillo para tu arrendamiento, cada mes. Gratis.',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus('loading')
    
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Suscripción exitosa')
        setEmail('')
        // Ledger (recurrencia w8): antes newsletter_subscribe no lo emitía nadie.
        trackValueEvent('newsletter_subscribe', { meta: { source } })
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al suscribirse')
      }
    } catch {
      setStatus('error')
      setMessage('Error de conexión')
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 5000)
  }

  return (
    <div className={`w-full ${compact ? 'max-w-sm' : 'max-w-md'}`}>
      {!compact && promise && (
        <div className="flex items-start gap-2.5 mb-3">
          <span className="inline-flex w-8 h-8 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/campana.png" alt="" className="w-5 h-5" />
          </span>
          <p className="text-sm text-zinc-400 leading-relaxed">{promise}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className={`flex ${compact ? 'flex-row gap-2' : 'flex-col sm:flex-row gap-3'} w-full`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          disabled={status === 'loading' || status === 'success'}
          className={`flex-1 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`${compact ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'} bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
        >
          {status === 'loading' ? 'Enviando...' : status === 'success' ? '✓ Listo' : buttonText}
        </button>
      </form>

      {message && (
        <div className={`mt-2 text-xs ${status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status === 'success' ? 'Listo, ya estás. El 1° te llega el cierre.' : message}
        </div>
      )}
    </div>
  )
}
