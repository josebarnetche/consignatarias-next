import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { webhookRegisterSchema, WEBHOOK_EVENTS } from '@/lib/validators/webhook'

interface SuccessResponse {
  success: true
  data: {
    webhook_id: string
    url: string
    events: string[]
    active: boolean
    created_at: string
  }
  message: string
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

/**
 * POST /api/webhooks/register
 * 
 * Register a new webhook subscription for real-time event notifications.
 * 
 * Request body:
 * {
 *   "url": "https://customer.com/webhook",        // Required, must be HTTPS
 *   "events": ["remate.created", "remate.live"],  // Required, at least one
 *   "secret": "your_secret_for_signatures",       // Required, min 16 chars
 *   "filters": {                                   // Optional
 *     "provincia": "BUENOS AIRES",
 *     "consignataria_slug": "aguirre-vazquez-s-a"
 *   },
 *   "description": "My integration",              // Optional
 *   "owner_email": "dev@company.com"              // Optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "webhook_id": "uuid",
 *     "url": "https://...",
 *     "events": [...],
 *     "active": true,
 *     "created_at": "2026-03-12T..."
 *   },
 *   "message": "Webhook registrado correctamente"
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const body = await request.json()
    
    // Validate input
    const parsed = webhookRegisterSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de webhook inválidos',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }, { status: 400 })
    }

    const { url, events, secret, filters, description, owner_email } = parsed.data
    
    const supabase = createServiceClient()

    // Check for duplicate URL (same URL + events combo)
    const { data: existing } = await supabase
      .from('webhooks')
      .select('id')
      .eq('url', url)
      .eq('active', true)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_WEBHOOK',
          message: 'Ya existe un webhook activo para esta URL. Desactívelo primero o use otra URL.',
        },
      }, { status: 409 })
    }

    // Insert webhook
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        url,
        events,
        secret,
        filters: filters || {},
        description: description || null,
        owner_email: owner_email || null,
        active: true,
      })
      .select('id, url, events, active, created_at')
      .single()

    if (insertError) {
      console.error('Webhook insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: 'Error al registrar el webhook',
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        webhook_id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        created_at: webhook.created_at,
      },
      message: 'Webhook registrado correctamente',
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook registration error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/register
 * 
 * Returns available event types and documentation.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      available_events: WEBHOOK_EVENTS,
      documentation: 'https://consignatarias.com.ar/docs/api/webhooks',
      example: {
        url: 'https://your-domain.com/webhook',
        events: ['remate.created', 'remate.starting_soon'],
        secret: 'your_secret_minimum_16_chars',
        filters: {
          provincia: 'BUENOS AIRES',
        },
      },
    },
  })
}
