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

  return (
    <div className="terminal-panel mt-px">
      <div className="px-panel py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xxs text-zinc-500 font-terminal">
            Esta funcion requiere un plan superior.
          </p>
        </div>
        <Link
          href="/planes"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
        >
          Upgrade a PRO
        </Link>
      </div>
    </div>
  )
}
