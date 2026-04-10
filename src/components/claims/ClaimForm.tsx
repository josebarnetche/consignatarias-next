'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { trackClaimCTA } from '@/lib/analytics'

interface ClaimFormProps {
  slug: string
  displayName: string
}

/** Save email for abandonment recovery (fire-and-forget) */
function captureEmailForRecovery(email: string, slug: string) {
  if (!email || !email.includes('@')) return
  fetch('/api/form-abandonment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, slug, form_type: 'claim' }),
  }).catch(() => {}) // Silent fail
}

export default function ClaimForm({ slug, displayName }: ClaimFormProps) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
  })
  const [emailCaptured, setEmailCaptured] = useState(false)

  // Capture email on blur for abandonment recovery
  const handleEmailBlur = useCallback(() => {
    if (!emailCaptured && form.claimant_email) {
      captureEmailForRecovery(form.claimant_email, slug)
      setEmailCaptured(true)
    }
  }, [emailCaptured, form.claimant_email, slug])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (state === 'error') {
      setErrorMsg('')
      setState('idle')
    }
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')

    trackClaimCTA(slug, displayName)

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consignataria_slug: slug,
          claimant_name: form.claimant_name,
          claimant_email: form.claimant_email,
          // These will be collected later in onboarding
          claimant_phone: null,
          claimant_role: null,
          cuit: null,
        }),
      })

      if (res.ok) {
        setState('success')
        return
      }

      const data = await res.json()
      setErrorMsg(data.error || 'Error al enviar la solicitud')
      setState('error')
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="terminal-panel border-positive/30">
        <div className="px-panel py-6 text-center space-y-4">
          <div className="text-positive text-lg font-terminal">🎉 ¡LISTO!</div>
          
          <p className="text-zinc-300 text-data font-terminal">
            Tu perfil de <span className="text-zinc-100 font-semibold">{displayName}</span> está siendo activado.
          </p>
          
          <div className="terminal-panel bg-zinc-900/50 px-4 py-3 space-y-2">
            <p className="text-zinc-200 text-data font-terminal">
              📬 Revisá tu email:
            </p>
            <p className="text-accent font-terminal text-sm">{form.claimant_email}</p>
            <p className="text-zinc-500 text-xxs font-terminal">
              El enlace de acceso llega en menos de 2 minutos.
            </p>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/consignatarias/${slug}`}
              className="text-accent hover:text-accent-bright text-xxs font-terminal uppercase tracking-wider transition-colors"
            >
              ← Ver mi perfil público
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">RECLAMAR PERFIL</span>
        <Link
          href={`/consignatarias/${slug}`}
          className="text-zinc-500 hover:text-accent text-xxs font-terminal transition-colors"
        >
          ← VOLVER
        </Link>
      </div>

      <div className="px-panel py-4 space-y-4">
        {/* Social proof */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded">
          <span className="text-amber-400">🏆</span>
          <span className="text-amber-300/90 text-xs font-terminal">
            47 consignatarias ya administran su perfil gratis
          </span>
        </div>

        <p className="text-data text-zinc-400 font-terminal">
          Reclamá el perfil de <span className="text-zinc-200 font-semibold">{displayName}</span> en 30 segundos.
        </p>

        {state === 'error' && (
          <div className="terminal-panel border-negative/30 px-3 py-2 space-y-2">
            <span className="text-negative text-data font-terminal">{errorMsg}</span>
            {errorMsg.includes('ya') && (
              <p className="text-zinc-400 text-xxs font-terminal">
                ¿Es tu perfil?{' '}
                <Link href="/login" className="text-accent hover:text-accent-bright underline">
                  Ingresá acá
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Name (required) */}
        <div className="space-y-1">
          <label htmlFor="claimant_name" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Tu nombre
          </label>
          <input
            id="claimant_name"
            name="claimant_name"
            type="text"
            required
            value={form.claimant_name}
            onChange={handleChange}
            placeholder="Juan Pérez"
            className="terminal-input w-full"
            autoComplete="name"
          />
        </div>

        {/* Email (required) */}
        <div className="space-y-1">
          <label htmlFor="claimant_email" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Email de la consignataria
          </label>
          <input
            id="claimant_email"
            name="claimant_email"
            type="email"
            required
            value={form.claimant_email}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            placeholder="info@tuconsignataria.com"
            className="terminal-input w-full"
            autoComplete="email"
          />
          <p className="text-zinc-600 text-xxs font-terminal">Te enviaremos el acceso a este email</p>
        </div>

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="w-full px-4 py-3 bg-positive text-zinc-900 text-sm font-bold uppercase tracking-wider hover:bg-positive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          {state === 'submitting' ? 'Enviando...' : 'Reclamar gratis →'}
        </button>

        {/* What you get */}
        <div className="pt-3 border-t border-zinc-800">
          <p className="text-xxs text-zinc-500 uppercase tracking-wider mb-2 font-terminal">
            Al reclamar tu perfil:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-400 font-terminal">
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Editás tu información de contacto
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Publicás tus propios remates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Recibís consultas de compradores
            </li>
            <li className="flex items-center gap-2">
              <span className="text-positive">✓</span>
              Badge de perfil verificado
            </li>
          </ul>
        </div>

        <p className="text-center text-zinc-600 text-xxs font-terminal">
          100% gratis · Sin tarjeta · 30 segundos
        </p>
      </div>
    </form>
  )
}
