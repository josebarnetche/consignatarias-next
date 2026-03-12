import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  // Unified PRO: admin-featured OR active subscription
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

  // Merge and deduplicate
  const slugs = [...new Set([...fromFeatured, ...fromSubs])]

  return NextResponse.json({ slugs }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
