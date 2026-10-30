import 'server-only'
import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase'
import { getCronHealth, type CronHealthRow } from '@/lib/ops'

/**
 * Lo que el admin tiene que mirar HOY. Alimenta los contadores de la navegación
 * lateral y la bandeja de /admin. Una sola pasada por request (React `cache`):
 * el layout y la página la comparten sin duplicar queries.
 *
 * Soft-fail por ítem: `null` = "s/d" (la query falló), nunca un 0 inventado.
 */

/** Criterio de salud de un cron: falló, o pasó 1,5× su intervalo esperado. */
export const CRON_OVERDUE_FACTOR = 1.5

export function cronEnRojo(c: CronHealthRow): boolean {
  const failed = c.status === 'error' || c.status === 'timeout'
  const overdue = c.age_hours === null || c.age_hours > c.expected_interval_hours * CRON_OVERDUE_FACTOR
  return failed || overdue
}

export interface AdminPendientes {
  claimsConsignatarias: number | null
  claimsFrigorificos: number | null
  reviews: number | null
  campos: number | null
  /** Leads `new` + `needs_review` que esperan a una persona: sin caso del agente o con caso `escalado`. */
  leadsSinTrabajar: number | null
  opsErrores24h: number | null
  cronsEnRojo: CronHealthRow[] | null
}

type Client = NonNullable<ReturnType<typeof createServiceClient>>

async function contar(
  run: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  try {
    const { count, error } = await run()
    if (error || count == null) return null
    return count
  } catch {
    return null
  }
}

/**
 * Ids de los leads `new`/`needs_review` que esperan a José. El agente descarta o
 * trabaja sin tocar `producer_leads.status`, así que contar por status mostraba 30
 * "sin trabajar" cuando eran 5 (22-10-2026: 12 descartados, 9 pidiendo datos y 4
 * ofreciendo los lleva el agente solo). Queda lo que no tiene caso o está `escalado`.
 */
export async function idsLeadsSinTrabajar(db: Client): Promise<number[] | null> {
  try {
    const { data: leads, error } = await db.from('producer_leads').select('id').in('status', ['new', 'needs_review'])
    if (error) return null
    const ids = (leads ?? []).map((l) => l.id as number)
    if (ids.length === 0) return []
    const { data: casos, error: e2 } = await db.from('agente_casos').select('lead_id, estado').in('lead_id', ids)
    if (e2) return null
    const enAgente = new Set((casos ?? []).filter((c) => c.estado !== 'escalado').map((c) => c.lead_id as number))
    return ids.filter((id) => !enAgente.has(id))
  } catch {
    return null
  }
}

export const getAdminPendientes = cache(async (): Promise<AdminPendientes> => {
  const db = createServiceClient() as Client | null
  if (!db) {
    return {
      claimsConsignatarias: null, claimsFrigorificos: null, reviews: null, campos: null,
      leadsSinTrabajar: null, opsErrores24h: null, cronsEnRojo: null,
    }
  }
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString()

  const [claimsConsignatarias, claimsFrigorificos, reviews, campos, leadsSinTrabajar, opsErrores24h, crons] =
    await Promise.all([
      contar(() => db.from('consignataria_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      contar(() => db.from('frigorifico_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      contar(() => db.from('consignataria_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      contar(() => db.from('campos').select('id', { count: 'exact', head: true }).eq('status', 'pendiente')),
      idsLeadsSinTrabajar(db).then((ids) => (ids ? ids.length : null)),
      contar(() =>
        db.from('ops_events').select('*', { count: 'exact', head: true }).eq('status', 'error').gte('created_at', since24h),
      ),
      getCronHealth().catch(() => null),
    ])

  return {
    claimsConsignatarias,
    claimsFrigorificos,
    reviews,
    campos,
    leadsSinTrabajar,
    opsErrores24h,
    cronsEnRojo: crons ? crons.filter(cronEnRojo) : null,
  }
})

/** Suma de lo que requiere una decisión humana (no incluye salud del sistema). */
export function totalPorDecidir(p: AdminPendientes): number {
  return [p.claimsConsignatarias, p.claimsFrigorificos, p.reviews, p.campos, p.leadsSinTrabajar].reduce<number>(
    (acc, n) => acc + (n ?? 0),
    0,
  )
}
