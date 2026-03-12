import { NextRequest, NextResponse } from 'next/server'
import marketPrices from '@/lib/data/market-prices.json'

// Valid categories
const VALID_CATEGORIES = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'] as const
type Category = typeof VALID_CATEGORIES[number]

// Response types
interface PrecioItem {
  categoria: string
  precio_kg: number
  moneda: 'ARS'
  variacion_semanal: string
}

interface SuccessResponse {
  success: true
  data: {
    precios: PrecioItem[]
    indice_inmag: {
      valor: number
      unidad: string
      variacion_semanal: string
    }
    fuente: string
    fecha_actualizacion: string
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
 * GET /api/precios
 * 
 * Returns current INMAG reference prices for cattle market categories.
 * Data sourced from mercadoagroganadero.com.ar
 * 
 * Query params:
 * - categoria: Filter by category (optional)
 *   Valid values: novillos, novillitos, vaquillonas, vacas, toros, terneros
 *   Also accepts singular forms: novillo, vaquillona, vaca, toro, ternero
 * 
 * Examples:
 * - GET /api/precios → All categories
 * - GET /api/precios?categoria=novillos → Single category
 * - GET /api/precios?categoria=novillo → Also works (normalized to plural)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const categoriaParam = searchParams.get('categoria')?.toLowerCase() || null

    // Normalize singular to plural forms
    const normalizeCategory = (cat: string): string => {
      const singularToPlural: Record<string, string> = {
        'novillo': 'novillos',
        'novillito': 'novillitos',
        'vaquillona': 'vaquillonas',
        'vaca': 'vacas',
        'toro': 'toros',
        'ternero': 'terneros'
      }
      return singularToPlural[cat] || cat
    }

    // Validate category if provided
    let requestedCategories: Category[]
    if (categoriaParam) {
      const normalizedCategory = normalizeCategory(categoriaParam) as Category
      if (!VALID_CATEGORIES.includes(normalizedCategory)) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category "${categoriaParam}". Valid categories: ${VALID_CATEGORIES.join(', ')}`
          }
        }, { status: 400 })
      }
      requestedCategories = [normalizedCategory]
    } else {
      requestedCategories = [...VALID_CATEGORIES]
    }

    // Build prices array from market data
    const categories = marketPrices.categories as Record<string, {
      current: number
      prev: number
      change: number
      source: string
      sioWeek?: string
    }>

    const precios: PrecioItem[] = requestedCategories.map(cat => {
      const data = categories[cat]
      const changeStr = data.change >= 0 ? `+${data.change}%` : `${data.change}%`
      return {
        categoria: cat,
        precio_kg: data.current,
        moneda: 'ARS' as const,
        variacion_semanal: changeStr
      }
    })

    // INMAG index data
    const inmag = marketPrices.inmag
    const inmagChangeStr = inmag.change >= 0 ? `+${inmag.change}%` : `${inmag.change}%`

    const response = NextResponse.json({
      success: true,
      data: {
        precios,
        indice_inmag: {
          valor: inmag.current,
          unidad: inmag.unit,
          variacion_semanal: inmagChangeStr
        },
        fuente: 'INMAG - Mercado Agroganadero',
        fecha_actualizacion: marketPrices.lastUpdate
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 1 hour (prices update daily)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    return response

  } catch (error) {
    console.error('Error fetching precios:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}
