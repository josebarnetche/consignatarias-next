/**
 * activity.ts — la bitácora de un lead.
 *
 * `producer_leads.status` es la foto (dónde está el negocio); `lead_activity` es la
 * película (qué se hizo para llevarlo ahí). Antes sólo existía la foto, así que el
 * trabajo real —las llamadas, lo que contestó el productor, a qué firma se le
 * ofreció— vivía en la cabeza de quien lo hizo.
 *
 * Append-only por convención: acá no hay update ni delete. Un registro mal cargado
 * se corrige agregando otro, igual que en un libro de actas.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVITY_KINDS = [
  'llamada', 'whatsapp', 'email', 'reunion', 'nota', 'estado', 'ruteo', 'sistema',
] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export const ACTIVITY_OUTCOMES = [
  'sin_respuesta', 'contesto', 'interesado', 'no_interesa', 'pendiente', 'cerrado',
] as const
export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number]

/** Los que registra una persona; el resto los escribe el backend. */
export const HUMAN_KINDS: ActivityKind[] = ['llamada', 'whatsapp', 'email', 'reunion', 'nota']

export const KIND_LABEL: Record<ActivityKind, string> = {
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Email',
  reunion: 'Reunión',
  nota: 'Nota',
  estado: 'Cambio de estado',
  ruteo: 'Ruteo',
  sistema: 'Sistema',
}

export const OUTCOME_LABEL: Record<ActivityOutcome, string> = {
  sin_respuesta: 'Sin respuesta',
  contesto: 'Contestó',
  interesado: 'Interesado',
  no_interesa: 'No le interesa',
  pendiente: 'Pendiente',
  cerrado: 'Cerrado',
}

export interface ActivityRow {
  id: number
  lead_id: number
  created_at: string
  kind: ActivityKind
  outcome: ActivityOutcome | null
  body: string | null
  actor: string | null
  meta: Record<string, unknown> | null
}

export interface LogActivityInput {
  leadId: number
  kind: ActivityKind
  outcome?: ActivityOutcome | null
  body?: string | null
  actor?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * Escribe una entrada en la bitácora.
 *
 * NUNCA lanza: perder una línea de bitácora es malo, pero hacer fallar el cambio de
 * estado del lead por eso es peor. Si falla, queda en el log del server.
 */
export async function logActivity(db: SupabaseClient, input: LogActivityInput): Promise<boolean> {
  try {
    const { error } = await db.from('lead_activity').insert({
      lead_id: input.leadId,
      kind: input.kind,
      outcome: input.outcome ?? null,
      body: input.body?.slice(0, 4000) ?? null,
      actor: input.actor ?? null,
      meta: input.meta ?? null,
    })
    if (error) {
      console.error('[lead_activity] no se pudo registrar:', input.leadId, input.kind, error)
      return false
    }
    return true
  } catch (e) {
    console.error('[lead_activity] excepción al registrar:', input.leadId, e)
    return false
  }
}

/** Bitácora de un lead, la más reciente primero. */
export async function getActivity(
  db: SupabaseClient,
  leadId: number,
  limit = 100,
): Promise<ActivityRow[]> {
  const { data, error } = await db
    .from('lead_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[lead_activity] error al leer:', leadId, error)
    return []
  }
  return (data ?? []) as ActivityRow[]
}

/**
 * Bitácora de varios leads de una, para pintar la lista del admin sin hacer una
 * query por fila.
 */
export async function getActivityByLead(
  db: SupabaseClient,
  leadIds: number[],
): Promise<Map<number, ActivityRow[]>> {
  const porLead = new Map<number, ActivityRow[]>()
  if (leadIds.length === 0) return porLead

  const { data, error } = await db
    .from('lead_activity')
    .select('*')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[lead_activity] error al leer en lote:', error)
    return porLead
  }

  for (const row of (data ?? []) as ActivityRow[]) {
    porLead.set(row.lead_id, [...(porLead.get(row.lead_id) ?? []), row])
  }
  return porLead
}

/**
 * Frase para la entrada automática de un cambio de estado.
 *
 * Se escribe en la bitácora en cada PATCH para que el historial esté completo aunque
 * nadie cargue una nota a mano: sin esto, un lead que pasa de 'new' a 'won' no deja
 * rastro de cuándo pasó ni quién lo movió.
 */
export function describeStatusChange(anterior: string, nuevo: string, slug?: string | null): string {
  if (anterior === nuevo && slug) return `Ruteado a ${slug}`
  if (slug) return `${anterior} → ${nuevo} · ruteado a ${slug}`
  return `${anterior} → ${nuevo}`
}
