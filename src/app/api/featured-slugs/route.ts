import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()

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
