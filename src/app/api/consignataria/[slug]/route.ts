import { NextRequest, NextResponse } from 'next/server'
import remates from '@/lib/data/remates.json'

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

interface ConsignatariaProfile {
  slug: string
  nombre: string
  provincia: string
  ubicaciones: string[]
  totalRemates: number
  rematesProximos: number
  tiposRemate: Record<string, number>
  proximosRemates: Array<{
    id: number
    titulo: string
    fecha: string
    hora: string | null
    ubicacion: string
    tipo: string
    cabezasEstimadas: number | null
  }>
  historialReciente: Array<{
    id: number
    titulo: string
    fecha: string
    ubicacion: string
    tipo: string
  }>
}

interface SuccessResponse {
  success: true
  data: ConsignatariaProfile
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
 * GET /api/consignataria/[slug]
 * 
 * Returns profile and remate history for a specific consignataria.
 * Includes upcoming auctions, historical data, and aggregate statistics.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { slug } = await params

    if (!slug || slug.length < 2) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Slug must be at least 2 characters'
        }
      }, { status: 400 })
    }

    const allRemates = remates as Remate[]
    
    // Find all remates for this consignataria
    const consigRemates = allRemates.filter(r => 
      r.consignatariaSlug.toLowerCase() === slug.toLowerCase()
    )

    if (consigRemates.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Consignataria "${slug}" not found or has no remates indexed`
        }
      }, { status: 404 })
    }

    // Get consignataria basic info from first remate
    const nombre = consigRemates[0].consignatariaName
    const provincia = consigRemates[0].province

    // Calculate date boundaries
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Split into upcoming and past
    const upcoming = consigRemates
      .filter(r => r.date >= todayStr && r.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

    const past = consigRemates
      .filter(r => r.date < todayStr || r.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10) // Last 10 remates

    // Get unique locations
    const ubicaciones = [...new Set(consigRemates.map(r => r.location))].filter(Boolean)

    // Count by type
    const tiposRemate: Record<string, number> = {}
    consigRemates.forEach(r => {
      tiposRemate[r.type] = (tiposRemate[r.type] || 0) + 1
    })

    const profile: ConsignatariaProfile = {
      slug: slug.toLowerCase(),
      nombre,
      provincia,
      ubicaciones,
      totalRemates: consigRemates.length,
      rematesProximos: upcoming.length,
      tiposRemate,
      proximosRemates: upcoming.slice(0, 20).map(r => ({
        id: r.id,
        titulo: r.title,
        fecha: r.date,
        hora: r.time,
        ubicacion: r.location,
        tipo: r.type,
        cabezasEstimadas: r.estimatedHeads
      })),
      historialReciente: past.map(r => ({
        id: r.id,
        titulo: r.title,
        fecha: r.date,
        ubicacion: r.location,
        tipo: r.type
      }))
    }

    const response = NextResponse.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 1 hour
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    return response

  } catch (error) {
    console.error('Error fetching consignataria profile:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
