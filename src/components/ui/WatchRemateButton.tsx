'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface WatchRemateButtonProps {
  remateId: number
  consignatariaSlug: string
  className?: string
  showCount?: boolean
}

/**
 * Watch/Favorite Remate Button
 * 
 * Allows users to "watch" a remate (add to their interests).
 * Creates demand signal for consignataria dashboard.
 * 
 * "X productores están mirando este remate"
 */
export default function WatchRemateButton({
  remateId,
  consignatariaSlug,
  className = '',
  showCount = true,
}: WatchRemateButtonProps) {
  const [isWatching, setIsWatching] = useState(false)
  const [watchCount, setWatchCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Get/create session ID for anonymous users
  const getSessionId = () => {
    if (typeof window === 'undefined') return null
    let sessionId = localStorage.getItem('consig_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('consig_session_id', sessionId)
    }
    return sessionId
  }

  // Check if user is watching + get count
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const sessionId = getSessionId()
        const res = await fetch(`/api/remates/${remateId}/watch?sessionId=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setIsWatching(data.isWatching)
          setWatchCount(data.count)
        }
      } catch {
        // Ignore errors
      }
    }
    checkStatus()
  }, [remateId])

  const handleToggle = async () => {
    setIsLoading(true)
    const sessionId = getSessionId()

    try {
      const res = await fetch(`/api/remates/${remateId}/watch`, {
        method: isWatching ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          consignatariaSlug 
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setIsWatching(!isWatching)
        setWatchCount(data.count)
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
        ${isWatching 
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
        }
        disabled:opacity-50
        ${className}
      `}
      title={isWatching ? 'Dejar de seguir' : 'Seguir este remate'}
    >
      {isWatching ? (
        <Eye className="w-3.5 h-3.5" />
      ) : (
        <EyeOff className="w-3.5 h-3.5" />
      )}
      <span>{isWatching ? 'Siguiendo' : 'Seguir'}</span>
      {showCount && watchCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-zinc-700/50 rounded text-[10px]">
          {watchCount}
        </span>
      )}
    </button>
  )
}
