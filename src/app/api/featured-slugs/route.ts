import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('consignatarias')
    .select('canonical_slug')
    .eq('featured', true)

  if (error) {
    return NextResponse.json({ slugs: [] })
  }

  const slugs = (data || []).map(d => d.canonical_slug)
  return NextResponse.json({ slugs }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
