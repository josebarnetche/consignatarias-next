import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 })
  }

  const service = requireServiceClient()

  // PRO Usuario (productor/contador/broker) — paid tier lives in user_subscriptions.
  // Check this FIRST: a normal buyer has no consignataria, so the entity check below
  // would (wrongly) return no_entity and the dashboard/cuenta poll would never confirm.
  const { data: userSub } = await service
    .from('user_subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const userSubActive =
    userSub?.tier === 'pro' &&
    ['active', 'past_due'].includes(userSub.status) &&
    (!userSub.current_period_end || new Date(userSub.current_period_end) > new Date())

  if (userSubActive) {
    return NextResponse.json({ status: 'active', plan: 'PRO_USER', periodEnd: userSub!.current_period_end })
  }

  const { data: consignataria } = await service
    .from('consignatarias')
    .select('canonical_slug')
    .eq('claimed_by_email', user.email!)
    .single()

  if (!consignataria) {
    return NextResponse.json({ status: 'no_entity' })
  }

  const { data: sub } = await service
    .from('subscriptions')
    .select('plan_name, status, current_period_end')
    .eq('entity_type', 'consignataria')
    .eq('entity_slug', consignataria.canonical_slug)
    .in('status', ['active', 'past_due'])
    .single()

  if (sub) {
    return NextResponse.json({ status: 'active', plan: sub.plan_name, periodEnd: sub.current_period_end })
  }

  return NextResponse.json({ status: 'pending' })
}
