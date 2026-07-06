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
  const [oauthLoading, setOauthLoading] = useState(false)
  const [next, setNext] = useState('/cuenta')

  useEffect(() => {
    // Accept both ?next= and legacy ?redirect= params, but only if same-origin
    // relative paths. Anything else (protocol-relative, absolute URLs, backslash
    // tricks) is dropped silently and we fall back to /cuenta.
    const n = searchParams.get('next') || searchParams.get('redirect')
    if (!n || typeof n !== 'string' || n.length > 512) return
    if (!n.startsWith('/')) return
    if (n.startsWith('//') || n.startsWith('/\\')) return
    setNext(n)
  }, [searchParams])

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    const supabase = createClient()
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
    if (authError) {
      setError(authError.message)
      setOauthLoading(false)
    }
    // browser navigates to Google, no need to reset loading
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Fondo de marca: el arreo (linocut), sutil detrás del panel del form */}
      <img
        src="/marca/ilus/ilu-hero-arreo.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#09090b]/60 to-[#09090b]" aria-hidden="true" />
    <div className="relative max-w-md mx-auto px-4 py-16 text-sm">
      <div className="terminal-panel rounded-xl p-6 sm:p-8 bg-[#0b0b0e]/90 backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="text-zinc-100 text-2xl font-medium mb-2">Ingresá</h1>
        <p className="text-zinc-500 text-xs font-mono">
          Accedé al detalle completo de remates, consignatarias y datos del mercado.
        </p>
      </div>

      {/* Google OAuth — primary */}
      <button
        onClick={handleGoogle}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-3 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-mono font-medium text-sm px-4 py-3 rounded transition-colors disabled:opacity-60 disabled:cursor-wait mb-4"
      >
        <GoogleIcon />
        {oauthLoading ? 'Redirigiendo a Google…' : 'Continuá con Google'}
      </button>

      <div className="flex items-center gap-3 my-6">
        <hr className="flex-1 border-zinc-800" />
        <span className="text-zinc-600 text-xxs font-mono uppercase tracking-widest">o</span>
        <hr className="flex-1 border-zinc-800" />
      </div>

      {/* Magic link — secondary */}
      {sent ? (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded p-4 text-center">
          <p className="text-emerald-400 font-mono font-medium text-sm mb-1">Enlace enviado</p>
          <p className="text-zinc-400 font-mono text-xs">
            Revisá tu inbox en <strong className="text-zinc-200">{email}</strong> y hacé click para
            ingresar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3">
          <label className="block text-xxs font-mono text-zinc-500 uppercase tracking-widest">
            Por email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-sm px-4 py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando…' : 'Enviame el enlace'}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 text-red-400 font-mono text-xs text-center">{error}</p>
      )}

      <p className="mt-8 text-zinc-600 font-mono text-xxs text-center leading-relaxed">
        Al ingresar aceptás nuestros{' '}
        <a href="/terminos" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
          términos
        </a>{' '}
        y{' '}
        <a href="/privacidad" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
          política de privacidad
        </a>
        .
      </p>
      </div>
    </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
