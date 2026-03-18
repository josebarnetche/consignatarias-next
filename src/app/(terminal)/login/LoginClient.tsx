'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginClient() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirectTo, setRedirectTo] = useState('/dashboard')

  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect) {
      setRedirectTo(redirect)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {/* Benefits section */}
      <div className="mb-6 p-4 bg-terminal-panel/50 border border-terminal-border rounded-lg">
        <h2 className="text-zinc-200 text-sm font-terminal mb-3">
          Creá tu cuenta gratis y accedé a:
        </h2>
        <ul className="space-y-2 text-xxs font-terminal">
          <li className="flex items-center gap-2 text-zinc-400">
            <span className="text-amber-500">📋</span>
            <span>Historial de guías DT-e con OCR automático</span>
          </li>
          <li className="flex items-center gap-2 text-zinc-400">
            <span className="text-amber-500">🔔</span>
            <span>Alertas de nuevos remates por provincia o tipo</span>
          </li>
          <li className="flex items-center gap-2 text-zinc-400">
            <span className="text-amber-500">📊</span>
            <span>Comparador de consignatarias y analytics</span>
          </li>
          <li className="flex items-center gap-2 text-zinc-400">
            <span className="text-amber-500">📅</span>
            <span>Calendario de remates exportable a Google/Apple</span>
          </li>
        </ul>
      </div>

      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">INGRESAR</span>
        </div>

        {sent ? (
          <div className="px-panel py-6 space-y-3 text-center">
            <p className="text-positive text-data font-terminal">Enlace enviado</p>
            <p className="text-zinc-400 text-xxs font-terminal">
              Revisá tu email ({email}) y hacé click en el enlace para ingresar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-panel py-4 space-y-3">
            <label className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="terminal-input w-full"
              placeholder="tu@email.com"
              required
              autoFocus
            />
            {error && (
              <p className="text-negative text-xxs font-terminal">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <p className="text-zinc-500 text-xxs font-terminal text-center">
              Te enviaremos un enlace mágico para ingresar sin contraseña.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
