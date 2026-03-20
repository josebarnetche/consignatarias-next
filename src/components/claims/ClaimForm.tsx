'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { trackClaimCTA } from '@/lib/analytics'

interface ClaimFormProps {
  slug: string
  displayName: string
}

/**
 * Validates Argentine CUIT/CUIL using the official modulo 11 algorithm
 * Format: XX-XXXXXXXX-X (11 digits total)
 */
function validateCUIT(value: string): boolean {
  const clean = value.replace(/\D/g, '')
  if (clean.length !== 11) return false
  
  // Valid type prefixes: 20, 23, 24, 27 (individuals), 30, 33, 34 (companies)
  const prefix = parseInt(clean.substring(0, 2))
  if (![20, 23, 24, 27, 30, 33, 34].includes(prefix)) return false
  
  // Modulo 11 verification
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = mult.reduce((acc, m, i) => acc + parseInt(clean[i]) * m, 0)
  const mod = sum % 11
  const verifier = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod
  return verifier === parseInt(clean[10])
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

  // Real-time CUIT validation
  const cuitValidation = useMemo(() => {
    const clean = form.cuit.replace(/\D/g, '')
    if (clean.length === 0) return null // Empty - no validation
    if (clean.length < 11) return 'partial' // Still typing
    return validateCUIT(form.cuit) ? 'valid' : 'invalid'
  }, [form.cuit])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    // Clear error state when user starts typing
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
        <div className="px-panel py-6 text-center space-y-4">
          {/* Changed from "PERFIL VERIFICADO" to "SOLICITUD ENVIADA" - more accurate */}
          <div className="text-positive text-lg font-terminal">📧 SOLICITUD ENVIADA</div>
          
          <p className="text-zinc-300 text-data font-terminal">
            Estamos verificando tu solicitud para <span className="text-zinc-100 font-semibold">{displayName}</span>
          </p>
          
          {/* Clear email instructions */}
          <div className="terminal-panel bg-zinc-900/50 px-4 py-3 space-y-2">
            <p className="text-zinc-200 text-data font-terminal">
              📬 Revisá tu bandeja de entrada en:
            </p>
            <p className="text-accent font-terminal text-sm">{form.claimant_email}</p>
            <p className="text-zinc-500 text-xxs font-terminal">
              ⚠️ También revisá <span className="text-zinc-400">spam/promociones</span>. El enlace expira en 1 hora.
            </p>
          </div>
          
          <p className="text-zinc-500 text-xxs font-terminal">
            Puede tardar 1-2 minutos en llegar.
          </p>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors"
            >
              Ya tengo cuenta →
            </Link>
            <Link
              href={`/consignatarias/${slug}`}
              className="text-accent hover:text-accent-bright text-xxs font-terminal uppercase tracking-wider transition-colors"
            >
              Ver perfil público
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">VERIFICAR PERFIL</span>
        <Link
          href={`/consignatarias/${slug}`}
          className="text-zinc-500 hover:text-accent text-xxs font-terminal transition-colors"
        >
          &larr; VOLVER
        </Link>
      </div>

      <div className="px-panel py-4 space-y-4">
        <p className="text-data text-zinc-400 font-terminal">
          Completa el formulario para tomar control del perfil de{' '}
          <span className="text-zinc-200">{displayName}</span>.
          Te enviaremos un enlace de acceso a tu email.
        </p>

        {state === 'error' && (
          <div className="terminal-panel border-negative/30 px-3 py-2 space-y-2">
            <span className="text-negative text-data font-terminal">{errorMsg}</span>
            {/* Show login link for 409 conflict (already claimed) */}
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

        {/* CUIT with real-time validation */}
        <div className="space-y-1">
          <label htmlFor="cuit" className="text-xxs text-zinc-500 uppercase font-terminal tracking-wider">
            CUIT
          </label>
          <div className="relative">
            <input
              id="cuit"
              name="cuit"
              type="text"
              value={form.cuit}
              onChange={handleChange}
              placeholder="20-12345678-9"
              className={`terminal-input w-full pr-10 ${
                cuitValidation === 'valid' ? 'border-positive/50' :
                cuitValidation === 'invalid' ? 'border-negative/50' : ''
              }`}
            />
            {/* Validation indicator */}
            {cuitValidation === 'valid' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-positive text-sm">✓</span>
            )}
            {cuitValidation === 'invalid' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-negative text-sm">✗</span>
            )}
          </div>
          {/* Inline error for invalid CUIT */}
          {cuitValidation === 'invalid' && (
            <p className="text-negative text-xxs font-terminal mt-1">
              CUIT inválido — verificá el número
            </p>
          )}
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
          {state === 'submitting' ? 'Verificando...' : 'Verificar y acceder'}
        </button>
      </div>
    </form>
  )
}
