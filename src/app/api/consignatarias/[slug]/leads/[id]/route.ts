import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { mismoEmail } from '@/lib/claims/aprobar'
import { esEtapa, NOTAS_MAX } from '@/lib/leads/pipeline'

type Props = { params: Promise<{ slug: string; id: string }> }

/**
 * Mover una consulta de etapa o anotarla (18-10-2026). Sólo el dueño de la ficha.
 * No requiere PRO: una firma FREE ve que la consulta existe y puede ordenar su
 * pipeline; lo que se paga es el contacto, que ni siquiera viaja al panel.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { slug, id } = await params
  const supabase = requireServiceClient()

  const { data: consig } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .single()
  if (!consig || !mismoEmail(consig.claimed_by_email, auth.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: lead } = await supabase
    .from('consignataria_leads')
    .select('id, status, contacted_at')
    .eq('id', Number(id))
    .eq('consignataria_slug', slug)
    .maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as { status?: unknown; notes?: unknown }
  const ahora = new Date().toISOString()
  const updates: { status?: string; notes?: string | null; updated_at: string; contacted_at?: string } = { updated_at: ahora }

  if ('status' in body) {
    if (!esEtapa(body.status)) return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
    updates.status = body.status
    // La primera vez que sale de "nueva" queda la fecha: es el tiempo de respuesta.
    if (body.status !== 'new' && !lead.contacted_at) updates.contacted_at = ahora
  }
  if ('notes' in body) {
    if (body.notes != null && typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'Nota inválida' }, { status: 400 })
    }
    const nota = (body.notes ?? '').trim()
    if (nota.length > NOTAS_MAX) return NextResponse.json({ error: `La nota supera ${NOTAS_MAX} caracteres` }, { status: 400 })
    updates.notes = nota || null
  }
  if (!('status' in updates) && !('notes' in updates)) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('consignataria_leads')
    .update(updates)
    .eq('id', lead.id)
    .select('id, status, notes, updated_at, contacted_at')
    .single()
  if (error) {
    console.error('Lead update error:', error)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
  return NextResponse.json(data)
}
