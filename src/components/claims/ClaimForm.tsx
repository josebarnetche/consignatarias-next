'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackClaimCTA } from '@/lib/analytics'

interface ClaimFormProps {
  slug: string
  displayName: string
}

export default function ClaimForm({ slug, displayName }: ClaimFormProps) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    claimant_phone: '',
    claimant_role: '',
    cuit: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
          ...form,
        }),
      })

      if (res.ok) {
        setState('success')
        return
      }

      const data = await res.json()
      setErrorMsg(data.error || 'Error al enviar el reclamo')
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
          <div className="text-positive text-lg font-terminal">RECLAMO ENVIADO</div>
          <p className="text-zinc-400 text-data font-terminal">
            Recibimos tu solicitud para <span className="text-zinc-200">{displayName}</span>.
            Te contactaremos a la brevedad por email.
          </p>
          <Link
            href={`/consignatarias/${slug}`}
            className="inline-block text-accent hover:text-accent-bright text-xxs font-terminal uppercase tracking-wider transition-colors mt-2"
          >
            &larr; Volver al perfil
          </Link>
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
          className="text-zinc-600 hover:text-accent text-xxs font-terminal transition-colors"
        >
          &larr; VOLVER
        </Link>
      </div>

      <div className="px-panel py-4 space-y-4">
        <p className="text-data text-zinc-400 font-terminal">
          Completá el formulario para reclamar el perfil de{' '}
          <span className="text-zinc-200">{displayName}</span>.
          Verificaremos tu identidad y te contactaremos.
        </p>

        {state === 'error' && (
          <div className="terminal-panel border-negative/30 px-3 py-2">
            <span className="text-negative text-data font-terminal">{errorMsg}</span>
          </div>
        )}

        {/* Email (required) */}
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
            placeholder="tu@email.com"
            className="terminal-input w-full"
          />
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label htmlFor="claimant_name" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Nombre completo
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

        {/* CUIT */}
        <div className="space-y-1">
          <label htmlFor="cuit" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            CUIT
          </label>
          <input
            id="cuit"
            name="cuit"
            type="text"
            value={form.cuit}
            onChange={handleChange}
            placeholder="20-12345678-9"
            className="terminal-input w-full"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label htmlFor="claimant_phone" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Teléfono
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

        {/* Role */}
        <div className="space-y-1">
          <label htmlFor="claimant_role" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            Rol en la empresa
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
          {state === 'submitting' ? 'Enviando...' : 'Enviar reclamo'}
        </button>
      </div>
    </form>
  )
}
