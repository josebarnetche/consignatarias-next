/**
 * Karma ledger — saldo GASTABLE de karma (Fase 2 del gating/karma).
 *
 * Modelo: "pasás tiempo en la app → ganás karma → lo gastás como crédito" para
 * desbloquear funciones sin pagar. El saldo vive en la tabla `karma_ledger`
 * (append-only earn/spend); esta lib es la ÚNICA vía de escritura desde el server.
 *
 * Distinto del karma-REPUTACIÓN de src/lib/karma.ts (puntaje derivado que se
 * muestra en /cuenta). La unificación en UN solo número (mostrado = gastable) es
 * la decisión de producto; este ledger es el saldo real detrás.
 *
 * Requiere la migración supabase/migrations/20260709_karma_ledger.sql (aplicar
 * con ok del owner antes de usar en prod).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { VALUE_EVENTS, type ValueEvent } from '@/lib/value-events'

/**
 * Cliente service-role tipado en modo laxo para las ops de karma. Las tablas/RPC
 * de karma (`karma_ledger`, `karma_balance`, `spend_karma`) todavía NO están en
 * `database.types.ts` porque la migración `20260709_karma_ledger.sql` no se aplicó
 * aún. Al aplicarla y regenerar tipos, este cast se puede quitar y volver al
 * cliente tipado. Ver docs/analytics + supabase/migrations.
 */
function karmaDb(): SupabaseClient {
  return requireServiceClient() as unknown as SupabaseClient
}

/**
 * Economía tuneable. Son DEFAULTS razonables — ajustar con el owner antes de
 * abrir el gasto. Cambiar acá no toca el esquema (todo es data en el ledger).
 */
export const KARMA = {
  /** Karma acreditado = peso del value-event × este factor. */
  earnPerValueWeight: 1,
  /** Techo de karma/día por engagement pasivo (time_on_page, scroll…) anti-gaming. */
  dailyEngagementCap: 40,
  /** Créditos de arranque, una sola vez por usuario (idempotentes por ref). */
  seed: {
    load_hacienda: 20,
    first_follow: 5,
    newsletter: 8,
  },
  /** Catálogo de gasto: qué desbloquea y cuánto cuesta. */
  unlockCost: {
    inmag_history_deep: 30,
    saved_filter: 15,
    bulk_ics_export: 10,
  },
} as const

export type KarmaUnlock = keyof typeof KARMA.unlockCost

/** Saldo gastable actual del usuario. 0 si no hay ledger o hay error. */
export async function getKarmaBalance(userId: string): Promise<number> {
  const sb = karmaDb()
  const { data, error } = await sb.rpc('karma_balance', { p_user: userId })
  if (error || typeof data !== 'number') return 0
  return data
}

/**
 * Acredita karma de forma idempotente: si `ref` ya fue acreditado (mismo
 * user+reason+ref.id), no duplica. Devuelve true si acreditó algo nuevo.
 * `delta` debe ser > 0.
 */
export async function awardKarma(
  userId: string,
  delta: number,
  reason: string,
  ref?: { type?: string; id?: string },
): Promise<boolean> {
  if (!Number.isFinite(delta) || delta <= 0) return false
  const sb = karmaDb()
  const { error } = await sb.from('karma_ledger').insert({
    user_id: userId,
    delta: Math.floor(delta),
    reason,
    ref_type: ref?.type ?? null,
    ref_id: ref?.id ?? null,
  })
  // 23505 = unique violation → la fuente ya estaba acreditada (idempotencia OK).
  if (error && (error as { code?: string }).code !== '23505') return false
  return !error
}

/**
 * Gasta karma atómicamente vía la función SQL `spend_karma` (chequeo de saldo +
 * débito en una transacción, serializado por advisory lock). Devuelve el saldo
 * NUEVO, o null si el saldo no alcanzaba.
 */
export async function spendKarma(
  userId: string,
  cost: number,
  reason: string,
  refId?: string,
): Promise<number | null> {
  if (!Number.isFinite(cost) || cost <= 0) return null
  const sb = karmaDb()
  const { data, error } = await sb.rpc('spend_karma', {
    p_user: userId,
    p_cost: Math.floor(cost),
    p_reason: reason,
    p_ref_id: refId ?? null,
  })
  if (error || typeof data !== 'number') return null
  return data === -1 ? null : data // -1 = saldo insuficiente
}

/** Karma ganado hoy (UTC) por engagement pasivo — para el techo anti-gaming. */
async function engagementKarmaToday(userId: string): Promise<number> {
  const sb = karmaDb()
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await sb
    .from('karma_ledger')
    .select('delta')
    .eq('user_id', userId)
    .like('reason', 'engage:%')
    .gte('created_at', start.toISOString())
  if (error || !Array.isArray(data)) return 0
  return (data as Array<{ delta: number }>).reduce((a, r) => a + (r.delta > 0 ? r.delta : 0), 0)
}

/**
 * Acredita karma por un value-event de un usuario logueado. El engagement PASIVO
 * (grupo 'engagement': time_on_page, scroll…) tiene techo diario anti-gaming; los
 * grupos de intención real (lead, funnel, conversión, recurrencia, b2b, discovery)
 * acreditan completo. Llamado desde el beacon /api/track/event. Best-effort.
 */
export async function awardValueEventKarma(userId: string, event: string): Promise<void> {
  const def = VALUE_EVENTS[event as ValueEvent]
  if (!def) return
  const base = def.weight * KARMA.earnPerValueWeight
  if (base <= 0) return

  if (def.group === 'engagement') {
    const earnedToday = await engagementKarmaToday(userId)
    const remaining = KARMA.dailyEngagementCap - earnedToday
    if (remaining <= 0) return
    await awardKarma(userId, Math.min(base, remaining), `engage:${event}`)
  } else {
    await awardKarma(userId, base, `value:${event}`)
  }
}

/** Cuánta reputación ya se acreditó al ledger (filas reason='seed:reputation'). */
async function reputationCredited(userId: string): Promise<number> {
  const sb = karmaDb()
  const { data, error } = await sb
    .from('karma_ledger')
    .select('delta')
    .eq('user_id', userId)
    .eq('reason', 'seed:reputation')
  if (error || !Array.isArray(data)) return 0
  return (data as Array<{ delta: number }>).reduce((a, r) => a + r.delta, 0)
}

/**
 * Unifica el karma-REPUTACIÓN (derivado: hacienda/marcas/antigüedad) dentro del
 * saldo del ledger. Hace TOP-UP: si la reputación actual supera lo ya acreditado,
 * agrega la diferencia (la reputación no baja, así que solo sube). Devuelve el
 * saldo de coins y cuánto de él es reputación (el resto es actividad in-app − gastos).
 * Idempotente en la práctica: si no creció, no acredita nada.
 */
export async function syncReputationAndBalance(
  userId: string,
  reputationScore: number,
): Promise<{ coins: number; reputation: number }> {
  const credited = await reputationCredited(userId)
  const target = Math.max(0, Math.floor(reputationScore))
  let reputation = credited
  if (target > credited) {
    await awardKarma(userId, target - credited, 'seed:reputation')
    reputation = target
  }
  const coins = await getKarmaBalance(userId)
  return { coins, reputation }
}

/** Desbloquea una función gastando su costo del catálogo. null si no alcanza. */
export async function unlockWithKarma(
  userId: string,
  unlock: KarmaUnlock,
  refId?: string,
): Promise<number | null> {
  return spendKarma(userId, KARMA.unlockCost[unlock], `spend:${unlock}`, refId)
}
