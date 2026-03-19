'use client'

import { useEffect, useState } from 'react'

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
        const res = await fetch('/api/stats/recent-signups')
        if (!res.ok) return
        
        const data = await res.json()
        if (data.signup) {
          setSignup(data.signup)
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
