import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import { alertaUpdateSchema, alertaIdSchema } from '@/lib/validators/alerta'

// Auth vía el sistema canónico `authenticate()` (api_keys hasheadas). El ownership
// de cada alerta se verifica por `user_id` (antes por la key en texto plano).

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
): Promise<NextResponse> {
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

    // Auth (api_keys hasheadas, Authorization: Bearer sk_...)
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.key.userId

    const supabase = requireServiceClient()

    // Get alert (ownership por user_id). PGRST116 = 0 filas (no existe / no es tuya)
    // → 404 sin distinguir (no filtrar ownership). Cualquier OTRO error es un fallo
    // operativo real → se loguea para no volverlo invisible.
    const { data: alerta, error } = await supabase
      .from('alertas')
      .select('*')
      .eq('id', alerta_id)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[alertas GET] error de DB al buscar la alerta:', error)
    }
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
): Promise<NextResponse> {
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

    // Auth (api_keys hasheadas, Authorization: Bearer sk_...)
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.key.userId

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

    const supabase = requireServiceClient()

    // Verify ownership first
    const { data: existing } = await supabase
      .from('alertas')
      .select('id')
      .eq('id', alerta_id)
      .eq('user_id', userId)
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
): Promise<NextResponse> {
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

    // Auth (api_keys hasheadas, Authorization: Bearer sk_...)
    const auth = await authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.key.userId

    const supabase = requireServiceClient()

    // Delete alert (verify ownership via api_key)
    const { error } = await supabase
      .from('alertas')
      .delete()
      .eq('id', alerta_id)
      .eq('user_id', userId)

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
