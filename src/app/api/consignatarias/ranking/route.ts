import { NextRequest, NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'

interface ConsignatariaRanking {
  rank: number
  nombre: string
  slug: string
  provincia: string
  totalRemates: number
  rematesProximos7dias: number
  cabezasEstimadas: number
  ultimoRemate: string | null
  proximoRemate: string | null
}

interface SuccessResponse {
  success: true
  periodo: 'historico' | 'mes' | 'semana'
  data: ConsignatariaRanking[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
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
 * GET /api/consignatarias/ranking
 * 
 * Returns ranked list of consignatarias by activity (number of remates).
 * Powers leaderboards, B2B outreach, and Remotion video compositions.
 * 
 * Query params:
 *   - periodo: 'historico' | 'mes' | 'semana' (default: historico)
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = (searchParams.get('periodo') || 'historico') as 'historico' | 'mes' | 'semana'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

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

    // Filter based on periodo
    let filteredRemates = allRemates
    if (periodo === 'semana') {
      filteredRemates = allRemates.filter(r => r.date >= todayStr && r.date <= in7daysStr)
    } else if (periodo === 'mes') {
      filteredRemates = allRemates.filter(r => r.date >= todayStr && r.date <= in30daysStr)
    }

    // Aggregate by consignataria
    const consigMap = new Map<string, {
      nombre: string
      provincia: string
      totalRemates: number
      rematesProximos7dias: number
      cabezasEstimadas: number
      fechas: string[]
    }>()

    filteredRemates.forEach(r => {
      const key = r.consignatariaSlug
      const current = consigMap.get(key) || {
        nombre: r.consignatariaName,
        provincia: r.province,
        totalRemates: 0,
        rematesProximos7dias: 0,
        cabezasEstimadas: 0,
        fechas: []
      }
      
      current.totalRemates++
      if (r.date >= todayStr && r.date <= in7daysStr) {
        current.rematesProximos7dias++
      }
      current.cabezasEstimadas += r.estimatedHeads || 0
      current.fechas.push(r.date)
      consigMap.set(key, current)
    })

    // Convert to array and sort by total remates
    const ranked: ConsignatariaRanking[] = Array.from(consigMap.entries())
      .map(([slug, stats]) => {
        const sortedFechas = stats.fechas.sort()
        const pastFechas = sortedFechas.filter(f => f < todayStr)
        const futureFechas = sortedFechas.filter(f => f >= todayStr)
        
        return {
          rank: 0, // Set below
          nombre: stats.nombre,
          slug,
          provincia: stats.provincia,
          totalRemates: stats.totalRemates,
          rematesProximos7dias: stats.rematesProximos7dias,
          cabezasEstimadas: stats.cabezasEstimadas,
          ultimoRemate: pastFechas.length > 0 ? pastFechas[pastFechas.length - 1] : null,
          proximoRemate: futureFechas.length > 0 ? futureFechas[0] : null
        }
      })
      .sort((a, b) => b.totalRemates - a.totalRemates)
      .map((item, index) => ({ ...item, rank: index + 1 }))

    // Pagination
    const total = ranked.length
    const start = (page - 1) * limit
    const paginatedData = ranked.slice(start, start + limit)
    const hasMore = start + limit < total

    const response = NextResponse.json({
      success: true,
      periodo,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        hasMore
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 1 hour (rankings don't change frequently)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    return response

  } catch (error) {
    console.error('Error generating consignataria ranking:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
