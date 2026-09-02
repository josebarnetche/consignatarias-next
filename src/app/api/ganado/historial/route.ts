import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import marketPrices from '@/lib/data/market-prices.json'
import {
  ratiosContraInmag,
  valuarHistorico,
  type LoteItem,
} from '@/lib/ganado-historial'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ganado/historial — la evolución del rodeo que el usuario tiene HOY.
 *
 * No devuelve los snapshots guardados: los recalcula contra la serie de precios. Ver el
 * porqué en `lib/ganado-historial.ts` — resumido, los snapshots sólo existen si el usuario
 * visitó la página, y si cambió de rodeo la serie mezcla "cuánto tenía" con "cuánto valía"
 * y muestra caídas del 93 % que nunca ocurrieron.
 *
 * Es de sólo lectura y depende únicamente del lote propio, así que alcanza con la sesión.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { data: fila, error } = await supabase
    .from('user_ganado')
    .select('items')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 })

  // `items` es jsonb: se valida en vez de castear a ciegas. Una fila corrupta no debe
  // tumbar el gráfico entero ni valuar con NaN.
  const crudo = fila?.items
  const lote: LoteItem[] = Array.isArray(crudo)
    ? (crudo as unknown[]).flatMap((x) => {
        if (!x || typeof x !== 'object') return []
        const o = x as Record<string, unknown>
        const cabezas = Number(o.cabezas)
        const peso = Number(o.peso)
        if (!Number.isFinite(cabezas) || !Number.isFinite(peso)) return []
        return [{ categoria: String(o.categoria ?? ''), cabezas, peso }]
      })
    : []

  if (lote.length === 0) {
    return NextResponse.json({ serie: [], lote: 0 })
  }

  const service = requireServiceClient()

  // La serie completa: PostgREST capea en 1.000 filas y hay 1.731 ruedas desde 2015, así
  // que sin paginar la curva de "2 años" saldría cortada y sin que nadie lo note.
  const PAGE = 1000
  const inmag: Array<{ date: string; value: number }> = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await service
      .from('mag_inmag_history')
      .select('date, inmag_value')
      .not('inmag_value', 'is', null)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    inmag.push(...data.map((r) => ({ date: r.date as string, value: Number(r.inmag_value) })))
    if (data.length < PAGE) break
  }

  const blue: Array<{ date: string; venta: number }> = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await service
      .from('usd_blue_history')
      .select('date, venta')
      .not('venta', 'is', null)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    blue.push(...data.map((r) => ({ date: r.date as string, venta: Number(r.venta) })))
    if (data.length < PAGE) break
  }

  const ratios = ratiosContraInmag(
    marketPrices.categories as Record<string, { current: number }>,
    marketPrices.inmag.current,
  )
  const serie = valuarHistorico({ lote, inmag, blue, ratios })

  return NextResponse.json(
    {
      serie,
      lote: lote.length,
      // La página lo muestra como nota al pie: es un proxy y se dice.
      metodo:
        'Tu rodeo actual valuado al INMAG de cada fecha, manteniendo la relación de hoy entre categorías.',
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  )
}
