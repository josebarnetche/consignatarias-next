'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import SubscribeButton from './SubscribeButton'

/**
 * Dynamic PRO plan status indicator.
 * 
 * Shows different states:
 * - Loading: skeleton
 * - PRO user: "Tu plan actual" with management link
 * - Non-PRO: SubscribeButton component
 */
export default function ProPlanStatus() {
  const [status, setStatus] = useState<'loading' | 'pro' | 'not-pro'>('loading')

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setStatus('not-pro')
        return
      }
      
      // Entity-PRO is determined server-side (subscriptions table); the
      // consignatarias.subscription_tier column does not exist, so this client
      // widget defaults to not-pro (entity PRO is rare and gated server-side).
      setStatus('not-pro')
    })
  }, [])

  // Loading skeleton
  if (status === 'loading') {
    return (
      <div 
        className="block text-center py-2 text-data font-terminal uppercase tracking-wider animate-pulse"
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

  // Already PRO - show status with manage link
  if (status === 'pro') {
    return (
      <div className="space-y-2">
        <div 
          className="text-data text-amber-400 text-center py-2 border border-amber-500/40 flex items-center justify-center gap-2"
          style={{ 
            borderRadius: '2px',
            background: 'rgba(245, 158, 11, 0.1)',
          }}
        >
          <span className="text-amber-400">★</span>
          <span>Tu plan actual</span>
        </div>
        <a 
          href="/dashboard"
          className="block text-center text-xxs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          Administrar suscripción →
        </a>
      </div>
    )
  }

  // Not PRO - show subscribe button
  return <SubscribeButton />
}
