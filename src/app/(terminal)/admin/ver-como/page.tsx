import type { Metadata } from 'next'
import { requireServiceClient } from '@/lib/supabase'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { getFeaturedSlugs } from '@/lib/featured'
import VerComoClient, { type FirmaFila } from './VerComoClient'

export const metadata: Metadata = { title: 'Firmas: ver como y alta', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Firmas — dos herramientas del admin para vender y dar de alta PRO (17-10-2026):
 *  · VER COMO: abre el panel de cualquier firma como lo vería su dueño, con PRO,
 *    sin PRO o con su plan real (/dashboard?como=…). Sólo lectura.
 *  · ALTA: le asigna la ficha a un mail y le manda el acceso, para la firma que
 *    aceptó por teléfono y no va a completar el formulario de reclamo.
 * El gate de admin lo pone el layout de /admin.
 */
export default async function VerComoPage() {
  const db = requireServiceClient()
  const [{ data: filas }, pro] = await Promise.all([
    db.from('consignatarias').select('canonical_slug, claimed_by_email'),
    getFeaturedSlugs(),
  ])
  const titular = new Map((filas ?? []).map((f) => [f.canonical_slug, f.claimed_by_email]))

  const firmas: FirmaFila[] = getAllProfiles()
    .map((p) => ({
      slug: p.canonicalSlug,
      nombre: p.displayName,
      titular: titular.get(p.canonicalSlug) ?? null,
      pro: pro.has(p.canonicalSlug),
    }))
    .sort((a, b) => Number(b.pro) - Number(a.pro) || Number(!!b.titular) - Number(!!a.titular) || a.nombre.localeCompare(b.nombre, 'es'))

  return <VerComoClient firmas={firmas} />
}
