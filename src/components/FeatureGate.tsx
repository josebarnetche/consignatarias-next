import Link from 'next/link'
import type { EntityTier } from '@/lib/features'

const TIER_RANK: Record<EntityTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

interface FeatureGateProps {
  tier: EntityTier
  requiredTier: EntityTier
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function FeatureGate({ tier, requiredTier, children, fallback }: FeatureGateProps) {
  if (TIER_RANK[tier] >= TIER_RANK[requiredTier]) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Value-focused default fallback (CLOSER optimization 2026-03-20)
  return (
    <div className="terminal-panel mt-px bg-amber-500/[0.03]">
      <div className="px-panel py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-amber-400 text-lg mt-0.5">⚡</span>
          <div>
            <p className="text-xs text-zinc-300 font-terminal font-medium mb-1">
              Desbloquea esta función con PRO
            </p>
            <p className="text-xxs text-zinc-500 font-terminal">
              Promoción por email a +500 productores, badge verificado, analytics y más.
            </p>
          </div>
        </div>
        <Link
          href="/planes"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border text-xxs font-terminal uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-amber-500/20"
          style={{
            background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1))',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
          }}
        >
          <span className="text-amber-400">★</span>
          Ver planes
        </Link>
      </div>
    </div>
  )
}
