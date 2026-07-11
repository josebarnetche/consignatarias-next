import { NextRequest, NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'

// Response types
interface RemateResponse {
  id: number
  fecha: string
  hora: string | null
  titulo: string
  consignataria: {
    nombre: string
    slug: string
    provincia: string
  }
  ubicacion: string
  tipo: string
  categoria: string
  cabezas_estimadas: number | null
  descripcion: string
  youtube_url: string | null
  catalogo_url: string | null
  source_url: string | null
}

interface SuccessResponse {
  success: true
  data: {
    fecha: string
    remates: RemateResponse[]
    total: number
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
 * GET /api/remates/hoy
 * 
 * Returns all auctions scheduled for today.
 * Quick access endpoint for daily auction calendars.
 * 
 * Query params:
 * - provincia: Filter by province (optional)
 * - consignataria: Filter by consignataria slug (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)

    const provincia = searchParams.get('provincia')?.toUpperCase() || null
    const consignataria = searchParams.get('consignataria') || null

    // "Hoy" en horario de Argentina. Antes usaba toISOString() (UTC), así que de
    // noche (21–24h ART = 00–03h UTC del día siguiente) mostraba el "hoy" equivocado.
    // en-CA da formato YYYY-MM-DD; mismo patrón que el cron de outreach.
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date())

    // Filter to today's remates only
    const filtered = (remates as Array<{
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
    }>).filter(remate => {
      // Only today's auctions
      if (remate.date !== todayStr) return false
      if (remate.status === 'completed') return false

      // Province filter
      if (provincia && remate.province.toUpperCase() !== provincia) return false

      // Consignataria filter
      if (consignataria && remate.consignatariaSlug !== consignataria) return false

      return true
    })

    // Sort by time
    filtered.sort((a, b) => {
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

    // Transform to response format
    const rematesResponse: RemateResponse[] = filtered.map(r => ({
      id: r.id,
      fecha: r.date,
      hora: r.time,
      titulo: r.title,
      consignataria: {
        nombre: r.consignatariaName,
        slug: r.consignatariaSlug,
        provincia: r.province
      },
      ubicacion: r.location,
      tipo: r.type,
      categoria: r.mainCategory,
      cabezas_estimadas: r.estimatedHeads,
      descripcion: r.description,
      youtube_url: r.youtubeUrl,
      catalogo_url: r.catalogUrl,
      source_url: r.sourceUrl
    }))

    const response = NextResponse.json({
      success: true,
      data: {
        fecha: todayStr,
        remates: rematesResponse,
        total: rematesResponse.length
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Short cache for today's data (5 minutes)
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60')
    
    // Last-Modified: data updates daily at 14:00 ART (17:00 UTC)
    const lastUpdate = new Date()
    lastUpdate.setUTCHours(17, 0, 0, 0)
    if (new Date() < lastUpdate) {
      lastUpdate.setDate(lastUpdate.getDate() - 1)
    }
    response.headers.set('Last-Modified', lastUpdate.toUTCString())

    return response

  } catch (error) {
    console.error('Error fetching today\'s remates:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
