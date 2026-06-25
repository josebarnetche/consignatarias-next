'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { trackCheckoutStart, trackCheckoutRedirect } from '@/lib/analytics'

const CONSIGNATARIA_PRO_PLAN_ID = 'pln_f644261ffe68462497eeb78d4363f377'

type Audience = 'productor' | 'consignataria'

interface UserState {
  email: string | null
  isProUser: boolean // user_subscriptions.tier === 'pro'
  consignatariaSlug: string | null // claimed entity
  isConsignatariaPro: boolean // claimed consignataria has PRO subscription
}

export default function MobileStickyCTA() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const audienceParam = searchParams.get('audience')
  const audience: Audience =
    audienceParam === 'consignataria' ? 'consignataria' : 'productor'

  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)
  const [userState, setUserState] = useState<UserState>({
    email: null,
    isProUser: false,
    consignatariaSlug: null,
    isConsignatariaPro: false,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) return

      // PRO User check
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('tier, status')
        .eq('user_id', data.user.id)
        .maybeSingle()

      const isProUser = sub?.tier === 'pro' && sub.status === 'active'

      // Claimed consignataria + PRO check
      const { data: consig } = await supabase
        .from('consignatarias')
        .select('canonical_slug')
        .eq('claimed_by_email', data.user.email)
        .maybeSingle()

      setUserState({
        email: data.user.email,
        isProUser,
        consignatariaSlug: consig?.canonical_slug ?? null,
        // Entity-PRO is derived server-side; consignatarias.subscription_tier doesn't exist.
        isConsignatariaPro: false,
      })
    })

    fetch('/api/stats/pro-spots')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setSpotsRemaining(d.data.remaining)
      })
      .catch(() => {})

    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Productor flow: redirect to /upgrade (Rebill via /api/subscribe/checkout)
  async function handleProductor() {
    if (!userState.email) {
      router.push('/upgrade')
      return
    }
    setLoading(true)
    trackCheckoutStart('PRO_USER', 7900, { context: 'mobile-sticky', variant: 'productor' })
    try {
      const res = await fetch('/api/subscribe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data?.checkoutUrl) {
        trackCheckoutRedirect('PRO_USER', 7900, { context: 'mobile-sticky', variant: 'productor' })
        window.location.href = data.checkoutUrl
      } else {
        alert(data?.error || 'No se pudo generar el link de pago.')
      }
    } catch {
      alert('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Consignataria flow: /api/subscribe with the consignataria plan
  async function handleConsignataria() {
    if (!userState.email) {
      router.push(`/login?next=${encodeURIComponent('/planes?audience=consignataria')}`)
      return
    }
    setLoading(true)
    trackCheckoutStart('PRO_CONSIGNATARIA', 45000, { context: 'mobile-sticky', variant: 'consignataria' })
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: CONSIGNATARIA_PRO_PLAN_ID,
          entitySlug: userState.consignatariaSlug || 'unknown',
          entityType: 'consignataria',
        }),
      })
      const data = await res.json()
      if (data?.url) {
        trackCheckoutRedirect('PRO_CONSIGNATARIA', 45000, { context: 'mobile-sticky', variant: 'consignataria' })
        window.location.href = data.url
      } else {
        alert(data?.error || 'Error al crear el link de pago')
      }
    } catch {
      alert('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  // Hide if already entitled for the current audience
  if (audience === 'productor' && userState.isProUser) return null
  if (audience === 'consignataria' && userState.isConsignatariaPro) return null

  if (audience === 'productor') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-sm border-t border-sky-500/30 p-3 safe-area-inset-bottom">
        <button
          onClick={handleProductor}
          disabled={loading}
          className="w-full py-3 text-sm font-terminal uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          style={{
            border: '1px solid rgba(56, 189, 248, 0.6)',
            color: '#000',
            background: 'linear-gradient(to right, #38bdf8, #7dd3fc)',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          {loading ? 'Redirigiendo a pago…' : 'Activar PRO Usuario · ARS $7.900/mes →'}
        </button>
        <p className="text-center text-[10px] text-zinc-500 font-terminal mt-1.5">
          Acceso ilimitado al observatorio · Cancelás cuando quieras
        </p>
      </div>
    )
  }

  // Consignataria audience
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-sm border-t border-amber-500/30 p-3 safe-area-inset-bottom">
      <button
        onClick={handleConsignataria}
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
        {loading
          ? 'Redirigiendo a pago…'
          : spotsRemaining !== null && spotsRemaining <= 15
            ? `★ Asegurar PRO Consignataria — Solo ${spotsRemaining} lugares a $45.000`
            : '★ Asegurar PRO Consignataria $45.000/mes — Precio fundador'}
      </button>
      <p className="text-center text-[10px] text-zinc-500 font-terminal mt-1.5">
        Cancelás cuando quieras · Sin permanencia
      </p>
    </div>
  )
}
