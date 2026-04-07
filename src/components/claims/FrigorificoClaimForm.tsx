'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { trackClaimCTA } from '@/lib/analytics'

interface FrigorificoClaimFormProps {
  frigorificoName: string
  frigorificoCuit: string
}

/** Save email for abandonment recovery (fire-and-forget) */
function captureEmailForRecovery(email: string, cuit: string) {
  if (!email || !email.includes('@')) return
  fetch('/api/form-abandonment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, slug: cuit, form_type: 'frigorifico' }),
  }).catch(() => {})
}

export default function FrigorificoClaimForm({ frigorificoName, frigorificoCuit }: FrigorificoClaimFormProps) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    claimant_phone: '',
    claimant_role: '',
  })
  const [emailCaptured, setEmailCaptured] = useState(false)

  const handleEmailBlur = useCallback(() => {
    if (!emailCaptured && form.claimant_email) {
      captureEmailForRecovery(form.claimant_email, frigorificoCuit)
      setEmailCaptured(true)
    }
  }, [emailCaptured, form.claimant_email, frigorificoCuit])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')

    trackClaimCTA(frigorificoCuit, frigorificoName)

    try {
      const res = await fetch('/api/frigorifico-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frigorifico_cuit: frigorificoCuit,
          frigorifico_name: frigorificoName,
          ...form,
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
        <div className="px-panel py-6 text-center space-y-3">
          <div className="text-positive text-lg font-terminal">SOLICITUD ENVIADA</div>
          <p className="text-zinc-400 text-data font-terminal">
            Recibimos tu solicitud de registro para <span className="text-zinc-200">{frigorificoName}</span>.
            Te contactaremos a la brevedad por email.
          </p>
          <Link
            href="/frigorificos"
            className="inline-block text-accent hover:text-accent-bright text-xxs font-terminal uppercase tracking-wider transition-colors mt-2"
          >
            &larr; Volver al directorio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">REGISTRAR FRIGORIFICO</span>
        <Link
          href="/frigorificos"
          className="text-zinc-500 hover:text-accent text-xxs font-terminal transition-colors"
        >
          &larr; VOLVER
        </Link>
      </div>

      <div className="px-panel py-4 space-y-4">
        <p className="text-data text-zinc-400 font-terminal">
          Registrá tu frigorífico para reclamar el perfil de{' '}
          <span className="text-zinc-200">{frigorificoName}</span>{' '}
          <span className="text-zinc-500">(CUIT: {frigorificoCuit})</span>.
          Confirmaremos tu identidad y te contactaremos.
        </p>

        {state === 'error' && (
          <div className="terminal-panel border-negative/30 px-3 py-2">
            <span className="text-negative text-data font-terminal">{errorMsg}</span>
          </div>
        )}

        {/* Email (required) — captured on blur for recovery */}
        <div className="space-y-1">
          <label htmlFor="claimant_email" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Email *
          </label>
          <input
            id="claimant_email"
            name="claimant_email"
            type="email"
            required
            value={form.claimant_email}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            placeholder="tu@email.com"
            className="terminal-input w-full"
          />
          <p className="text-zinc-600 text-xxs font-terminal">Te contactaremos por este medio</p>
        </div>

        {/* Name (optional) */}
        <div className="space-y-1">
          <label htmlFor="claimant_name" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Nombre completo <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            id="claimant_name"
            name="claimant_name"
            type="text"
            value={form.claimant_name}
            onChange={handleChange}
            placeholder="Juan Pérez"
            className="terminal-input w-full"
          />
        </div>

        {/* Phone (optional) */}
        <div className="space-y-1">
          <label htmlFor="claimant_phone" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Teléfono <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            id="claimant_phone"
            name="claimant_phone"
            type="tel"
            value={form.claimant_phone}
            onChange={handleChange}
            placeholder="+54 9 11 1234-5678"
            className="terminal-input w-full"
          />
        </div>

        {/* Role (optional) */}
        <div className="space-y-1">
          <label htmlFor="claimant_role" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Rol en la empresa <span className="text-zinc-600">(opcional)</span>
          </label>
          <select
            id="claimant_role"
            name="claimant_role"
            value={form.claimant_role}
            onChange={handleChange}
            className="terminal-input w-full"
          >
            <option value="">Seleccionar...</option>
            <option value="titular">Titular / Dueño</option>
            <option value="socio">Socio</option>
            <option value="gerente">Gerente</option>
            <option value="administrativo">Administrativo</option>
            <option value="representante">Representante</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="w-full px-4 py-2.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? 'Enviando...' : 'Solicitar registro'}
        </button>
      </div>
    </form>
  )
}
