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
