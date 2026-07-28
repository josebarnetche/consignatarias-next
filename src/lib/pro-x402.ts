/**
 * PRO Consignataria pagado con USDC vía x402 — camino cripto del mismo producto
 * que vende Rebill en ARS (45.000/mes, env REBILL_CONSIGNATARIA_PRO_AMOUNT).
 * La cotización en centavos de USD sale del dólar blue del scrape diario, así el
 * monto del 402 es estable dentro del día (si cambiara entre quote y pago, el
 * facilitator rechaza por monto exacto y el agente re-cotiza).
 *
 * La activación replica EXACTO el grant del webhook de Rebill (Branch 2):
 * upsert subscriptions(active, +30d/mes) + consignatarias.featured + revalidate
 * del perfil y /go. Diferencias: preserva rebill_*_id si la firma ya tenía
 * suscripción Rebill (no la pisa con null) y EXTIENDE desde el fin de período
 * vigente si lo hay.
 */
import { revalidatePath } from 'next/cache'
import { requireServiceClient } from '@/lib/supabase'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import marketPrices from '@/lib/data/market-prices.json'

const mp = marketPrices as unknown as { usdBlue: { current: number } }

export function proArsMensual(): number {
  return parseInt(process.env.REBILL_CONSIGNATARIA_PRO_AMOUNT || '45000', 10)
}

export function proMeses(raw: unknown): number {
  const n = Number(raw ?? 1)
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error('meses inválido (entero de 1 a 12).')
  return n
}

/** Cotización del PRO en centavos de USD (blue del día, redondeo hacia arriba). */
export function cotizarProUsdCents(meses: number): number {
  return Math.ceil((proArsMensual() * meses * 100) / mp.usdBlue.current)
}

export function validarSlugPro(raw: unknown): { canonical: string; nombre: string } | null {
  const slug = String(raw ?? '').trim()
  if (!slug) return null
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return null
  const profile = getProfile(canonical)
  if (!profile) return null
  return { canonical, nombre: profile.displayName || canonical }
}

export async function activarProX402(opts: {
  canonical: string
  meses: number
  payer: string
  transaction: string
}): Promise<{ hasta: string }> {
  const service = requireServiceClient()

  const { data: existing } = await service
    .from('subscriptions')
    .select('rebill_subscription_id, rebill_customer_id, current_period_end, status')
    .eq('entity_type', 'consignataria')
    .eq('entity_slug', opts.canonical)
    .maybeSingle()

  const now = Date.now()
  const vigenteHasta = existing?.current_period_end ? new Date(existing.current_period_end).getTime() : 0
  const desde = Math.max(now, vigenteHasta)
  const periodEnd = new Date(desde + opts.meses * 30 * 24 * 60 * 60 * 1000)

  const { error } = await service.from('subscriptions').upsert(
    {
      entity_type: 'consignataria',
      entity_slug: opts.canonical,
      plan_name: 'pro',
      rebill_subscription_id: existing?.rebill_subscription_id ?? null,
      rebill_customer_id: existing?.rebill_customer_id ?? null,
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,entity_slug' },
  )
  if (error) throw new Error(`No se pudo activar el PRO: ${error.message}`)

  await service.from('consignatarias').update({ featured: true }).eq('canonical_slug', opts.canonical)

  try {
    revalidatePath(`/consignatarias/${opts.canonical}`)
    revalidatePath(`/go/${opts.canonical}`)
  } catch (err) {
    console.error('revalidatePath PRO x402 failed:', err)
  }

  return { hasta: periodEnd.toISOString().slice(0, 10) }
}
