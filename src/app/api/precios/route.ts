import { NextRequest, NextResponse } from 'next/server'
import marketPrices from '@/lib/data/market-prices.json'
import { authenticate, setQuotaHeaders } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { logEvent } from '@/lib/ops'

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
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID()
  const t0 = Date.now()
  const ROUTE = '/api/precios'
  let auth: Exclude<Awaited<ReturnType<typeof authenticate>>, { ok: false }> | null = null

  const finalize = (resp: NextResponse): NextResponse => {
    resp.headers.set('X-Request-Id', requestId)
    void logEvent({
      eventType: 'api_call',
      status: resp.status >= 400 ? 'error' : 'ok',
      requestId,
      route: ROUTE,
      latencyMs: Date.now() - t0,
      statusCode: resp.status,
      userId: auth?.key.userId ?? null,
      apiKeyId: auth?.key.id ?? null,
    })
    return resp
  }

  try {
    const result = await authenticate(request)
    if (!result.ok) return finalize(result.response as NextResponse<ErrorResponse>)
    auth = result

    const { searchParams } = new URL(request.url)
    const categoriaParam = searchParams.get('categoria')?.toLowerCase() || null
    const detallado = searchParams.get('detallado') === 'true'
    const historicoParam = searchParams.get('historico')
    const historicoDays = historicoParam
      ? Math.max(7, Math.min(3650, parseInt(historicoParam, 10) || 90))
      : null

    // Detailed mode — return 16 sub-categories from mag_prices_detailed
    if (detallado) {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('mag_prices_detailed')
        .select('date, subcategory, category_group, weight_threshold, price_min, price_max, price_avg, price_median, head_count, total_amount, total_kgs, kg_avg')
        .order('date', { ascending: false })
        .limit(50)

      if (error || !data || data.length === 0) {
        return finalize(NextResponse.json({
          success: false,
          error: {
            code: 'NO_DETAILED_DATA',
            message: 'No detailed price data available yet. The daily scrape runs after MAG closes (martes/miércoles/viernes ~15:30 ART).',
          },
        }, { status: 503 }))
      }

      const latestDate = data[0].date
      const rows = data.filter((r) => r.date === latestDate)

      const response = NextResponse.json({
        success: true,
        data: {
          fecha: latestDate,
          subcategorias: rows,
          fuente: 'Mercado Agroganadero — haciinfo000502 (Resolución MPyT)',
          fuente_url: 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502',
        },
        timestamp: new Date().toISOString(),
      })
      response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')
      if (auth) setQuotaHeaders(response, auth)
      return finalize(response)
    }

    // Historical mode — return INMAG series from mag_inmag_history
    if (historicoDays !== null) {
      const admin = createAdminClient()
      const cutoff = new Date()
      cutoff.setUTCDate(cutoff.getUTCDate() - historicoDays)
      const { data, error } = await admin
        .from('mag_inmag_history')
        .select('date, head_count, total_amount, inmag_value, inmag_calculated, variation')
        .gte('date', cutoff.toISOString().slice(0, 10))
        .order('date', { ascending: true })

      if (error || !data) {
        return finalize(NextResponse.json({
          success: false,
          error: {
            code: 'HISTORY_FETCH_FAILED',
            message: error?.message ?? 'Failed to load INMAG history.',
          },
        }, { status: 500 }))
      }

      const calculated = data.filter((r) => r.inmag_calculated && r.inmag_value !== null)
      const values = calculated.map((r) => Number(r.inmag_value))
      const stats = values.length
        ? {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((s, v) => s + v, 0) / values.length,
          }
        : null

      const response = NextResponse.json({
        success: true,
        data: {
          dias: historicoDays,
          desde: cutoff.toISOString().slice(0, 10),
          hasta: data.length ? data[data.length - 1].date : null,
          serie: data,
          estadisticas: stats,
          fuente: 'Mercado Agroganadero — INMAG diario (haciinfo000011)',
          fuente_url: 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011',
        },
        timestamp: new Date().toISOString(),
      })
      response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')
      if (auth) setQuotaHeaders(response, auth)
      return finalize(response)
    }

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
        return finalize(NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category "${categoriaParam}". Valid categories: ${VALID_CATEGORIES.join(', ')}`
          }
        }, { status: 400 }))
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
        // Aditivo (v1.104.0): índice oficial del MAG para arrendamientos rurales
        // (haciinfo000013). null hasta que el scrape diario lo traiga.
        indice_arrendamiento_oficial:
          (marketPrices as { arrendamientoOficial?: { index: number; date: string; periodIndex?: number | null; source?: string } }).arrendamientoOficial ?? null,
        fuente: 'INMAG - Mercado Agroganadero',
        fecha_actualizacion: marketPrices.lastUpdate
      },
      timestamp: new Date().toISOString()
    } as SuccessResponse)

    // Cache for 1 hour (prices update daily)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    if (auth) setQuotaHeaders(response, auth)

    return finalize(response)

  } catch (error) {
    console.error('Error fetching precios:', error)
    return finalize(NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 }))
  }
}
