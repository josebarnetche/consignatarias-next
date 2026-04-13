'use client'

import { useEffect, useState, useCallback } from 'react'

interface RecentSignup {
  displayName: string
  province: string
  daysAgo: number
}

/**
 * SocialProofToast - Cycles through recent signups for persistent social proof
 * 
 * CLOSER optimization 2026-03-20:
 * - Now cycles through multiple signups instead of showing once
 * - Shows toast every 20 seconds (5s visible, 15s hidden)
 * - Fetches up to 5 recent signups and rotates through them
 */
export default function SocialProofToast() {
  const [signups, setSignups] = useState<RecentSignup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [cycleCount, setCycleCount] = useState(0)
  
  // Max 3 cycles to avoid annoyance
  const MAX_CYCLES = 3

  // DISABLED: Cost optimization — social proof not critical pre-revenue
  useEffect(() => {
    // async function fetchRecentSignups() {
    //   try {
    //     const res = await fetch('/api/stats/recent-signups?limit=5')
    //     if (!res.ok) return
    //     
    //     const data = await res.json()
    //     // Support both single signup and array response
    //     if (data.signups && Array.isArray(data.signups)) {
    //       setSignups(data.signups)
    //     } else if (data.signup) {
    //       setSignups([data.signup])
    //     }
    //   } catch {
    //     // Silent fail - social proof is enhancement, not critical
    //   }
    // }

    // fetchRecentSignups()
  }, [])

  const showNextToast = useCallback(() => {
    if (signups.length === 0 || cycleCount >= MAX_CYCLES) return
    
    setVisible(true)
    
    // Hide after 5 seconds
    setTimeout(() => {
      setVisible(false)
      
      // Move to next signup
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % signups.length
        // If we've shown all, increment cycle count
        if (nextIndex === 0) {
          setCycleCount(c => c + 1)
        }
        return nextIndex
      })
    }, 5000)
  }, [signups, cycleCount])

  useEffect(() => {
    if (signups.length === 0) return

    // Initial show after 3 seconds
    const initialTimer = setTimeout(showNextToast, 3000)

    // Then show every 20 seconds (but respect MAX_CYCLES)
    const intervalId = setInterval(() => {
      if (cycleCount < MAX_CYCLES) {
        showNextToast()
      }
    }, 20000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalId)
    }
  }, [signups.length, showNextToast, cycleCount])

  const currentSignup = signups[currentIndex]
  
  if (!currentSignup || !visible) return null

  const timeText = currentSignup.daysAgo === 0 
    ? 'hoy' 
    : currentSignup.daysAgo === 1 
      ? 'ayer' 
      : `hace ${currentSignup.daysAgo} días`

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
              {currentSignup.displayName}
            </p>
            <p className="text-zinc-500 text-xs">
              de {currentSignup.province} se unió {timeText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
