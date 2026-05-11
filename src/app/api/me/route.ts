import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me
 *
 * Returns the current user's auth + tier state for client components.
 * Lightweight so pages can stay statically generated and read this on mount.
 *
 * Response: { loggedIn: boolean, tier: 'anonymous'|'free'|'pro', email: string|null }
 */
export async function GET() {
  const { user, tier } = await getCurrentSession()
  return NextResponse.json({
    loggedIn: user !== null,
    tier,
    email: user?.email ?? null,
  })
}
