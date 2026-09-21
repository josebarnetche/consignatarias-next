import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { valuarHistorico } from '@/lib/ganado-historial'
import { valuarRodeo, ratiosDesdeRodeo, inmagPromedio } from '@/lib/rodeo-vr'
import { traerSerieInmag, traerSerieBlue, loteDesdeJson } from '@/lib/series-mercado'

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

  // Una fila corrupta no debe tumbar el gráfico entero ni valuar con NaN.
  const lote = loteDesdeJson(fila?.items)
  if (lote.length === 0) {
    return NextResponse.json({ serie: [], lote: 0 })
  }

  const service = requireServiceClient()
  const [inmag, blue] = await Promise.all([traerSerieInmag(service), traerSerieBlue(service)])

  // El ancla es el Valor de Referencia del rodeo (banda observada por categoría y peso),
  // no `market-prices.json`: ese archivo alterna entre el precio observado y un ratio fijo
  // sobre el INMAG según haya habido rueda o no. Ver lib/rodeo-vr.ts.
  const rodeo = valuarRodeo(lote)
  const ancla = inmagPromedio(inmag, rodeo.ventana.desde, rodeo.ventana.hasta)
  const ratios = ancla ? ratiosDesdeRodeo(rodeo, ancla) : new Map<string, number>()
  const serie = valuarHistorico({ lote, inmag, blue, ratios })

  return NextResponse.json(
    {
      serie,
      lote: lote.length,
      // La página lo muestra como nota al pie: es un proxy y se dice.
      metodo:
        'Tu rodeo actual, anclado a su Valor de Referencia de hoy y movido con el INMAG de cada fecha. Los lotes sin referencia observada no entran en la curva.',
      sin_valuar_cabezas: rodeo.sinValuar.cabezas,
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  )
}
