import { createServiceClient } from '@/lib/supabase'

export type EntityTier = 'free' | 'pro' | 'enterprise'

export type PlanSource = 'featured' | 'subscription' | null

export interface ConsignatariaPlanStatus {
  isPro: boolean
  tier: EntityTier
  /** Cómo se ganó el PRO: destaque manual, suscripción paga, o ninguno. */
  source: PlanSource
  /** Fin del período facturado (solo para source='subscription'); null si no aplica. */
  periodEnd: string | null
}

const FREE_STATUS: ConsignatariaPlanStatus = {
  isPro: false,
  tier: 'free',
  source: null,
  periodEnd: null,
}

/**
 * Fuente ÚNICA del estado de plan de una consignataria (canonical_slug).
 *
 * Una firma es PRO si:
 *   1. `consignatarias.featured = true` — destaque manual, permanente (sin período), O
 *   2. tiene una suscripción cuyo acceso sigue vigente:
 *      - `status='active'` con `current_period_end` vigente (o null), O
 *      - `status='cancelled'` DENTRO del período ya pagado (gracia hasta fin de mes).
 *        Rebill cancela inmediato y terminal (no tiene gracia nativa ni evento al
 *        vencer), así que la gracia la resolvemos acá: el mes ya está pagado, se
 *        honra hasta `current_period_end` y ahí cae a FREE. Igual que PRO Usuario.
 *
 * Antes esto vivía duplicado y divergente: `getFeaturedSlugs` (featured OR sub, para
 * el directorio) vs `getEntityTier` (solo sub, para /go y el perfil) → una firma con
 * featured=true se veía PRO en el directorio y FREE en su /go. Ninguno validaba
 * `current_period_end`. Este helper unifica la regla; `getEntityTier` y el reporte PDF
 * delegan acá, y `getFeaturedSlugs` aplica la misma validación de período en batch.
 *
 * Soft-fail a FREE si no hay service client o la query falla (nunca throw).
 */
export async function getConsignatariaPlanStatus(
  canonicalSlug: string,
): Promise<ConsignatariaPlanStatus> {
  try {
    const service = createServiceClient()
    if (!service) return FREE_STATUS

    const [featuredRes, subRes] = await Promise.all([
      service
        .from('consignatarias')
        .select('featured')
        .eq('canonical_slug', canonicalSlug)
        .maybeSingle(),
      service
        .from('subscriptions')
        .select('plan_name, status, current_period_end')
        .eq('entity_type', 'consignataria')
        .eq('entity_slug', canonicalSlug)
        // Una sola fila por entidad (upsert onConflict entity_type,entity_slug).
        // Traemos active Y cancelled: la cancelada puede seguir en gracia.
        .in('status', ['active', 'cancelled'])
        .maybeSingle(),
    ])

    // 1. Destaque manual → PRO permanente, sin período facturado.
    if (featuredRes.data?.featured === true) {
      return { isPro: true, tier: 'pro', source: 'featured', periodEnd: null }
    }

    // 2. Suscripción con acceso vigente. Active: honra período vigente o null.
    //    Cancelled: honra SOLO durante la gracia (período aún vigente).
    const sub = subRes.data
    if (sub) {
      const periodValid =
        !!sub.current_period_end && new Date(sub.current_period_end) > new Date()
      const grant = sub.status === 'active' ? !sub.current_period_end || periodValid : periodValid
      if (grant) {
        const tier: EntityTier = sub.plan_name?.toLowerCase().includes('enterprise')
          ? 'enterprise'
          : 'pro'
        return { isPro: true, tier, source: 'subscription', periodEnd: sub.current_period_end ?? null }
      }
    }

    return FREE_STATUS
  } catch {
    return FREE_STATUS
  }
}

/**
 * Tier de una entidad. Para consignatarias delega en la fuente única
 * (`getConsignatariaPlanStatus`, que honra featured=true y valida el período).
 * Para cualquier otro entity_type mantiene el chequeo genérico por suscripción.
 */
export async function getEntityTier(entityType: string, entitySlug: string): Promise<EntityTier> {
  if (entityType === 'consignataria') {
    const status = await getConsignatariaPlanStatus(entitySlug)
    return status.tier
  }

  try {
    const service = createServiceClient()
    if (!service) return 'free'

    const { data } = await service
      .from('subscriptions')
      .select('plan_name, status')
      .eq('entity_type', entityType)
      .eq('entity_slug', entitySlug)
      .eq('status', 'active')
      .maybeSingle()

    if (!data) return 'free'
    if (data.plan_name?.toLowerCase().includes('enterprise')) return 'enterprise'
    return 'pro'
  } catch {
    return 'free'
  }
}

/**
 * Estado de plan de un FRIGORÍFICO (por CUIT). Misma regla que consignatarias:
 * PRO si `frigorifico_profiles.featured = true` (destaque manual, permanente) O
 * suscripción `active`/`cancelled` con `current_period_end` vigente
 * (entity_type='frigorifico', entity_slug=cuit). Soft-fail a FREE.
 *
 * Reemplaza el patrón viejo de gatear el perfil por `session.tier` (plan del
 * VISITANTE), que es incorrecto: para "vender carne" el gate es el plan del
 * DUEÑO del frigorífico.
 */
export async function getFrigorificoPlanStatus(cuit: string): Promise<ConsignatariaPlanStatus> {
  try {
    const service = createServiceClient()
    if (!service) return FREE_STATUS

    const [profileRes, subRes] = await Promise.all([
      service
        .from('frigorifico_profiles')
        .select('featured')
        .eq('cuit', cuit)
        .maybeSingle(),
      service
        .from('subscriptions')
        .select('plan_name, status, current_period_end')
        .eq('entity_type', 'frigorifico')
        .eq('entity_slug', cuit)
        .in('status', ['active', 'cancelled'])
        .maybeSingle(),
    ])

    if (profileRes.data?.featured === true) {
      return { isPro: true, tier: 'pro', source: 'featured', periodEnd: null }
    }

    const sub = subRes.data
    if (sub) {
      const periodValid =
        !!sub.current_period_end && new Date(sub.current_period_end) > new Date()
      const grant = sub.status === 'active' ? !sub.current_period_end || periodValid : periodValid
      if (grant) {
        const tier: EntityTier = sub.plan_name?.toLowerCase().includes('enterprise')
          ? 'enterprise'
          : 'pro'
        return { isPro: true, tier, source: 'subscription', periodEnd: sub.current_period_end ?? null }
      }
    }

    return FREE_STATUS
  } catch {
    return FREE_STATUS
  }
}

/**
 * Gate REGULATORIO (distinto del comercial): ¿el frigorífico puede OFRECER venta
 * con envío interprovincial? Sólo si declaró habilitación NACIONAL y un admin la
 * verificó con constancia. NO se deriva del dato scrapeado (`stage`/`senasaActive`
 * NO codifican jurisdicción — ver spec privado §3). Soft-fail a false (conservador).
 */
export async function frigorificoPuedeInterprovincial(cuit: string): Promise<boolean> {
  try {
    const service = createServiceClient()
    if (!service) return false

    const { data } = await service
      .from('frigorifico_profiles')
      .select('habilitacion_nivel, habilitacion_verificada')
      .eq('cuit', cuit)
      .maybeSingle()

    return data?.habilitacion_nivel === 'nacional' && data?.habilitacion_verificada === true
  } catch {
    return false
  }
}
