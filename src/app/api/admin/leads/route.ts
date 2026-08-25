import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import { logActivity, describeStatusChange, getActivityByLead } from '@/lib/leads/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * /api/admin/leads — operación de la máquina de lead-gen a performance.
 *  GET   → lista de producer_leads + stats (pipeline y fee potencial).
 *  PATCH → mueve un lead en el ciclo de vida (status), lo rutea a una firma,
 *          fija el fee real al cierre y guarda notas. Stampa timestamps.
 * Admin-gated por user_roles.role='admin'.
 */

/**
 * Devuelve el email del admin en sesión, o null si no lo es.
 *
 * Antes esto era un booleano. Ahora hace falta el email para firmar las entradas de
 * la bitácora: una línea que dice "lo movió alguien" no sirve el día que la firma
 * también cargue actividad desde su panel.
 */
async function adminEmail(): Promise<string | null> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const { data: role } = await userClient.from('user_roles').select('role').eq('user_id', user.id).single()
  return role?.role === 'admin' ? (user.email ?? 'admin') : null
}

async function requireAdmin(): Promise<boolean> {
  return (await adminEmail()) !== null
}

// producer_leads no está en database.types → cliente sin tipar.
function db(): SupabaseClient {
  return requireServiceClient() as unknown as SupabaseClient
}

export async function GET(_req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await db()
    .from('producer_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('admin leads GET error:', error)
    return NextResponse.json({ error: 'Error al leer leads' }, { status: 500 })
  }

  const rows = (data || []) as Array<{ id: number; status: string; estimated_value_ars: number | null; fee_ars: number | null }>
  const byStatus: Record<string, number> = {}
  let openFeePotential = 0 // fee potencial de leads aún vivos (new/routed/contacted)
  let wonFee = 0
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
    if (['new', 'routed', 'contacted'].includes(r.status)) openFeePotential += Number(r.fee_ars || 0)
    if (r.status === 'won') wonFee += Number(r.fee_ars || 0)
  }

  // Bitácora de todos los leads en UNA query (no una por fila) — la lista del admin
  // muestra el historial inline y así no se convierte en N+1.
  const actividad = await getActivityByLead(db(), rows.map((r) => r.id))

  return NextResponse.json({
    leads: rows,
    activity: Object.fromEntries(actividad),
    stats: { total: rows.length, byStatus, openFeePotential, wonFee },
  })
}

// 'needs_review' lo pone el triage de la captura (`lib/leads/triage.ts`) cuando el
// lead no se puede rutear o parece una oferta de proveedor; 'discarded' es SIEMPRE
// una decisión humana desde acá — el triage nunca descarta solo.
const VALID_STATUS = ['new', 'needs_review', 'routed', 'contacted', 'won', 'lost', 'discarded']

export async function PATCH(req: NextRequest) {
  const actor = await adminEmail()
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const id = body?.id
  if (!id || typeof id !== 'number') return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // Estado previo, para que la bitácora diga de dónde a dónde se movió el lead.
  const { data: antes } = await db()
    .from('producer_leads')
    .select('status, routed_to_slug')
    .eq('id', id)
    .maybeSingle()

  const patch: Record<string, unknown> = {}
  const nowIso = new Date().toISOString()

  if (typeof body.status === 'string') {
    if (!VALID_STATUS.includes(body.status)) return NextResponse.json({ error: 'status inválido' }, { status: 400 })
    patch.status = body.status
    if (body.status === 'routed') patch.routed_at = nowIso
    if (body.status === 'contacted') patch.contacted_at = nowIso
    if (body.status === 'won' || body.status === 'lost') patch.closed_at = nowIso
  }
  if (typeof body.routed_to_slug === 'string') {
    patch.routed_to_slug = body.routed_to_slug || null
    if (!patch.status) { patch.status = 'routed'; patch.routed_at = nowIso }
  }
  if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 2000)
  if (body.fee_ars != null && !Number.isNaN(Number(body.fee_ars))) patch.fee_ars = Number(body.fee_ars)

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nada para actualizar' }, { status: 400 })

  const { data, error } = await db().from('producer_leads').update(patch).eq('id', id).select('*').single()
  if (error) {
    console.error('admin leads PATCH error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  // Bitácora automática. Va DESPUÉS del update y nunca lo hace fallar: si el lead
  // se movió, se movió, aunque la línea de historial no se haya podido escribir.
  const statusNuevo = typeof patch.status === 'string' ? patch.status : null
  const slugNuevo = typeof patch.routed_to_slug === 'string' ? patch.routed_to_slug : null
  if (statusNuevo || slugNuevo) {
    const statusAnterior = antes?.status ?? '—'
    await logActivity(db(), {
      leadId: id,
      kind: slugNuevo && slugNuevo !== antes?.routed_to_slug ? 'ruteo' : 'estado',
      body: describeStatusChange(statusAnterior, statusNuevo ?? statusAnterior, slugNuevo),
      actor,
      meta: { from: statusAnterior, to: statusNuevo, slug: slugNuevo },
    })
  }

  return NextResponse.json({ success: true, lead: data })
}
