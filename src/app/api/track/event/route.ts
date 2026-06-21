import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { isValueEvent, VALUE_EVENTS } from '@/lib/value-events'

/**
 * POST /api/track/event — beacon del sistema interno de conteo de eventos de valor.
 *
 * El cliente (trackValueEvent) lo llama cuando ocurre una acción con valor atribuible.
 * Valida el evento contra el registro src/lib/value-events.ts, DERIVA el peso de ahí
 * (no confía en el cliente), y persiste en value_events con la atribución (source/engine,
 * entidad, path, sesión). Espeja el evento GA4 pero nos da el dato propio y queryable.
 */

const ALLOWED_SOURCES = new Set(['ai', 'organic', 'direct', 'referral', 'social', 'unknown'])
const ALLOWED_ENTITY = new Set(['consignataria', 'frigorifico', 'categoria', 'remate', 'global'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const event = typeof body.event === 'string' ? body.event : ''
    if (!isValueEvent(event)) {
      return NextResponse.json({ error: 'Unknown value event' }, { status: 400 })
    }

    const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null)
    const entityType = ALLOWED_ENTITY.has(body.entityType) ? body.entityType : null
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'unknown'
    // meta: objeto chico y serializable; cap defensivo de tamaño.
    let meta: unknown = null
    if (body.meta && typeof body.meta === 'object') {
      const s = JSON.stringify(body.meta)
      if (s.length <= 1000) meta = body.meta
    }

    const supabase = requireServiceClient()
    const { error } = await supabase.from('value_events').insert({
      event,
      weight: VALUE_EVENTS[event].weight, // server-side, no se confía en el cliente
      entity_type: entityType,
      entity_slug: clip(body.entitySlug, 200),
      source,
      ai_engine: clip(body.aiEngine, 32),
      path: clip(body.path, 512),
      session_id: clip(body.sessionId, 64),
      meta,
    })

    if (error) {
      console.error('value_event insert error:', error)
      // tabla puede no existir en algún entorno — no romper la navegación.
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('track event error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
