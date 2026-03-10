import { createServiceClient } from '@/lib/supabase'

export type EntityTier = 'free' | 'pro' | 'enterprise'

export async function getEntityTier(entityType: string, entitySlug: string): Promise<EntityTier> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('subscriptions')
      .select('plan_name, status')
      .eq('entity_type', entityType)
      .eq('entity_slug', entitySlug)
      .eq('status', 'active')
      .single()

    if (!data) return 'free'
    if (data.plan_name.toLowerCase().includes('enterprise')) return 'enterprise'
    return 'pro'
  } catch {
    return 'free'
  }
}
