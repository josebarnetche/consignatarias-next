import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { computeKarma } from '@/lib/karma'
import { syncReputationAndBalance } from '@/lib/karma-ledger'

/**
 * Reputación del productor → insumos del karma. Centraliza las lecturas del DB
 * (hacienda cargada, marcas de remates, antigüedad, opt-ins) para que /api/me/karma
 * y el gasto de coins (/api/karma/unlock) computen y sincronicen la MISMA reputación.
 *
 * Server-only (usa service role).
 */

export interface ReputationInputs {
  cabezas: number
  attended: number
  following: number
  tenureMonths: number
  alertaSemanal: boolean
  newsletter: boolean
}

/** Lee del DB los insumos de reputación del usuario. */
export async function getReputationInputs(
  userId: string,
  email: string | null | undefined,
): Promise<ReputationInputs> {
  const admin = createAdminClient()

  let cabezas = 0
  let tenureMonths = 0
  let alertaSemanal = false
  const { data: ganado } = await admin
    .from('user_ganado')
    .select('items, created_at, alerts_opt_in')
    .eq('user_id', userId)
    .maybeSingle()
  if (ganado) {
    const items = (Array.isArray(ganado.items) ? ganado.items : []) as Array<{ cabezas?: number }>
    cabezas = items.reduce((s, it) => s + (Number(it.cabezas) || 0), 0)
    if (ganado.created_at) {
      tenureMonths =
        (Date.now() - new Date(ganado.created_at as string).getTime()) / (1000 * 60 * 60 * 24 * 30)
    }
    alertaSemanal = ganado.alerts_opt_in === true
  }

  let newsletter = false
  if (email) {
    const { data: nl } = await admin
      .from('newsletter_subscribers')
      .select('status')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    newsletter = nl?.status === 'active'
  }

  // remate_marks aún no está en los tipos → cliente sin tipar.
  let attended = 0
  let following = 0
  const { data: marks } = await (createAdminClient() as unknown as SupabaseClient)
    .from('remate_marks')
    .select('mark_type')
    .eq('user_id', userId)
  for (const m of (marks ?? []) as Array<{ mark_type: string }>) {
    if (m.mark_type === 'attended') attended++
    else if (m.mark_type === 'following') following++
  }

  return { cabezas, attended, following, tenureMonths, alertaSemanal, newsletter }
}

/**
 * Sincroniza la reputación del usuario al ledger (top-up) y devuelve el saldo de
 * coins. Llamalo antes de leer/gastar el saldo donde importe que esté completo
 * (p.ej. antes de un desbloqueo), para que la reputación cuente aunque el usuario
 * no haya pasado por /cuenta.
 */
export async function syncUserReputation(
  userId: string,
  email: string | null | undefined,
): Promise<{ coins: number; reputation: number }> {
  const inputs = await getReputationInputs(userId, email)
  const rep = computeKarma(inputs)
  return syncReputationAndBalance(userId, rep.score)
}
