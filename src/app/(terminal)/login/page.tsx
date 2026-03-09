'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="max-w-sm mx-auto px-4 py-12">
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
            <p className="text-zinc-600 text-xxs font-terminal text-center">
              Te enviaremos un enlace mágico para ingresar sin contraseña.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
