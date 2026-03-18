'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
      router.push('/login?redirect=/planes')
      return
    }

    setLoading(true)
    trackCheckoutStart('PRO', 45000)
    
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

  return (
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
  )
}
