import React from 'react'
import { getCurrentSession } from '@/lib/user-tier'
import { PaywallCard } from './Paywall'

interface RequireProProps {
  children: React.ReactNode
  /** Custom paywall UI. If omitted, default PaywallCard. */
  fallback?: React.ReactNode
  /** Optional headline for default paywall (override the generic copy). */
  feature?: string
  /** Redirect path after upgrade (default: current URL) */
  redirectTo?: string
}

/**
 * Server component. Renders children only for PRO users.
 *
 * - Anonymous → PaywallCard with login CTA
 * - Free logged-in → PaywallCard with upgrade CTA
 * - PRO → renders children
 */
export async function RequirePro({ children, fallback, feature, redirectTo }: RequireProProps) {
  const { user, tier } = await getCurrentSession()
  if (tier === 'pro') return <>{children}</>
  if (fallback) return <>{fallback}</>
  return <PaywallCard loggedIn={user !== null} feature={feature} redirectTo={redirectTo} />
}

export { PaywallCard } from './Paywall'
