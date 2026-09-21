import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Las dos series largas que usa la valuación del rodeo hacia atrás: el INMAG diario
 * (`mag_inmag_history`, 2015→hoy) y el dólar blue (`usd_blue_history`).
 *
 * Paginado obligatorio: PostgREST devuelve 1.000 filas por request y hay más de 2.000
 * ruedas de INMAG. Sin paginar, la curva de "2 años" sale cortada y nadie lo nota.
 */
const PAGE = 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

export async function traerSerieInmag(db: Db): Promise<Array<{ date: string; value: number }>> {
  const out: Array<{ date: string; value: number }> = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await db
      .from('mag_inmag_history')
      .select('date, inmag_value')
      .not('inmag_value', 'is', null)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    out.push(...(data as Array<{ date: string; inmag_value: number }>).map((r) => ({ date: r.date, value: Number(r.inmag_value) })))
    if (data.length < PAGE) break
  }
  return out
}

export async function traerSerieBlue(db: Db): Promise<Array<{ date: string; venta: number }>> {
  const out: Array<{ date: string; venta: number }> = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await db
      .from('usd_blue_history')
      .select('date, venta')
      .not('venta', 'is', null)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (!data?.length) break
    out.push(...(data as Array<{ date: string; venta: number }>).map((r) => ({ date: r.date, venta: Number(r.venta) })))
    if (data.length < PAGE) break
  }
  return out
}

/** `items` de `user_ganado` es jsonb: se valida fila por fila en vez de castear a ciegas. */
export function loteDesdeJson(crudo: unknown): Array<{ categoria: string; cabezas: number; peso: number }> {
  if (!Array.isArray(crudo)) return []
  return crudo.flatMap((x) => {
    if (!x || typeof x !== 'object') return []
    const o = x as Record<string, unknown>
    const cabezas = Number(o.cabezas)
    const peso = Number(o.peso)
    if (!Number.isFinite(cabezas) || !Number.isFinite(peso)) return []
    return [{ categoria: String(o.categoria ?? ''), cabezas, peso }]
  })
}
