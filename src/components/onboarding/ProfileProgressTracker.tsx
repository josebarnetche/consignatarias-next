'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateProfilePoints, getNextActions, PRO_MONTH_THRESHOLD } from '@/lib/points'
import { Star, ChevronDown, ChevronUp, Gift, CheckCircle2, Circle } from 'lucide-react'

interface ProfileProgressTrackerProps {
  profile: {
    cuit?: string | null
    phone?: string | null
    email?: string | null
    whatsapp?: string | null
    website?: string | null
    description?: string | null
    logo?: string | null
    catalogUrl?: string | null
    youtubeUrl?: string | null
    dteCount?: number
    remateCount?: number
    hasResults?: boolean
  }
  alreadyRedeemed?: boolean
  onRedeem?: () => void
}

export default function ProfileProgressTracker({ 
  profile, 
  alreadyRedeemed = false,
  onRedeem 
}: ProfileProgressTrackerProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  
  const { total, breakdown } = calculateProfilePoints(profile)
  const nextActions = getNextActions(breakdown)
  const progress = Math.min((total / PRO_MONTH_THRESHOLD) * 100, 100)
  const canRedeem = total >= PRO_MONTH_THRESHOLD && !alreadyRedeemed
  const remaining = Math.max(PRO_MONTH_THRESHOLD - total, 0)

  const handleActionClick = (action: string) => {
    // Route to appropriate section based on action
    if (action.includes('DT-e')) {
      router.push('/dashboard?tab=dte')
    } else if (action.includes('remate')) {
      router.push('/dashboard?tab=remates')
    } else {
      router.push('/dashboard?tab=editar')
    }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-5 h-5 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/iconos-color/guia-dte.png" alt="" className="w-3.5 h-3.5" />
          </span>
          <Star className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-200 text-label tracking-widest">TU PROGRESO</span>
        </div>
        <span className="text-xxs font-terminal tabular-nums text-amber-400">
          {total.toLocaleString('es-AR')} / {PRO_MONTH_THRESHOLD.toLocaleString('es-AR')} pts
        </span>
      </div>

      <div className="px-panel py-3 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="gradient-bar w-full h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {canRedeem ? (
            <div className="flex items-center gap-2 text-positive">
              <Gift className="w-3.5 h-3.5" />
              <span className="text-xxs font-terminal">¡Desbloqueaste 1 mes PRO gratis!</span>
            </div>
          ) : (
            <p className="text-xxs font-terminal text-zinc-500">
              Te faltan {remaining.toLocaleString('es-AR')} pts para 1 mes PRO gratis
            </p>
          )}
        </div>

        {/* Next suggested actions */}
        {nextActions.length > 0 && !canRedeem && (
          <div className="space-y-2">
            <p className="text-xxs font-terminal text-zinc-400 uppercase tracking-wider">
              Próximos pasos
            </p>
            <div className="space-y-1.5">
              {nextActions.slice(0, 3).map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleActionClick(item.action)}
                  className="w-full flex items-center justify-between gap-2 group px-1.5 py-2 rounded-terminal hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-zinc-600" />
                    <span className="text-xxs font-terminal text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {item.action}
                    </span>
                  </div>
                  <span className="text-xxs font-terminal text-amber-400/70 group-hover:text-amber-400 tabular-nums">
                    +{item.points} pts
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Redeem button */}
        {canRedeem && onRedeem && (
          <button
            onClick={onRedeem}
            className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-400 text-black text-xs font-terminal font-medium rounded hover:from-amber-400 hover:to-amber-300 transition-all"
          >
            🎁 Canjear mes PRO gratis
          </button>
        )}

        {alreadyRedeemed && (
          <div className="flex items-center gap-2 text-positive/70">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xxs font-terminal">Ya canjeaste tu mes PRO — ¡Gracias por ser early adopter!</span>
          </div>
        )}

        {/* Expandable breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xxs font-terminal text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Ver desglose completo
        </button>

        {expanded && (
          <div className="space-y-1 pt-2 border-t border-zinc-800">
            {breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.earned ? (
                    <CheckCircle2 className="w-3 h-3 text-positive" />
                  ) : (
                    <Circle className="w-3 h-3 text-zinc-600" />
                  )}
                  <span className={`text-xxs font-terminal ${item.earned ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {item.action}
                  </span>
                </div>
                <span className={`text-xxs font-terminal tabular-nums ${item.earned ? 'text-positive' : 'text-zinc-600'}`}>
                  {item.earned ? '+' : ''}{item.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
