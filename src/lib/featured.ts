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
// Memo SÓLO durante el build (17-10-2026): desde que el calendario, las fichas de
// remate y las provincias marcan a las firmas PRO, el build estático llama esto en
// ~1.000 páginas, ~2.000 consultas para un dato que no cambia en esos minutos. En
// runtime no se memoriza: cuando el webhook revalida una página tras un pago, la
// regeneración tiene que leer el estado nuevo, no uno de hace un minuto.
const EN_BUILD = process.env.NEXT_PHASE === 'phase-production-build'
let memo: { hasta: number; valor: Promise<Set<string>> } | null = null

export function getFeaturedSlugs(): Promise<Set<string>> {
  if (!EN_BUILD) return leerFeaturedSlugs()
  const ahora = Date.now()
  if (memo && memo.hasta > ahora) return memo.valor.then((s) => new Set(s))
  const valor = leerFeaturedSlugs()
  memo = { hasta: ahora + 60_000, valor }
  // Un fallo no se memoriza: devuelve vacío esta vez y reintenta en la próxima.
  valor.then((s) => { if (s.size === 0 && memo?.valor === valor) memo = null })
  return valor.then((s) => new Set(s))
}

async function leerFeaturedSlugs(): Promise<Set<string>> {
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
