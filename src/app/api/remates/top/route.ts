import { NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'

export const dynamic = 'force-dynamic'

interface Remate {
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
}

/**
 * GET /api/remates/top
 * Returns top remates by estimated cabezas for today or this week
 * Query params:
 *   - periodo: 'hoy' | 'semana' (default: 'hoy')
 *   - limit: number (default: 5, max: 20)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoy'
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  
  // Calculate date range
  let startDate: string
  let endDate: string
  
  if (periodo === 'hoy') {
    startDate = todayStr
    endDate = todayStr
  } else {
    // semana - next 7 days
    startDate = todayStr
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    endDate = weekLater.toISOString().split('T')[0]
  }

  // Filter and sort remates
  const filtered = (remates as Remate[])
    .filter(r => {
      if (r.status === 'completed') return false
      if (r.date < startDate || r.date > endDate) return false
      if (r.estimatedHeads === null || r.estimatedHeads === 0) return false
      return true
    })
    .sort((a, b) => (b.estimatedHeads || 0) - (a.estimatedHeads || 0))
    .slice(0, limit)

  // Format response
  const formattedRemates = filtered.map((r, index) => ({
    rank: index + 1,
    titulo: r.title,
    fecha: r.date,
    hora: r.time,
    lugar: r.location,
    provincia: r.province,
    tipo: r.type,
    categoria: r.mainCategory,
    cabezas: r.estimatedHeads || 0,
    consignataria: {
      nombre: r.consignatariaName,
      slug: r.consignatariaSlug
    },
    url: `/remates/${r.consignatariaSlug}/${r.id}`
  }))

  const totalCabezas = formattedRemates.reduce((sum, r) => sum + r.cabezas, 0)

  return NextResponse.json({
    success: true,
    periodo,
    dateRange: {
      from: startDate,
      to: endDate
    },
    data: formattedRemates,
    summary: {
      count: formattedRemates.length,
      totalCabezas,
      topConsignataria: formattedRemates[0]?.consignataria?.nombre || null
    },
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  })
}
