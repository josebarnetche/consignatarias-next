import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/leads/activity'
import { tokenConfirmacionValido, vigente } from '@/lib/agente/confirmacion'
import { pendienteVerificacion } from '@/lib/agente/verificacion'

export const dynamic = 'force-dynamic'

/**
 * Doble opt-in (src/lib/agente/confirmacion.ts): la persona confirma que el pedido
 * que cargó un tercero es suyo. Solo POST — el GET lo hacen los escáneres de correo.
 *
 *   POST /api/agente/confirmar?lead=<id>&t=<token>
 *
 * El token es un HMAC de (lead, mail). Pasa el lead de `needs_review` a `new` y el
 * agente lo toma en la corrida siguiente. Idempotente: un lead ya confirmado
 * devuelve ok. Un lead descartado, vencido o con token ajeno, 400.
 */
export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const id = Number(sp.get('lead'))
  const t = sp.get('t')
  if (!Number.isInteger(id) || id <= 0 || !t) return NextResponse.json({ ok: false, error: 'link inválido' }, { status: 400 })

  const db = requireServiceClient() as unknown as SupabaseClient
  const { data: l } = await db.from('producer_leads').select('id,email,status,source,created_at').eq('id', id).maybeSingle()
  if (!l?.email || !tokenConfirmacionValido(id, l.email, t)) return NextResponse.json({ ok: false, error: 'link inválido' }, { status: 400 })
  if (l.status === 'new') return NextResponse.json({ ok: true, ya: true })
  if (!pendienteVerificacion(l)) return NextResponse.json({ ok: false, error: 'este pedido ya no está abierto' }, { status: 400 })
  if (!vigente(l.created_at, new Date())) return NextResponse.json({ ok: false, error: 'el link venció' }, { status: 400 })

  const { error } = await db.from('producer_leads').update({ status: 'new' }).eq('id', id).eq('status', 'needs_review')
  if (error) return NextResponse.json({ ok: false, error: 'no se pudo confirmar' }, { status: 500 })
  await logActivity(db, { leadId: id, kind: 'sistema', body: `El contacto confirmó el pedido (doble opt-in): ${l.email}. Pasa al agente.`, actor: 'confirmacion' })
  return NextResponse.json({ ok: true })
}
