import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import remates from '@/lib/data/remates.json'
import consignatarias from '@/lib/data/consignatarias.json'
import frigorificos from '@/lib/data/frigorificos.json'

// Cache subscriber count for 1 hour
const getSubscriberCount = unstable_cache(
  async () => {
    try {
      const supabase = createServiceClient()
      const { count } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
      return count && count > 0 ? count : 500
    } catch {
      return 500
    }
  },
  ['subscriber-count'],
  { revalidate: 3600 }
)

/**
 * GET /api/stats/platform
 * 
 * Returns platform-wide statistics for social proof on marketing pages.
 * Uses Next.js cache for Supabase calls.
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Count upcoming remates only (not completed, date >= today)
    const upcomingRemates = (remates as Array<{ date: string; status: string }>)
      .filter(r => r.status !== 'completed' && r.date >= today).length
    
    // Count total consignatarias
    const totalConsignatarias = (consignatarias as unknown[]).length
    
    // Count total frigoríficos
    const totalFrigorificos = (frigorificos as unknown[]).length
    
    // Count unique provinces with remates
    const provinces = new Set(
      (remates as Array<{ province: string; date: string; status: string }>)
        .filter(r => r.status !== 'completed' && r.date >= today)
        .map(r => r.province)
    )
    
    // Get cached subscriber count
    const subscriberCount = await getSubscriberCount()

    const response = NextResponse.json({
      success: true,
      data: {
        consignatarias: totalConsignatarias,
        remates: upcomingRemates,
        frigorificos: totalFrigorificos,
        provincias: provinces.size,
        subscribers: subscriberCount,
      },
      timestamp: new Date().toISOString()
    })

    // Cache for 1 hour (stats are relatively stable)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    return response
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stats'
    }, { status: 500 })
  }
}
