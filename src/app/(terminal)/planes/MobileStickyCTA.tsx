'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { trackCheckoutStart } from '@/lib/analytics'

const PRO_PLAN_ID = 'pln_f644261ffe68462497eeb78d4363f377'

export default function MobileStickyCTA() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [entitySlug, setEntitySlug] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email)
        const { data: consig } = await supabase
          .from('consignatarias')
          .select('canonical_slug')
          .eq('claimed_by_email', data.user.email)
          .single()
        if (consig) setEntitySlug(consig.canonical_slug)
      }
    })

    // Show sticky CTA after scrolling 400px (past pricing cards)
    const handleScroll = () => {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-sm border-t border-amber-500/30 p-3 safe-area-inset-bottom">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full py-3 text-sm font-terminal uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        style={{
          border: '1px solid rgba(245, 158, 11, 0.6)',
          color: '#000',
          background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
          borderRadius: '4px',
          fontWeight: 600,
        }}
      >
        {loading ? 'Redirigiendo...' : '★ Activar PRO ahora — $45.000/mes'}
      </button>
    </div>
  )
}
