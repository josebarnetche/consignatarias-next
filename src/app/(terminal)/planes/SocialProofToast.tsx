'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface RecentSignup {
  displayName: string
  province: string
  daysAgo: number
}

export default function SocialProofToast() {
  const [signup, setSignup] = useState<RecentSignup | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    async function fetchRecentSignup() {
      try {
        const supabase = createBrowserClient()
        
        // Get consignatarias that were claimed/verified in last 14 days
        const { data } = await supabase
          .from('consignatarias')
          .select('display_name, province, updated_at')
          .eq('verified', true)
          .gte('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false })
          .limit(5)

        if (data && data.length > 0) {
          // Pick a random one from recent signups
          const random = data[Math.floor(Math.random() * data.length)]
          const daysAgo = Math.floor((Date.now() - new Date(random.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          
          setSignup({
            displayName: random.display_name,
            province: random.province || 'Argentina',
            daysAgo: daysAgo
          })
        }
      } catch {
        // Silent fail - social proof is enhancement, not critical
      }
    }

    fetchRecentSignup()
  }, [])

  useEffect(() => {
    if (!signup) return

    // Show toast after 3 seconds on page
    const showTimer = setTimeout(() => {
      setVisible(true)
    }, 3000)

    // Hide after 8 seconds total (5 seconds visible)
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, 8000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [signup])

  if (!signup || !visible) return null

  const timeText = signup.daysAgo === 0 
    ? 'hoy' 
    : signup.daysAgo === 1 
      ? 'ayer' 
      : `hace ${signup.daysAgo} días`

  return (
    <div 
      className="fixed bottom-20 left-4 md:bottom-4 md:left-4 z-50 animate-in slide-in-from-left duration-500"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 max-w-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-green-500 text-sm">✓</span>
          </div>
          <div>
            <p className="text-zinc-200 text-sm font-medium">
              {signup.displayName}
            </p>
            <p className="text-zinc-500 text-xs">
              de {signup.province} se unió {timeText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
