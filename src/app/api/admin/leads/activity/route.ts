import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'
import {
  logActivity,
  getActivity,
  ACTIVITY_KINDS,
  ACTIVITY_OUTCOMES,
  HUMAN_KINDS,
  type ActivityKind,
  type ActivityOutcome,
} from '@/lib/leads/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * /api/admin/leads/activity — bitácora de un lead.
 *
 *  GET  ?leadId=123 → historial completo, lo más nuevo primero.
 *  POST             → registra una actividad hecha por una persona (llamada,
 *                     WhatsApp, email, reunión, nota).
 *
 * Los tipos 'estado' y 'ruteo' NO se aceptan por acá: los escribe el PATCH de
 * /api/admin/leads solo. Si se pudieran cargar a mano, el historial dejaría de ser
 * confiable como registro de lo que el sistema hizo de verdad.
 *
 * Admin-gated por user_roles.role='admin'.
 */

async function adminEmail(): Promise<string | null> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const { data: role } = await userClient.from('user_roles').select('role').eq('user_id', user.id).single()
  return role?.role === 'admin' ? (user.email ?? 'admin') : null
}

function db(): SupabaseClient {
  return requireServiceClient() as unknown as SupabaseClient
}

export async function GET(req: NextRequest) {
  if (!(await adminEmail())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const leadId = Number(req.nextUrl.searchParams.get('leadId'))
  if (!leadId || Number.isNaN(leadId)) {
    return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })
  }

  return NextResponse.json({ activity: await getActivity(db(), leadId) })
}

export async function POST(req: NextRequest) {
  const actor = await adminEmail()
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const leadId = Number(body?.leadId)
  if (!leadId || Number.isNaN(leadId)) {
    return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })
  }

  const kind = body?.kind as ActivityKind
  if (!ACTIVITY_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 })
  }
  if (!HUMAN_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `'${kind}' lo escribe el sistema, no se carga a mano` },
      { status: 400 },
    )
  }

  const outcome = (body?.outcome ?? null) as ActivityOutcome | null
  if (outcome !== null && !ACTIVITY_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: 'outcome inválido' }, { status: 400 })
  }

  const texto = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!texto && !outcome) {
    return NextResponse.json(
      { error: 'Escribí qué pasó o elegí un resultado' },
      { status: 400 },
    )
  }

  // El lead tiene que existir: la FK lo garantizaría, pero un 400 explícito es
  // mejor mensaje que un 500 de constraint.
  const { data: lead } = await db()
    .from('producer_leads')
    .select('id')
    .eq('id', leadId)
    .maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Lead inexistente' }, { status: 404 })

  const ok = await logActivity(db(), { leadId, kind, outcome, body: texto || null, actor })
  if (!ok) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })

  return NextResponse.json({ success: true, activity: await getActivity(db(), leadId) })
}
