'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { trackCheckoutStart } from '@/lib/analytics'

const PRO_PLAN_ID = 'pln_f644261ffe68462497eeb78d4363f377'

export default function SubscribeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [entitySlug, setEntitySlug] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email)
        // Find their consignataria slug
        const { data: consig } = await supabase
          .from('consignatarias')
          .select('canonical_slug')
          .eq('claimed_by_email', data.user.email)
          .single()
        if (consig) setEntitySlug(consig.canonical_slug)
      }
      setChecking(false)
    })
  }, [])

  async function handleSubscribe() {
    if (!userEmail) {
      router.push(`/login?next=${encodeURIComponent('/planes?audience=consignataria')}`)
      return
    }

    setLoading(true)
    trackCheckoutStart('PRO_CONSIGNATARIA', 45000)
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: PRO_PLAN_ID,
          entitySlug: entitySlug || 'unknown',
          entityType: 'consignataria',
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Error al crear el link de pago')
      }
    } catch {
      alert('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div
        className="block text-center py-2 text-data font-terminal uppercase tracking-wider"
        style={{
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'rgba(251, 191, 36, 0.5)',
          background: 'rgba(245, 158, 11, 0.04)',
          borderRadius: '2px',
        }}
      >
        ...
      </div>
    )
  }

  // Logged in but no claimed consignataria - show claim prompt first
  if (userEmail && !entitySlug) {
    return (
      <div className="space-y-3">
        <div 
          className="text-center p-3 text-data"
          style={{
            border: '1px solid rgba(245, 158, 11, 0.3)',
            background: 'rgba(245, 158, 11, 0.04)',
            borderRadius: '2px',
          }}
        >
          <p className="text-zinc-300 mb-1 font-medium">
            ¡Ya casi! Solo falta un paso
          </p>
          <p className="text-zinc-500 text-xxs mb-3">
            Reclamá tu perfil gratis para activar PRO y empezar a promocionar tus remates
          </p>
          <Link 
            href="/consignatarias"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            <span>🔍</span>
            <span>Buscar mi consignataria →</span>
          </Link>
        </div>
        <p className="text-xxs text-zinc-600 text-center">
          Toma 2 minutos · ¿No la encontrás? <a href="mailto:agro@memola.com.ar" className="text-zinc-500 hover:text-zinc-400">Contactanos</a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="block w-full text-center py-2 text-data font-terminal uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        style={{
          border: '1px solid rgba(245, 158, 11, 0.5)',
          color: '#fbbf24',
          background: 'rgba(245, 158, 11, 0.08)',
          borderRadius: '2px',
        }}
      >
        {loading ? '🔒 Abriendo Rebill (pago seguro)...' : '★ Asegurar precio fundador →'}
      </button>
      {/* Risk reversal micro-copy — reduces friction at conversion point */}
      <p className="text-center text-[10px] text-zinc-500 font-terminal">
        Cancelás cuando quieras · Sin permanencia
      </p>
    </div>
  )
}
