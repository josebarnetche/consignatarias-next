'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

/**
 * Dynamic FREE plan status indicator.
 * 
 * Shows different states:
 * - Loading: skeleton
 * - Not logged in: "Empezar gratis" CTA
 * - Logged in, no consignataria: "Reclamar perfil"
 * - Logged in, has FREE consignataria: "Plan actual"
 * - Logged in, has PRO consignataria: "Incluido"
 */
export default function FreePlanStatus() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'guest' | 'no-consig' | 'free' | 'pro'>('loading')

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setStatus('guest')
        return
      }
      
      // Check if user has a claimed consignataria
      const { data: consig } = await supabase
        .from('consignatarias')
        .select('canonical_slug, subscription_tier')
        .eq('claimed_by_email', data.user.email)
        .single()
      
      if (!consig) {
        setStatus('no-consig')
        return
      }
      
      if (consig.subscription_tier === 'PRO') {
        setStatus('pro')
      } else {
        setStatus('free')
      }
    })
  }, [])

  // Loading skeleton
  if (status === 'loading') {
    return (
      <div 
        className="text-data text-zinc-500 text-center py-2 border border-terminal-border animate-pulse"
        style={{ borderRadius: '2px' }}
      >
        ...
      </div>
    )
  }

  // Not logged in - show empezar CTA
  if (status === 'guest') {
    return (
      <button
        onClick={() => router.push('/login?redirect=/consignatarias')}
        className="w-full text-data text-zinc-400 text-center py-2 border border-terminal-border hover:border-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        style={{ borderRadius: '2px' }}
      >
        Empezar gratis →
      </button>
    )
  }

  // Logged in but no consignataria claimed
  if (status === 'no-consig') {
    return (
      <button
        onClick={() => router.push('/consignatarias')}
        className="w-full text-data text-accent text-center py-2 border border-accent/30 hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer"
        style={{ borderRadius: '2px' }}
      >
        Reclamar tu perfil →
      </button>
    )
  }

  // PRO user - free is included
  if (status === 'pro') {
    return (
      <div 
        className="text-data text-emerald-500 text-center py-2 border border-emerald-500/30 flex items-center justify-center gap-2"
        style={{ borderRadius: '2px' }}
      >
        <span>✓</span>
        <span>Incluido en PRO</span>
      </div>
    )
  }

  // FREE tier user - current plan
  return (
    <div 
      className="text-data text-zinc-500 text-center py-2 border border-terminal-border"
      style={{ borderRadius: '2px' }}
    >
      Plan actual
    </div>
  )
}
