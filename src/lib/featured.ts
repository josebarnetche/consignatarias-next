import { createServiceClient } from '@/lib/supabase'

/**
 * Unified source of truth for PRO consignatarias.
 *
 * A firm is PRO if `consignatarias.featured = true` (destaque manual, permanente)
 * OR it has an active subscription (`entity_type = 'consignataria'`,
 * `status = 'active'`) cuyo `current_period_end` sigue vigente (o es null).
 *
 * Misma regla que la fuente única `getConsignatariaPlanStatus` (features.ts),
 * en versión batch para el directorio. Returns the set of canonical_slug values
 * for PRO firms. Soft-fails to an empty Set if the service client is unavailable
 * or the query errors, so callers (server pages, /api/featured-slugs) never throw.
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
        .select('entity_slug, current_period_end')
        .eq('entity_type', 'consignataria')
        .eq('status', 'active'),
    ])

    const now = Date.now()
    const fromFeatured = (featuredRes.data || []).map(d => d.canonical_slug)
    const fromSubs = (subsRes.data || [])
      // Excluir suscripciones activas cuyo período ya venció (o mantener las sin período).
      .filter(d => !d.current_period_end || new Date(d.current_period_end).getTime() > now)
      .map(d => d.entity_slug)

    return new Set([...fromFeatured, ...fromSubs])
  } catch {
    return new Set()
  }
}
