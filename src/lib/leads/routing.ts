/**
 * routing.ts — Motor de ruteo y economía de un producer_lead.
 *
 * Dos trabajos:
 *  1) matchConsignatarias(): dado un lead (provincia), devuelve las firmas
 *     candidatas ordenadas por prioridad — featured (partner PRO) primero, luego
 *     las que tienen contacto cargado, luego el resto de la zona. El registro de
 *     consignatarias guarda la provincia en mayúsculas y a veces con acentos/case
 *     mezclado, así que normalizamos ambos lados antes de comparar.
 *  2) estimateOperation(): valor potencial de la operación (cabezas × peso ref ×
 *     INMAG) y el fee del 1% que cobramos AL CIERRE. Es un potencial para priorizar
 *     qué lead perseguir, no una factura.
 *
 * Nota de realidad: la mayoría de las firmas no tiene teléfono/WhatsApp en la DB.
 * El ruteo fino lo opera Jose con los teléfonos del backoffice; este motor le da
 * los candidatos ordenados y el ops-alert se los sirve listos para WhatsApp.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import marketPrices from '@/lib/data/market-prices.json'

export const DEFAULT_FEE_PCT = 1.0

/** Normaliza provincia/localidad para comparar: sin acentos, upper, sin dobles espacios. */
export function normalizeGeo(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Peso vivo de referencia por categoría (kg) para estimar el valor de la operación. */
const REF_WEIGHT_KG: Record<string, number> = {
  novillos: 430,
  novillitos: 350,
  vaquillonas: 330,
  vacas: 420,
  toros: 650,
  terneros: 190,
  invernada: 220,
  cria: 190,
}
const DEFAULT_WEIGHT_KG = 400

function inmagPrice(): number {
  const v = (marketPrices as { inmag?: { current?: number } }).inmag?.current
  return typeof v === 'number' && v > 0 ? v : 4300
}

export interface OperationEstimate {
  /** Valor potencial de la operación en ARS (null si no hay cabezas para estimar). */
  estimatedValueArs: number | null
  /** Fee potencial (1% del valor) en ARS. */
  feeArs: number | null
  feePct: number
}

/**
 * Valor potencial de la operación y fee. Si no hay cabezas (p.ej. arrendar/tasar),
 * devuelve null en valor — el lead igual vale, sólo que no se prioriza por monto.
 */
export function estimateOperation(opts: {
  headCount?: number | null
  category?: string | null
  feePct?: number
}): OperationEstimate {
  const feePct = opts.feePct ?? DEFAULT_FEE_PCT
  const heads = typeof opts.headCount === 'number' && opts.headCount > 0 ? opts.headCount : null
  if (!heads) return { estimatedValueArs: null, feeArs: null, feePct }
  const weight = REF_WEIGHT_KG[(opts.category || '').toLowerCase()] ?? DEFAULT_WEIGHT_KG
  const estimatedValueArs = Math.round(heads * weight * inmagPrice())
  const feeArs = Math.round((estimatedValueArs * feePct) / 100)
  return { estimatedValueArs, feeArs, feePct }
}

export interface MatchedFirm {
  slug: string
  displayName: string
  province: string | null
  location: string | null
  phone: string | null
  whatsapp: string | null
  featured: boolean
  verified: boolean
  /** true si tiene teléfono o WhatsApp cargado en la DB. */
  contactable: boolean
}

/**
 * Firmas candidatas para un lead, ordenadas por prioridad de ruteo.
 * Orden: featured (partner) → contactable → verified → resto de la zona.
 */
export async function matchConsignatarias(
  db: SupabaseClient,
  opts: { province?: string | null; limit?: number },
): Promise<MatchedFirm[]> {
  const targetProv = normalizeGeo(opts.province)
  const limit = opts.limit ?? 5

  // Traemos las firmas con datos de contacto/ubicación. Filtrar por provincia en JS
  // porque en la DB viene en distintos casings ("BUENOS AIRES" vs "Corrientes").
  const { data } = await db
    .from('consignatarias')
    .select('canonical_slug, display_name, province, location, region_operativa, phone, whatsapp, featured, verified')
    .limit(1000)

  const rows = (data || []) as Array<{
    canonical_slug: string
    display_name: string
    province: string | null
    location: string | null
    region_operativa: string | null
    phone: string | null
    whatsapp: string | null
    featured: boolean | null
    verified: boolean | null
  }>

  const inZone = targetProv
    ? rows.filter(
        (r) =>
          normalizeGeo(r.province) === targetProv ||
          normalizeGeo(r.region_operativa).includes(targetProv) ||
          normalizeGeo(r.location).includes(targetProv),
      )
    : rows

  const mapped: MatchedFirm[] = inZone.map((r) => ({
    slug: r.canonical_slug,
    displayName: r.display_name,
    province: r.province,
    location: r.location,
    phone: r.phone,
    whatsapp: r.whatsapp,
    featured: !!r.featured,
    verified: !!r.verified,
    contactable: !!(r.phone || r.whatsapp),
  }))

  const score = (f: MatchedFirm) =>
    (f.featured ? 100 : 0) + (f.contactable ? 20 : 0) + (f.verified ? 5 : 0)

  return mapped.sort((a, b) => score(b) - score(a)).slice(0, limit)
}

/** wa.me link con mensaje pre-armado (sólo dígitos en el número). */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  // Asume AR si no trae país (los números del backoffice suelen venir locales).
  const withCountry = digits.startsWith('54') ? digits : `54${digits}`
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`
}
