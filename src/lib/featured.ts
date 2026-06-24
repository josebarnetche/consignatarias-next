import { createServiceClient } from '@/lib/supabase'

/**
 * Unified source of truth for PRO consignatarias.
 *
 * A firm is PRO if `consignatarias.featured = true` OR it has an active
 * subscription (`entity_type = 'consignataria'`, `status = 'active'`).
 *
 * Returns the set of canonical_slug values for PRO firms. Soft-fails to an
 * empty Set if the service client is unavailable or the query errors, so
 * callers (server pages, the /api/featured-slugs route) never throw.
 */
export async function getFeaturedSlugs(): Promise<Set<string>> {
  try {
    const supabase = createServiceClient()
    if (!supabase) return new Set()

    const [featuredRes, subsRes] = await Promise.all([
      supabase
        .from('consignatarias')
        .select('canonical_slug')
        .eq('featured', true),
      supabase
        .from('subscriptions')
        .select('entity_slug')
        .eq('entity_type', 'consignataria')
        .eq('status', 'active'),
    ])

    const fromFeatured = (featuredRes.data || []).map(d => d.canonical_slug)
    const fromSubs = (subsRes.data || []).map(d => d.entity_slug)

    return new Set([...fromFeatured, ...fromSubs])
  } catch {
    return new Set()
  }
}
