import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

  const supabase = await createClient()
  const now = new Date()
  
  // Calculate date range
  let startDate: string
  let endDate: string
  
  if (periodo === 'hoy') {
    startDate = now.toISOString().split('T')[0]
    endDate = startDate
  } else {
    // semana - next 7 days
    startDate = now.toISOString().split('T')[0]
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    endDate = weekLater.toISOString().split('T')[0]
  }

  const { data: remates, error } = await supabase
    .from('remates')
    .select(`
      id,
      titulo,
      fecha,
      hora,
      lugar,
      provincia,
      tipo_remate,
      categorias,
      cabezas_estimadas,
      slug,
      url_original,
      consignataria:consignatarias(nombre, slug)
    `)
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('cabezas_estimadas', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Error fetching top remates' },
      { status: 500 }
    )
  }

  // Format response
  const formattedRemates = remates?.map((r, index) => ({
    rank: index + 1,
    titulo: r.titulo,
    fecha: r.fecha,
    hora: r.hora,
    lugar: r.lugar,
    provincia: r.provincia,
    tipo: r.tipo_remate,
    categorias: r.categorias,
    cabezas: r.cabezas_estimadas || 0,
    consignataria: {
      nombre: r.consignataria?.nombre || 'Desconocida',
      slug: r.consignataria?.slug || null
    },
    url: `/remates/${r.slug}`
  })) || []

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
