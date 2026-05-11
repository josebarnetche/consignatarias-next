import { createClient as createServerSupabase } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'

export type Tier = 'anonymous' | 'free' | 'pro'

export interface CurrentUser {
  id: string
  email: string
}

export interface CurrentSession {
  user: CurrentUser | null
  tier: Tier
}

/**
 * getCurrentSession — server-side helper.
 * Reads cookies via Supabase server client, returns user + tier.
 * For an anonymous visitor: { user: null, tier: 'anonymous' }
 */
export async function getCurrentSession(): Promise<CurrentSession> {
  const supabase = await createServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, tier: 'anonymous' }
  }

  const cu: CurrentUser = { id: user.id, email: user.email ?? '' }

  // Lookup tier via service client (RLS bypass: we already verified the user)
  const service = requireServiceClient()
  const { data: sub } = await service
    .from('user_subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  let tier: Tier = 'free'
  if (sub?.tier === 'pro' && sub.status === 'active') {
    // Validate period if known
    if (!sub.current_period_end || new Date(sub.current_period_end) > new Date()) {
      tier = 'pro'
    }
  }

  return { user: cu, tier }
}

/**
 * Quick helpers
 */
export async function isLoggedIn(): Promise<boolean> {
  const { user } = await getCurrentSession()
  return user !== null
}

export async function isPro(): Promise<boolean> {
  const { tier } = await getCurrentSession()
  return tier === 'pro'
}

/**
 * For client components — read user from a fetch endpoint or context.
 * Server components should use getCurrentSession() directly.
 */
export const TIER_LABELS: Record<Tier, string> = {
  anonymous: 'Visitante',
  free: 'Gratis',
  pro: 'PRO',
}
