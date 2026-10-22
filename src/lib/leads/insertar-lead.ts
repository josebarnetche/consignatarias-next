/**
 * insertar-lead.ts — alta de una fila en `producer_leads` con el mismo dedupe que
 * /api/producer-leads (email/teléfono + intent dentro de DEDUPE_WINDOW_HOURS).
 *
 * Lo usa el registro con consentimiento de la tool MCP `market_match`. El pase de
 * `demanda_compra` a `producer_leads` NO va acá: lo hace el agente
 * (`src/lib/agente/motor.ts`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert } from '@/lib/database.types'
import { dedupeKey, DEDUPE_WINDOW_HOURS } from '@/lib/leads/triage'

export type ProducerLeadInsert = TablesInsert<'producer_leads'>

export type InsertarResultado =
  | { ok: true; leadId: number; duplicate: boolean }
  | { ok: false; error: string }

/** Nunca tira: devuelve el resultado para que el llamador lo loguee y siga. */
export async function insertarLeadConDedupe(supabase: SupabaseClient, row: ProducerLeadInsert): Promise<InsertarResultado> {
  try {
    const dkey = dedupeKey({ email: row.email, phone: row.phone, intent: row.intent })
    if (dkey) {
      const desde = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 3600 * 1000).toISOString()
      const { data: previos } = await supabase
        .from('producer_leads')
        .select('id, email, phone, intent')
        .eq('intent', row.intent)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(500)
      const yaEsta = ((previos ?? []) as { id: number; email: string | null; phone: string | null; intent: string }[]).find(
        (p) => dedupeKey({ email: p.email, phone: p.phone, intent: p.intent }) === dkey,
      )
      if (yaEsta) return { ok: true, leadId: yaEsta.id, duplicate: true }
    }

    const { data, error } = await supabase.from('producer_leads').insert(row).select('id').single()
    if (error || !data) return { ok: false, error: error?.message ?? 'insert sin datos' }
    return { ok: true, leadId: (data as { id: number }).id, duplicate: false }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
