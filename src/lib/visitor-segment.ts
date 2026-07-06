import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * Segmentación del visitante a partir de su historial first-party (tabla visitors,
 * ligada por la cookie `cid`). Base de la personalización: cualquier server component
 * o el endpoint /api/visitor/me pueden pedir el contexto y adaptar el contenido.
 *
 * Segmentos (por prioridad):
 *  - consignataria: aterrizó en superficies de oferta B2B (para-consignatarias/planes/enterprise)
 *  - ai-curious: nos encontró vía un motor de IA (ChatGPT, Copilot, …)
 *  - returning: ya nos visitó antes (visits > 1)
 *  - nuevo: primera visita, origen directo
 */
export type VisitorSegment = 'consignataria' | 'ai-curious' | 'returning' | 'nuevo'

export interface VisitorContext {
  segment: VisitorSegment
  isReturning: boolean
  aiEngine: string | null
  visits: number
}

export async function getVisitorContext(): Promise<VisitorContext | null> {
  try {
    const cid = (await cookies()).get('cid')?.value
    if (!cid) return null
    const db = createAdminClient() as unknown as SupabaseClient
    const { data } = await db
      .from('visitors')
      .select('visits, ft_ai_engine, lt_ai_engine, ft_landing, lt_landing')
      .eq('cid', cid)
      .maybeSingle()
    if (!data) return null

    const visits = (data.visits as number) ?? 1
    const aiEngine = (data.lt_ai_engine as string | null) || (data.ft_ai_engine as string | null) || null
    const landing = ((data.lt_landing as string | null) || (data.ft_landing as string | null) || '').toLowerCase()
    const isReturning = visits > 1

    let segment: VisitorSegment = 'nuevo'
    if (/para-consignatarias|\/planes|\/enterprise/.test(landing)) segment = 'consignataria'
    else if (aiEngine) segment = 'ai-curious'
    else if (isReturning) segment = 'returning'

    return { segment, isReturning, aiEngine, visits }
  } catch {
    return null
  }
}
