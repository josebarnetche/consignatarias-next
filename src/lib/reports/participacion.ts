/**
 * participacion.ts — cuánto del Mercado mueve una casa, y si está creciendo.
 *
 * Es la tercera pregunta de una consignataria, después de "¿a quién llamo hoy?"
 * (cartera) y "¿vendí bien?" (benchmark): **¿estoy ganando o perdiendo terreno?**
 *
 * Su sistema le dice cuántas cabezas movió. No le dice cuántas movió el mercado, y
 * por lo tanto no le dice si un mes flojo fue de ella o de todos. Un mes con menos
 * cabezas donde el mercado cayó más es, en realidad, un mes bueno.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchLotesDesde, haceDias, magIdDeSlug, repararTexto } from './mag-lotes'

export interface Participacion {
  slug: string
  /** Cabezas propias en la ventana reciente. */
  cabezas: number
  /** Cabezas de TODO el Mercado en la misma ventana. */
  cabezasMercado: number
  /** Cuota en % sobre las cabezas del Mercado. */
  cuota: number
  /** Cuota del período anterior, de igual duración. */
  cuotaPrevia: number
  /** Puntos porcentuales de diferencia entre ambas. */
  deltaPuntos: number
  /** Puesto entre las casas activas, por cabezas. */
  puesto: number
  totalCasas: number
  /**
   * ¿El movimiento supera el ruido? Con cuotas chicas, un par de camiones mueven
   * la aguja; la banda se calcula sobre la propia cuota.
   */
  significativo: boolean
  leyenda: string
  /** Las casas que más mueven, para ubicarse. */
  ranking: Array<{ nombre: string; cabezas: number; cuota: number; esMia: boolean }>
}

/**
 * Cuota de mercado de una firma y su movimiento contra el período anterior.
 *
 * `dias` define la ventana reciente; el período previo es de la misma duración
 * inmediatamente anterior, para que la comparación sea pareja.
 */
export async function getParticipacion(
  db: SupabaseClient | null,
  slug: string,
  dias = 30,
): Promise<Participacion | null> {
  if (!db) return null
  try {
    const magId = await magIdDeSlug(db, slug)
    if (!magId) return null

    // Una sola lectura que cubre los dos períodos.
    const lotes = await fetchLotesDesde(db, haceDias(dias * 2))
    if (lotes.length === 0) return null

    const corte = haceDias(dias)
    const recientePorCasa = new Map<number, number>()
    const previoPorCasa = new Map<number, number>()
    let lotesRecientes = 0

    for (const l of lotes) {
      const cabezas = l.head_count ?? 0
      const esReciente = l.date >= corte
      const mapa = esReciente ? recientePorCasa : previoPorCasa
      mapa.set(l.mag_consignataria_id, (mapa.get(l.mag_consignataria_id) ?? 0) + cabezas)
      if (esReciente) lotesRecientes++
    }

    const cabezas = recientePorCasa.get(magId) ?? 0
    const cabezasMercado = [...recientePorCasa.values()].reduce((a, b) => a + b, 0)
    if (cabezasMercado === 0) return null

    const cabezasPrevias = previoPorCasa.get(magId) ?? 0
    const mercadoPrevio = [...previoPorCasa.values()].reduce((a, b) => a + b, 0)

    const cuota = (cabezas / cabezasMercado) * 100
    const cuotaPrevia = mercadoPrevio > 0 ? (cabezasPrevias / mercadoPrevio) * 100 : 0
    const deltaPuntos = cuota - cuotaPrevia

    // Banda de ruido de la cuota.
    //
    // La muestra son los LOTES, no las cabezas. Un lote es la unidad que se decide:
    // el productor elige una casa y le manda el camión entero, así que las cabezas de
    // un mismo lote no son observaciones independientes. Usando cabezas como n, el
    // denominador se infla ~7 veces y cualquier movimiento parece señal: UMC pasaba
    // de 1,0% a 0,9% —un camión— y salía "perdiste terreno".
    const n = Math.max(1, lotesRecientes)
    const p = cuota / 100
    const bandaPuntos = 2 * Math.sqrt((p * (1 - p)) / n) * 100
    const significativo = mercadoPrevio > 0 && Math.abs(deltaPuntos) > bandaPuntos

    const { data: casas } = await db.from('mag_consignatarias').select('mag_id, name')
    const nombres = new Map<number, string>(
      ((casas ?? []) as { mag_id: number; name: string }[]).map((c) => [c.mag_id, repararTexto(c.name)]),
    )

    const ranking = [...recientePorCasa.entries()]
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, c]) => ({
        nombre: nombres.get(id) ?? `Casa ${id}`,
        cabezas: c,
        cuota: Number(((c / cabezasMercado) * 100).toFixed(1)),
        esMia: id === magId,
      }))

    const puesto = ranking.findIndex((r) => r.esMia) + 1

    const leyenda = !significativo
      ? `Tu cuota se mantiene en ${cuota.toFixed(1)}% del Mercado. El movimiento contra el período anterior entra en la variación normal.`
      : deltaPuntos > 0
        ? `Ganaste terreno: pasaste de ${cuotaPrevia.toFixed(1)}% a ${cuota.toFixed(1)}% del Mercado.`
        : `Perdiste terreno: pasaste de ${cuotaPrevia.toFixed(1)}% a ${cuota.toFixed(1)}% del Mercado.`

    return {
      slug,
      cabezas,
      cabezasMercado,
      cuota: Number(cuota.toFixed(1)),
      cuotaPrevia: Number(cuotaPrevia.toFixed(1)),
      deltaPuntos: Number(deltaPuntos.toFixed(1)),
      puesto,
      totalCasas: ranking.length,
      significativo,
      leyenda,
      ranking: ranking.slice(0, 10),
    }
  } catch (e) {
    console.error('[participacion] falló:', e)
    return null
  }
}
