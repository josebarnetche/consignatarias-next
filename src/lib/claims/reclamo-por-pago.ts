/**
 * reclamo-por-pago.ts — que quien paga PRO llegue a su panel.
 *
 * POR QUÉ EXISTE (revisión del 17-10-2026)
 * El checkout de PRO Consignataria pide sólo un mail (/consignatarias/<firma>/activar):
 * no exige haber reclamado la ficha. Al cobrar, la firma pasaba a PRO —sello, primer
 * lugar— pero nadie podía abrir el panel: el panel se abre por `claimed_by_email`, y
 * los leads con contacto, el cruce del Mercado y "quién te mira" viven ahí. Pagaba y
 * no veía la mitad de lo que compró.
 *
 * Lo que NO hace: dar la ficha a quien pagó. Pagar no prueba ser la firma (cualquiera
 * puede pagarle PRO a cualquiera). Deja un reclamo PENDIENTE a nombre de ese mail, que
 * sigue el camino de siempre: se auto-aprueba al entrar al panel si el mail coincide
 * con el registrado o con el dominio propio (`intentarAutoAprobar`), y si no, lo
 * aprueba una persona desde /admin/claims con el método de verificación.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizarEmail } from './aprobar'
import { getProfile } from '@/lib/data/consignataria-slugs'

export type ResultadoReclamoPago = 'ya_es_dueno' | 'otro_dueno' | 'ya_pendiente' | 'creado' | 'error'

export async function asegurarReclamoPorPago(
  db: SupabaseClient,
  slug: string,
  emailPago: string | null | undefined,
): Promise<ResultadoReclamoPago> {
  const email = normalizarEmail(emailPago)
  if (!email) return 'error'

  const { data: firma } = await db
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .maybeSingle()
  const dueno = normalizarEmail((firma as { claimed_by_email?: string | null } | null)?.claimed_by_email)
  if (dueno === email) return 'ya_es_dueno'
  // La ficha ya tiene titular: el pago no lo cambia. El titular ve su PRO igual.
  if (dueno) return 'otro_dueno'

  const { data: pendiente } = await db
    .from('consignataria_claims')
    .select('id')
    .eq('consignataria_slug', slug)
    .eq('claimant_email', email)
    .eq('status', 'pending')
    .limit(1)
  if (pendiente && pendiente.length > 0) return 'ya_pendiente'

  // La fila de la firma puede no existir todavía (ficha que nunca se editó): la misma
  // siembra que hace /api/claims.
  if (!firma) {
    const { error: seedError } = await db
      .from('consignatarias')
      .upsert({ canonical_slug: slug, display_name: getProfile(slug)?.displayName ?? slug }, { onConflict: 'canonical_slug', ignoreDuplicates: true })
    if (seedError) return 'error'
  }

  const { error } = await db.from('consignataria_claims').insert({
    consignataria_slug: slug,
    claimant_email: email,
    claimant_role: 'Pagó PRO Consignataria',
    status: 'pending',
  })
  return error ? 'error' : 'creado'
}
