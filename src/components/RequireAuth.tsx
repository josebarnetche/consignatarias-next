import React from 'react'
import { getCurrentSession } from '@/lib/user-tier'
import { AuthLockCard } from './Paywall'

interface RequireAuthProps {
  children: React.ReactNode
  /** Optional custom fallback UI for anonymous users. If omitted, default lock card. */
  fallback?: React.ReactNode
  /** redirect path after login (default: current URL) */
  redirectTo?: string
}

/**
 * Server component. Renders children if user is logged in.
 * If anonymous: renders fallback (or default AuthLockCard prompting Google login).
 *
 * Use this for content that should be visible to ANY logged-in user (free or PRO).
 * For PRO-only content, use <RequirePro>.
 */
export async function RequireAuth({ children, fallback, redirectTo }: RequireAuthProps) {
  const { user } = await getCurrentSession()
  if (user) return <>{children}</>
  if (fallback) return <>{fallback}</>
  return <AuthLockCard redirectTo={redirectTo} />
}
