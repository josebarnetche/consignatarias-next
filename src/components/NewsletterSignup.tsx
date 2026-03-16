'use client'

import { useState } from 'react'

interface NewsletterSignupProps {
  source?: string
  buttonText?: string
  placeholder?: string
  compact?: boolean
}

export default function NewsletterSignup({ 
  source = 'homepage',
  buttonText = 'Suscribirme',
  placeholder = 'tu@email.com',
  compact = false
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
    <form onSubmit={handleSubmit} className={`flex ${compact ? 'flex-row gap-2' : 'flex-col sm:flex-row gap-3'} w-full ${compact ? 'max-w-sm' : 'max-w-md'}`}>
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
      
      {message && (
        <div className={`absolute mt-14 text-xs ${status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </div>
      )}
    </form>
  )
}
