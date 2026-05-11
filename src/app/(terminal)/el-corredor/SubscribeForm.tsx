'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type State = 'idle' | 'submitting' | 'success' | 'error'

interface Props {
  source?: string
  /** If user is already logged in, we know their email server-side. */
  userEmail?: string | null
}

export function SubscribeForm({ source = 'el-corredor-landing', userEmail }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const autoFiredRef = useRef(false)

  async function submitLogged(emailToSend: string) {
    setState('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/el-corredor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend, source }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.error || 'No pudimos enviarte el PDF. Intentá de nuevo.')
        setState('error')
        return
      }
      setState('success')
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.')
      setState('error')
    }
  }

  // Auto-fire after Google OAuth bounce: ?subscribed=1&source=<this form's source>
  // Only the matching form (hero or footer) reacts, and only once per tab.
  useEffect(() => {
    if (autoFiredRef.current) return
    if (!userEmail) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') !== '1') return
    if (params.get('source') !== source) return
    const guardKey = `el-corredor-auto:${source}`
    if (sessionStorage.getItem(guardKey)) return
    sessionStorage.setItem(guardKey, '1')
    autoFiredRef.current = true
    submitLogged(userEmail)
    // Clean the URL so a refresh doesn't replay
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, source])

  // -------- LOGGED-IN PATH --------
  if (userEmail) {
    function onClickLogged() {
      submitLogged(userEmail!)
    }

    if (state === 'success') {
      return <SuccessBox email={userEmail} />
    }

    return (
      <div className="max-w-xl">
        <button
          onClick={onClickLogged}
          disabled={state === 'submitting'}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? 'Enviando…' : `Recibí El Corredor en ${userEmail}`}
        </button>
        {state === 'error' && errorMsg && (
          <p className="mt-3 text-sm font-mono text-red-400">{errorMsg}</p>
        )}
      </div>
    )
  }

  // -------- ANONYMOUS PATH --------
  async function onGoogle() {
    setState('submitting')
    setErrorMsg(null)
    const supabase = createClient()
    const next = `/el-corredor?subscribed=1&source=${encodeURIComponent(source)}`
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
    }
    // browser navigates away on success
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/el-corredor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.error || 'No pudimos procesar tu suscripción. Intentá de nuevo.')
        setState('error')
        return
      }
      setState('success')
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.')
      setState('error')
    }
  }

  if (state === 'success') {
    return <SuccessBox email={email} />
  }

  return (
    <div className="max-w-xl">
      {/* Google OAuth primary */}
      <button
        onClick={onGoogle}
        disabled={state === 'submitting'}
        className="w-full inline-flex items-center justify-center gap-3 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-mono font-medium text-sm px-5 py-3 rounded transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        <GoogleIcon />
        {state === 'submitting' ? 'Redirigiendo a Google…' : 'Continuá con Google'}
      </button>

      <div className="flex items-center gap-3 my-4">
        <hr className="flex-1 border-zinc-800" />
        <span className="text-zinc-600 text-xxs font-mono uppercase tracking-widest">o por email</span>
        <hr className="flex-1 border-zinc-800" />
      </div>

      <form onSubmit={onEmailSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tu.email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'submitting'}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={state === 'submitting' || !email.trim()}
            className="bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-xs px-5 py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {state === 'submitting' ? 'Enviando…' : 'Recibí PDF'}
          </button>
        </div>
        {state === 'error' && errorMsg && (
          <p className="mt-3 text-sm font-mono text-red-400">{errorMsg}</p>
        )}
      </form>
    </div>
  )
}

function SuccessBox({ email }: { email: string }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-5 max-w-xl">
      <div className="flex items-start gap-3">
        <div className="text-emerald-400 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <div className="text-emerald-400 font-mono font-semibold text-sm uppercase tracking-widest mb-1">
            Listo · revisá tu inbox
          </div>
          <p className="text-zinc-300 font-mono text-sm leading-relaxed">
            Te enviamos <strong>El Corredor</strong> a <strong className="text-white">{email}</strong>.
            Si no llega en 2 minutos, mirá en spam.
          </p>
          <p className="text-zinc-500 font-mono text-xs mt-3">
            La próxima edición sale el primer día hábil del próximo mes.
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
