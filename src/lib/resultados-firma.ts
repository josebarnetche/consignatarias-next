import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getMergedAuctionsForConsignataria } from '@/lib/dal/auctions'
import { nombrePropio } from '@/lib/ui/tokens'
import type { RemateSugerido } from '@/app/(terminal)/dashboard/resultados/nuevo/ResultadoForm'

/**
 * Remates de los últimos 90 días de la firma que todavía no tienen resultado cargado
 * (18-10-2026). El formulario los ofrece en un desplegable: elegir uno completa fecha,
 * título y lugar, que es lo que más se tipea mal y lo que cruza el resultado con el
 * remate del calendario.
 */
export async function getRematesSinResultado(db: SupabaseClient, slug: string, nombre: string): Promise<RemateSugerido[]> {
  const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const scrapeados = getAuctionsForProfile(rematesData as unknown as Auction[], slug).filter((a) => a.firmaAuctionId == null)
  const [todos, { data: cargados }] = await Promise.all([
    getMergedAuctionsForConsignataria(db, slug, nombre, scrapeados),
    db.from('auction_results').select('auction_date').eq('consignataria_slug', slug).gte('auction_date', desde),
  ])
  const conResultado = new Set((cargados ?? []).map((r) => r.auction_date))
  return todos
    .filter((a) => a.date >= desde && a.date <= hoy && !conResultado.has(a.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({ date: a.date, title: a.title, location: nombrePropio(a.location) }))
}
