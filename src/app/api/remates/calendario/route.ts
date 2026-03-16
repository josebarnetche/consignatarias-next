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
}

interface DayCalendar {
  fecha: string
  dia_semana: string
  remates: RemateResponse[]
  total: number
}

interface SuccessResponse {
  success: true
  data: {
    semana: string
    dias: DayCalendar[]
    total_semana: number
    provincias_activas: string[]
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

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * GET /api/remates/calendario
 * 
 * Returns a 7-day calendar view of upcoming auctions organized by day.
 * Perfect for app integration, widgets, and planning tools.
 * 
 * Query params:
 * - provincia: Filter by province (optional)
 * - consignataria: Filter by consignataria slug (optional)
 * - dias: Number of days to show (1-14, default 7)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)

    const provincia = searchParams.get('provincia')?.toUpperCase() || null
    const consignataria = searchParams.get('consignataria') || null
    const diasParam = parseInt(searchParams.get('dias') || '7', 10)
    const dias = Math.min(Math.max(diasParam, 1), 14) // Clamp between 1-14

    // Get date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + dias)

    // Generate date strings for the range
    const dateRange: string[] = []
    const currentDate = new Date(today)
    while (currentDate < endDate) {
      dateRange.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Filter remates to date range and optional filters
    const filteredRemates = (remates as Array<{
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
      status: string
    }>).filter(remate => {
      // Date range filter
      if (!dateRange.includes(remate.date)) return false
      if (remate.status === 'completed') return false

      // Province filter
      if (provincia && remate.province.toUpperCase() !== provincia) return false

      // Consignataria filter
      if (consignataria && remate.consignatariaSlug !== consignataria) return false

      return true
    })

    // Group by date
    const byDate = new Map<string, typeof filteredRemates>()
    dateRange.forEach(date => byDate.set(date, []))
    
    filteredRemates.forEach(remate => {
      const existing = byDate.get(remate.date) || []
      existing.push(remate)
      byDate.set(remate.date, existing)
    })

    // Build calendar response
    const diasCalendario: DayCalendar[] = dateRange.map(fecha => {
      const dayRemates = byDate.get(fecha) || []
      const dateObj = new Date(fecha + 'T12:00:00')
      
      // Sort by time
      dayRemates.sort((a, b) => {
        const timeA = a.time || '23:59'
        const timeB = b.time || '23:59'
        return timeA.localeCompare(timeB)
      })

      return {
        fecha,
        dia_semana: DIAS_SEMANA[dateObj.getDay()],
        remates: dayRemates.map(r => ({
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
          cabezas_estimadas: r.estimatedHeads
        })),
        total: dayRemates.length
      }
    })

    // Get unique active provinces
    const provinciasActivas = [...new Set(filteredRemates.map(r => r.province))].sort()

    const response = NextResponse.json({
      success: true,
      data: {
        semana: `${dateRange[0]} a ${dateRange[dateRange.length - 1]}`,
        dias: diasCalendario,
        total_semana: filteredRemates.length,
        provincias_activas: provinciasActivas
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 15 minutes
    response.headers.set('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=300')
    
    // Last-Modified: data updates daily at 14:00 ART (17:00 UTC)
    const lastUpdate = new Date()
    lastUpdate.setUTCHours(17, 0, 0, 0)
    if (new Date() < lastUpdate) {
      lastUpdate.setDate(lastUpdate.getDate() - 1)
    }
    response.headers.set('Last-Modified', lastUpdate.toUTCString())

    return response

  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
