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
    remates: RemateResponse[]
    total: number
    limit: number
    offset: number
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

// Valid Argentine provinces
const VALID_PROVINCES = [
  'BUENOS AIRES', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CORDOBA',
  'CORRIENTES', 'ENTRE RIOS', 'FORMOSA', 'JUJUY', 'LA PAMPA',
  'LA RIOJA', 'MENDOZA', 'MISIONES', 'NEUQUEN', 'RIO NEGRO',
  'SALTA', 'SAN JUAN', 'SAN LUIS', 'SANTA CRUZ', 'SANTA FE',
  'SANTIAGO DEL ESTERO', 'TIERRA DEL FUEGO', 'TUCUMAN'
]

export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const days = parseInt(searchParams.get('days') || '7', 10)
    const provincia = searchParams.get('provincia')?.toUpperCase() || null
    const consignataria = searchParams.get('consignataria') || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'days must be between 1 and 365'
        }
      }, { status: 400 })
    }

    // Validate provincia if provided
    if (provincia && !VALID_PROVINCES.includes(provincia)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: `Invalid province. Valid values: ${VALID_PROVINCES.join(', ')}`
        }
      }, { status: 400 })
    }

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'limit must be a positive integer (max 100)'
        }
      }, { status: 400 })
    }

    // Validate offset
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'offset must be a non-negative integer'
        }
      }, { status: 400 })
    }

    // Calculate date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days)
    const endDateStr = endDate.toISOString().split('T')[0]

    // Filter remates
    let filtered = (remates as Array<{
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
      // Only future/upcoming remates (status scheduled or date >= today)
      if (remate.status === 'completed') return false
      if (remate.date < todayStr || remate.date > endDateStr) return false

      // Province filter
      if (provincia && remate.province.toUpperCase() !== provincia) return false

      // Consignataria filter (by slug)
      if (consignataria && remate.consignatariaSlug !== consignataria) return false

      return true
    })

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      // Sort by time if dates are equal
      const timeA = a.time || '23:59'
      const timeB = b.time || '23:59'
      return timeA.localeCompare(timeB)
    })

    const total = filtered.length

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit)

    // Transform to response format
    const rematesResponse: RemateResponse[] = paginated.map(r => ({
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
        remates: rematesResponse,
        total,
        limit,
        offset
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Set cache headers (15 minutes)
    response.headers.set('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=60')

    return response

  } catch (error) {
    console.error('Error fetching upcoming remates:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
