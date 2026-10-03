import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pulso del MAG de Cañuelas: el último día con lotes, agregado por consignatario, más el
 * acumulado histórico. Lo comparten `/api/market-pulse` y la página `/mercado/pulso`, que
 * lo calcula en el server para que los números estén en el HTML (`/api/` está bloqueado en
 * robots: si el dato solo llega por fetch, buscadores e IAs ven el panel vacío).
 */
export interface PulsoFirma {
  name: string
  cabezas: number
}

export interface PulsoMercado {
  date: string | null
  total_cabezas: number
  firms: PulsoFirma[]
  acumulado_lotes: number
}

export async function calcularPulsoMercado(db: SupabaseClient): Promise<PulsoMercado> {
  const { data: latest } = await db
    .from('mag_consignataria_sales_lots')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  const date: string | null = latest?.[0]?.date ?? null

  // Acumulado histórico total (progreso: "llevamos X cabezas registradas")
  const { count: totalLotes } = await db
    .from('mag_consignataria_sales_lots')
    .select('id', { count: 'exact', head: true })

  if (!date) {
    return { date: null, total_cabezas: 0, firms: [], acumulado_lotes: totalLotes ?? 0 }
  }

  const [{ data: lots }, { data: names }] = await Promise.all([
    db.from('mag_consignataria_sales_lots').select('mag_consignataria_id, head_count').eq('date', date).limit(50000),
    db.from('mag_consignatarias').select('mag_id, name'),
  ])
  const nameById = new Map((names || []).map((n: { mag_id: number; name: string }) => [n.mag_id, n.name]))

  const byFirm = new Map<number, number>()
  let total = 0
  for (const r of (lots || []) as Array<{ mag_consignataria_id: number; head_count: number | null }>) {
    const c = r.head_count || 0
    total += c
    byFirm.set(r.mag_consignataria_id, (byFirm.get(r.mag_consignataria_id) || 0) + c)
  }
  const firms = [...byFirm.entries()]
    .map(([id, cabezas]) => ({ name: nameById.get(id) || `firma #${id}`, cabezas }))
    .filter((f) => f.cabezas > 0)
    .sort((a, b) => b.cabezas - a.cabezas)
    .slice(0, 20)

  return { date, total_cabezas: total, firms, acumulado_lotes: totalLotes ?? 0 }
}
