import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { alertaUpdateSchema, alertaIdSchema } from '@/lib/validators/alerta'

interface AlertaData {
  alerta_id: string
  name: string
  webhook_url: string
  filters: Record<string, unknown>
  events: string[]
  frequency: string
  status: string
  triggers_count: number
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
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
 * Validate API key from header
 */
async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('api_key') || request.headers.get('x-api-key')
  
  if (!apiKey) {
    return { valid: false, error: 'API key requerida', code: 'MISSING_API_KEY' }
  }

  const supabase = createServiceClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('id, email, plan')
    .eq('api_key', apiKey)
    .single()

  if (!user) {
    return { valid: false, error: 'API key inválida', code: 'INVALID_API_KEY' }
  }

  return { valid: true, user, apiKey }
}

interface RouteParams {
  params: Promise<{ alerta_id: string }>
}

/**
 * GET /api/alertas/[alerta_id]
 * 
 * Get a single alert by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse<AlertaData> | ErrorResponse>> {
  try {
    const { alerta_id } = await params

    // Validate alerta_id
    const idParsed = alertaIdSchema.safeParse(alerta_id)
    if (!idParsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'ID de alerta inválido',
        },
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Validate API key
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: { code: auth.code!, message: auth.error! },
      }, { 
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const supabase = createServiceClient()

    // Get alert (verify ownership via api_key)
    const { data: alerta, error } = await supabase
      .from('alertas')
      .select('*')
      .eq('id', alerta_id)
      .eq('api_key', auth.apiKey)
      .single()

    if (error || !alerta) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alerta no encontrada',
        },
      }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        alerta_id: alerta.id,
        name: alerta.name,
        webhook_url: alerta.webhook_url,
        filters: alerta.filters,
        events: alerta.events,
        frequency: alerta.frequency,
        status: alerta.status,
        triggers_count: alerta.triggers_count,
        last_triggered_at: alerta.last_triggered_at,
        created_at: alerta.created_at,
        updated_at: alerta.updated_at,
      },
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (error) {
    console.error('Alerta get error:', error)
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
 * PATCH /api/alertas/[alerta_id]
 * 
 * Update alert configuration.
 * 
 * Request body:
 * {
 *   "status": "paused",
 *   "filters": { ... },
 *   "frequency": "daily_digest"
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse<AlertaData> | ErrorResponse>> {
  try {
    const { alerta_id } = await params

    // Validate alerta_id
    const idParsed = alertaIdSchema.safeParse(alerta_id)
    if (!idParsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'ID de alerta inválido',
        },
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Validate API key
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: { code: auth.code!, message: auth.error! },
      }, { 
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const body = await request.json()
    
    // Validate input
    const parsed = alertaUpdateSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de actualización inválidos',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const supabase = createServiceClient()

    // Verify ownership first
    const { data: existing } = await supabase
      .from('alertas')
      .select('id')
      .eq('id', alerta_id)
      .eq('api_key', auth.apiKey)
      .single()

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alerta no encontrada',
        },
      }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.webhook_url !== undefined) updates.webhook_url = parsed.data.webhook_url
    if (parsed.data.filters !== undefined) updates.filters = parsed.data.filters
    if (parsed.data.events !== undefined) updates.events = parsed.data.events
    if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency
    if (parsed.data.status !== undefined) updates.status = parsed.data.status

    // Update alert
    const { data: alerta, error: updateError } = await supabase
      .from('alertas')
      .update(updates)
      .eq('id', alerta_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Alerta update error:', updateError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Error al actualizar la alerta',
        },
      }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        alerta_id: alerta.id,
        name: alerta.name,
        webhook_url: alerta.webhook_url,
        filters: alerta.filters,
        events: alerta.events,
        frequency: alerta.frequency,
        status: alerta.status,
        triggers_count: alerta.triggers_count,
        last_triggered_at: alerta.last_triggered_at,
        created_at: alerta.created_at,
        updated_at: alerta.updated_at,
      },
      message: 'Alerta actualizada correctamente',
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (error) {
    console.error('Alerta update error:', error)
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
 * DELETE /api/alertas/[alerta_id]
 * 
 * Delete an alert subscription.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse<{ deleted: boolean }> | ErrorResponse>> {
  try {
    const { alerta_id } = await params

    // Validate alerta_id
    const idParsed = alertaIdSchema.safeParse(alerta_id)
    if (!idParsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'ID de alerta inválido',
        },
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Validate API key
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: { code: auth.code!, message: auth.error! },
      }, { 
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const supabase = createServiceClient()

    // Delete alert (verify ownership via api_key)
    const { error } = await supabase
      .from('alertas')
      .delete()
      .eq('id', alerta_id)
      .eq('api_key', auth.apiKey)

    if (error) {
      console.error('Alerta delete error:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Error al eliminar la alerta',
        },
      }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      message: 'Alerta eliminada correctamente',
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })

  } catch (error) {
    console.error('Alerta delete error:', error)
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
