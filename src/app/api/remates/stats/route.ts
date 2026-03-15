import { NextRequest, NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'

interface ProvinceStats {
  provincia: string
  total: number
  proximos7dias: number
}

interface ConsignatariaStats {
  nombre: string
  slug: string
  provincia: string
  totalRemates: number
}

interface SuccessResponse {
  success: true
  data: {
    resumen: {
      totalRemates: number
      rematesHoy: number
      rematesProximos7dias: number
      rematesProximos30dias: number
      provinciasActivas: number
      consignatariasActivas: number
    }
    porProvincia: ProvinceStats[]
    topConsignatarias: ConsignatariaStats[]
    porTipo: Record<string, number>
    porCategoria: Record<string, number>
  }
  timestamp: string
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * GET /api/remates/stats
 * 
 * Returns aggregate statistics about upcoming auctions.
 * Useful for dashboards, market intelligence, and API consumption analytics.
 */
export async function GET(_request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const in7days = new Date(today)
    in7days.setDate(in7days.getDate() + 7)
    const in7daysStr = in7days.toISOString().split('T')[0]

    const in30days = new Date(today)
    in30days.setDate(in30days.getDate() + 30)
    const in30daysStr = in30days.toISOString().split('T')[0]

    const allRemates = remates as Array<{
      id: number
      title: string
      consignatariaName: string
      consignatariaSlug: string
      date: string
      time: string | null
      location: string
      province: string
      type: string
      mainCategory: string
      estimatedHeads: number | null
      description: string
      youtubeUrl: string | null
      catalogUrl: string | null
      sourceUrl: string | null
      status: string
    }>

    // Filter upcoming remates (not completed, date >= today)
    const upcoming = allRemates.filter(r => 
      r.status !== 'completed' && r.date >= todayStr
    )

    // Calculate counts
    const rematesHoy = upcoming.filter(r => r.date === todayStr).length
    const rematesProximos7dias = upcoming.filter(r => r.date <= in7daysStr).length
    const rematesProximos30dias = upcoming.filter(r => r.date <= in30daysStr).length

    // Stats by province
    const provinceMap = new Map<string, { total: number; proximos7dias: number }>()
    upcoming.forEach(r => {
      const current = provinceMap.get(r.province) || { total: 0, proximos7dias: 0 }
      current.total++
      if (r.date <= in7daysStr) current.proximos7dias++
      provinceMap.set(r.province, current)
    })

    const porProvincia: ProvinceStats[] = Array.from(provinceMap.entries())
      .map(([provincia, stats]) => ({
        provincia,
        total: stats.total,
        proximos7dias: stats.proximos7dias
      }))
      .sort((a, b) => b.total - a.total)

    // Stats by consignataria
    const consigMap = new Map<string, { nombre: string; provincia: string; count: number }>()
    upcoming.forEach(r => {
      const key = r.consignatariaSlug
      const current = consigMap.get(key) || { nombre: r.consignatariaName, provincia: r.province, count: 0 }
      current.count++
      consigMap.set(key, current)
    })

    const topConsignatarias: ConsignatariaStats[] = Array.from(consigMap.entries())
      .map(([slug, stats]) => ({
        nombre: stats.nombre,
        slug,
        provincia: stats.provincia,
        totalRemates: stats.count
      }))
      .sort((a, b) => b.totalRemates - a.totalRemates)
      .slice(0, 10)

    // Stats by type
    const porTipo: Record<string, number> = {}
    upcoming.forEach(r => {
      porTipo[r.type] = (porTipo[r.type] || 0) + 1
    })

    // Stats by category
    const porCategoria: Record<string, number> = {}
    upcoming.forEach(r => {
      porCategoria[r.mainCategory] = (porCategoria[r.mainCategory] || 0) + 1
    })

    const response = NextResponse.json({
      success: true,
      data: {
        resumen: {
          totalRemates: upcoming.length,
          rematesHoy,
          rematesProximos7dias,
          rematesProximos30dias,
          provinciasActivas: provinceMap.size,
          consignatariasActivas: consigMap.size
        },
        porProvincia,
        topConsignatarias,
        porTipo,
        porCategoria
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 30 minutes (stats don't change as often)
    response.headers.set('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=300')
    
    // Last-Modified: data updates daily at 14:00 ART (17:00 UTC)
    const lastUpdate = new Date()
    lastUpdate.setUTCHours(17, 0, 0, 0) // 14:00 ART = 17:00 UTC
    if (new Date() < lastUpdate) {
      // Before today's update, use yesterday's timestamp
      lastUpdate.setDate(lastUpdate.getDate() - 1)
    }
    response.headers.set('Last-Modified', lastUpdate.toUTCString())

    return response

  } catch (error) {
    console.error('Error generating remate stats:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
