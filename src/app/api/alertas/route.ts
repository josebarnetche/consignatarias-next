import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import type { Plan } from '@/lib/api-keys'
import { alertaCreateSchema, ALERTA_EVENTS, ALERTA_FREQUENCIES } from '@/lib/validators/alerta'

// Límite de alertas activas por plan API. Tipado contra `Plan` (starter/growth/scale)
// —los tiers reales que devuelve authenticate()— para que un desalineo sea error de
// COMPILACIÓN y no un cap silencioso. (Antes usaba free/pro/enterprise, que NO son
// planes reales → getAlertLimit caía siempre al fallback y capaba a todos en 3.)
const ALERT_LIMITS: Record<Plan, number> = {
  starter: 25,
  growth: 100,
  scale: 500,
}

function getAlertLimit(plan: Plan): number {
  return ALERT_LIMITS[plan]
}

// El auth de este endpoint usa el sistema canónico `authenticate()` (api_keys
// hasheadas, con cupo mensual + IP allowlist + requiere un plan API activo:
// starter/growth/scale). Antes había un validateApiKey local que buscaba
// `users.api_key` en TEXTO PLANO contra una tabla `public.users` inexistente en
// prod → SIEMPRE devolvía 401 (endpoint muerto). Ownership de las alertas: por
// `user_id` (no por la key), consistente con los crons de entrega.

/**
 * POST /api/alertas
 * 
 * Create a new alert subscription.
 * 
 * Auth: Authorization: Bearer sk_... (API key del plan; ver /cuenta/api-keys)
 * 
 * Request body:
 * {
 *   "name": "Buenos Aires vacas gordas",
 *   "webhook_url": "https://api.example.com/subasto-alert",
 *   "filters": {
 *     "provincia": "Buenos Aires",
 *     "tipo": "vaca_gorda"
 *   },
 *   "events": ["remate.created", "remate.starting_soon"],
 *   "frequency": "immediate"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth: api_keys hasheadas (Authorization: Bearer sk_...), con cupo + plan.
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.key.userId

    const body = await request.json()
    
    // Validate input
    const parsed = alertaCreateSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de alerta inválidos',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const { name, webhook_url, filters, events, frequency } = parsed.data
    const supabase = requireServiceClient()

    // Check alert limit for user
    const { count } = await supabase
      .from('alertas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active')

    const limit = getAlertLimit(auth.plan)
    if (count !== null && count >= limit) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Has alcanzado el límite de ${limit} alertas activas. Actualiza tu plan para crear más.`,
        },
      }, { 
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Insert alert
    const { data: alerta, error: insertError } = await supabase
      .from('alertas')
      .insert({
        user_id: userId,
        name,
        webhook_url,
        filters: filters || {},
        events,
        frequency,
        status: 'active',
      })
      .select('id, name, status, created_at')
      .single()

    if (insertError) {
      console.error('Alerta insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: 'Error al crear la alerta',
        },
      }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Calculate next check time (5 min from now for immediate)
    const nextCheck = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    return NextResponse.json({
      success: true,
      data: {
        alerta_id: alerta.id,
        name: alerta.name,
        status: alerta.status,
        created_at: alerta.created_at,
        next_check: nextCheck,
      },
      message: 'Alerta creada correctamente',
    }, { 
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (error) {
    console.error('Alerta creation error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

/**
 * GET /api/alertas
 * 
 * List user's alert subscriptions.
 * 
 * Auth: Authorization: Bearer sk_... (API key del plan; ver /cuenta/api-keys)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth: api_keys hasheadas (Authorization: Bearer sk_...).
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.key.userId

    const supabase = requireServiceClient()

    // Get user's alertas
    const { data: alertas, error } = await supabase
      .from('alertas')
      .select('id, name, status, triggers_count, last_triggered_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Alerta fetch error:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error al obtener alertas',
        },
      }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const limit = getAlertLimit(auth.plan)

    return NextResponse.json({
      success: true,
      data: {
        alertas: (alertas || []).map(a => ({
          alerta_id: a.id,
          name: a.name,
          status: a.status,
          triggers_today: a.triggers_count, // Simplified for MVP
          last_triggered: a.last_triggered_at,
          created_at: a.created_at,
        })),
        total: alertas?.length || 0,
        limit,
      },
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (error) {
    console.error('Alerta list error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

/**
 * OPTIONS /api/alertas
 * 
 * Returns available event types and documentation.
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      available_events: ALERTA_EVENTS,
      available_frequencies: ALERTA_FREQUENCIES,
      documentation: 'https://consignatarias.com.ar/docs/api/alertas',
      example: {
        name: 'Buenos Aires vacas gordas',
        webhook_url: 'https://your-domain.com/webhook',
        events: ['remate.created', 'remate.starting_soon'],
        filters: {
          provincia: 'Buenos Aires',
          tipo: 'vaca_gorda',
        },
        frequency: 'immediate',
      },
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
