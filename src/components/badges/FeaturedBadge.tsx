'use client'

import { useEffect, useState } from 'react'

interface FeaturedBadgeProps {
  slug: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * "Destacado del Mes" badge for top-performing consignatarias.
 * Shows dynamically based on monthly rankings.
 * Top 10% by activity (remates + views) get the badge.
 */
export default function FeaturedBadge({ slug, size = 'sm', className = '' }: FeaturedBadgeProps) {
  const [isFeatured, setIsFeatured] = useState(false)
  const [month, setMonth] = useState('')

  useEffect(() => {
    // Check if this consignataria is featured this month
    async function checkFeatured() {
      try {
        const res = await fetch(`/api/featured/check?slug=${slug}`)
        if (res.ok) {
          const data = await res.json()
          setIsFeatured(data.featured)
          setMonth(data.month || '')
        }
      } catch {
        // Silently fail - badge just won't show
      }
    }
    checkFeatured()
  }, [slug])

  if (!isFeatured) return null

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5'

  return (
    <span 
      className={`inline-flex items-center bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400 font-medium rounded-full ${sizeClasses} ${className}`}
      title={`Destacado ${month} - Top 10% por actividad`}
    >
      <span className="animate-pulse">🏆</span>
      <span className="uppercase tracking-wider">Destacado {month}</span>
    </span>
  )
}

/**
 * Static version for server rendering (no API call).
 * Pass isFeatured and month directly.
 */
export function FeaturedBadgeStatic({ 
  isFeatured, 
  month, 
  size = 'sm',
  className = '' 
}: { 
  isFeatured: boolean
  month: string
  size?: 'sm' | 'md'
  className?: string 
}) {
  if (!isFeatured) return null

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5'

  return (
    <span 
      className={`inline-flex items-center bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400 font-medium rounded-full ${sizeClasses} ${className}`}
      title={`Destacado ${month} - Top 10% por actividad`}
    >
      <span>🏆</span>
      <span className="uppercase tracking-wider">Destacado {month}</span>
    </span>
  )
}
