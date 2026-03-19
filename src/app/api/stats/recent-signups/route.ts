import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get consignatarias that were claimed/verified in last 14 days
    const { data } = await supabase
      .from('consignatarias')
      .select('display_name, province, updated_at')
      .eq('verified', true)
      .gte('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(5)

    if (!data || data.length === 0) {
      return NextResponse.json({ signup: null })
    }

    // Pick a random one from recent signups
    const random = data[Math.floor(Math.random() * data.length)]
    const daysAgo = Math.floor((Date.now() - new Date(random.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    
    return NextResponse.json({
      signup: {
        displayName: random.display_name,
        province: random.province || 'Argentina',
        daysAgo: daysAgo
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch {
    return NextResponse.json({ signup: null })
  }
}
