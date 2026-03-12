'use client'

import { useState, useEffect } from 'react'

interface CountdownBadgeProps {
  /** Auction time in "HH:MM" format (ART) */
  auctionTime: string
  /** Auction date in "YYYY-MM-DD" format */
  auctionDate: string
  /** Fallback to render when outside 30-min window */
  fallback: React.ReactNode
}

/**
 * Shows a countdown "EN MM:SS" when ≤30 minutes remain before an auction.
 * Outside the 30-min window, renders the fallback (typically a "HOY" badge).
 * Uses 1-second interval for real-time updates.
 */
export default function CountdownBadge({ auctionTime, auctionDate, fallback }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState<number | null>(() => calcRemaining(auctionDate, auctionTime))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(auctionDate, auctionTime))
    }, 1000)
    return () => clearInterval(id)
  }, [auctionDate, auctionTime])

  // Only show countdown when 0 < remaining ≤ 1800 (30 min)
  if (remaining === null || remaining <= 0 || remaining > 1800) {
    return <>{fallback}</>
  }

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0')
  const ss = (remaining % 60).toString().padStart(2, '0')

  return (
    <span className="live-badge-amber" role="timer" aria-label={`Comienza en ${mm}:${ss}`}>
      <span className="font-terminal tabular-nums">EN {mm}:{ss}</span>
    </span>
  )
}

/**
 * Calculate seconds remaining until auction start in ART timezone.
 */
function calcRemaining(dateStr: string, timeStr: string): number | null {
  try {
    const [h, m] = timeStr.split(':').map(Number)
    // Build target datetime in ART
    const now = new Date()
    const artNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

    const artTarget = new Date(artNow)
    const [year, month, day] = dateStr.split('-').map(Number)
    artTarget.setFullYear(year, month - 1, day)
    artTarget.setHours(h, m, 0, 0)

    const diffMs = artTarget.getTime() - artNow.getTime()
    return Math.floor(diffMs / 1000)
  } catch {
    return null
  }
}
