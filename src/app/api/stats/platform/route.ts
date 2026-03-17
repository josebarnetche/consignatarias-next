import { NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'
import consignatarias from '@/lib/data/consignatarias.json'
import frigorificos from '@/lib/data/frigorificos.json'

/**
 * GET /api/stats/platform
 * 
 * Returns platform-wide statistics for social proof on marketing pages.
 * Lightweight endpoint for dynamic display of platform scale.
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

    const response = NextResponse.json({
      success: true,
      data: {
        consignatarias: totalConsignatarias,
        remates: upcomingRemates,
        frigorificos: totalFrigorificos,
        provincias: provinces.size,
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
