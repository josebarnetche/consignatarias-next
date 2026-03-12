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
  relevancia: number
}

interface SuccessResponse {
  success: true
  data: {
    query: string
    remates: RemateResponse[]
    total: number
    limit: number
    offset: number
    filtros: {
      provincia: string | null
      fecha_desde: string | null
      fecha_hasta: string | null
    }
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

type RemateRecord = {
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
 * Calculate relevance score for a remate based on search term matches
 * Higher scores = better matches
 */
function calculateRelevance(remate: RemateRecord, searchTerms: string[]): number {
  let score = 0
  
  const titleLower = remate.title.toLowerCase()
  const descLower = remate.description.toLowerCase()
  const consigLower = remate.consignatariaName.toLowerCase()
  const locationLower = remate.location.toLowerCase()
  const provinceLower = remate.province.toLowerCase()
  
  for (const term of searchTerms) {
    // Title matches are highest value (x10)
    if (titleLower.includes(term)) {
      score += 10
      // Exact word match in title bonus
      if (titleLower.split(/\s+/).includes(term)) score += 5
    }
    
    // Consignataria name match (x8)
    if (consigLower.includes(term)) {
      score += 8
    }
    
    // Location match (x6)
    if (locationLower.includes(term)) {
      score += 6
    }
    
    // Province match (x4)
    if (provinceLower.includes(term)) {
      score += 4
    }
    
    // Description match (x2)
    if (descLower.includes(term)) {
      score += 2
    }
  }
  
  return score
}

/**
 * GET /api/remates/buscar
 * 
 * Full-text search across remates with relevance scoring.
 * 
 * Query params:
 * - q: Search term (required, min 2 chars)
 * - limit: Max results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 * - provincia: Filter by province (optional)
 * - fecha_desde: Filter from date YYYY-MM-DD (optional)
 * - fecha_hasta: Filter until date YYYY-MM-DD (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const query = searchParams.get('q')?.trim() || ''
    const limitParam = parseInt(searchParams.get('limit') || '20', 10)
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10)
    const provincia = searchParams.get('provincia')?.toUpperCase() || null
    const fechaDesde = searchParams.get('fecha_desde') || null
    const fechaHasta = searchParams.get('fecha_hasta') || null

    // Validate search query
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 2 characters'
        }
      }, { status: 400 })
    }

    // Validate and sanitize limit/offset
    const limit = Math.min(Math.max(1, limitParam), 100)
    const offset = Math.max(0, offsetParam)

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (fechaDesde && !dateRegex.test(fechaDesde)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: 'fecha_desde must be in YYYY-MM-DD format'
        }
      }, { status: 400 })
    }
    if (fechaHasta && !dateRegex.test(fechaHasta)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: 'fecha_hasta must be in YYYY-MM-DD format'
        }
      }, { status: 400 })
    }

    // Prepare search terms (split by whitespace, lowercase)
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2)

    if (searchTerms.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must contain valid terms (at least 2 characters each)'
        }
      }, { status: 400 })
    }

    const allRemates = remates as RemateRecord[]

    // Filter and score remates
    const scoredRemates: Array<{ remate: RemateRecord; score: number }> = []

    for (const remate of allRemates) {
      // Apply province filter
      if (provincia && remate.province.toUpperCase() !== provincia) {
        continue
      }

      // Apply date range filters
      if (fechaDesde && remate.date < fechaDesde) {
        continue
      }
      if (fechaHasta && remate.date > fechaHasta) {
        continue
      }

      // Calculate relevance score
      const score = calculateRelevance(remate, searchTerms)

      // Only include if there's at least one match
      if (score > 0) {
        scoredRemates.push({ remate, score })
      }
    }

    // Sort by relevance (highest first), then by date (most recent first)
    scoredRemates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return b.remate.date.localeCompare(a.remate.date)
    })

    // Get total before pagination
    const total = scoredRemates.length

    // Apply pagination
    const paginatedResults = scoredRemates.slice(offset, offset + limit)

    // Transform to response format
    const rematesResponse: RemateResponse[] = paginatedResults.map(({ remate, score }) => ({
      id: remate.id,
      fecha: remate.date,
      hora: remate.time,
      titulo: remate.title,
      consignataria: {
        nombre: remate.consignatariaName,
        slug: remate.consignatariaSlug,
        provincia: remate.province
      },
      ubicacion: remate.location,
      tipo: remate.type,
      categoria: remate.mainCategory,
      cabezas_estimadas: remate.estimatedHeads,
      descripcion: remate.description,
      youtube_url: remate.youtubeUrl,
      catalogo_url: remate.catalogUrl,
      source_url: remate.sourceUrl,
      relevancia: score
    }))

    const response = NextResponse.json({
      success: true,
      data: {
        query,
        remates: rematesResponse,
        total,
        limit,
        offset,
        filtros: {
          provincia,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta
        }
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60')

    return response

  } catch (error) {
    console.error('Error searching remates:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
