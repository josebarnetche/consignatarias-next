import { createServiceClient } from '@/lib/supabase'

/**
 * Unified source of truth for PRO consignatarias.
 *
 * A firm is PRO if `consignatarias.featured = true` (destaque manual, permanente)
 * OR tiene una suscripción con acceso vigente: `status='active'` con período
 * vigente/null, o `status='cancelled'` aún DENTRO del período pagado (gracia hasta
 * fin de mes — Rebill cancela inmediato y sin gracia nativa, la resolvemos acá).
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
        .select('entity_slug, status, current_period_end')
        .eq('entity_type', 'consignataria')
        .in('status', ['active', 'cancelled']),
    ])

    const now = Date.now()
    const fromFeatured = (featuredRes.data || []).map(d => d.canonical_slug)
    const fromSubs = (subsRes.data || [])
      .filter(d => {
        const periodValid = !!d.current_period_end && new Date(d.current_period_end).getTime() > now
        // active: vigente o sin período. cancelled: solo en gracia (período vigente).
        return d.status === 'active' ? !d.current_period_end || periodValid : periodValid
      })
      .map(d => d.entity_slug)

    return new Set([...fromFeatured, ...fromSubs])
  } catch {
    return new Set()
  }
}
