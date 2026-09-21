/**
 * El rodeo del productor valuado contra el Valor de Referencia.
 *
 * ── QUÉ CAMBIA RESPECTO DE LO QUE HABÍA ──────────────────────────────────────
 * Mi Ganado valuaba con `market-prices.json → categories[x].current`. Medido el 21-sep
 * sobre la historia del archivo: ese número **alterna entre dos fuentes según el día**.
 * Los días de rueda es el promedio observado del MAG; los demás días el scraper no
 * encuentra ruedas y lo reescribe con un ratio fijo sobre el INMAG (novillito ×0,95,
 * vaquillona ×0,90, vaca ×0,72, toro ×0,65, ternero ×1,10). El 19-sep el novillito valía
 * 4.331 $/kg (observado) y el 20-sep 3.780 (ratio): el rodeo de un usuario "caía" 13 % de
 * un día para el otro sin que el mercado se moviera. Y el ternero es SIEMPRE un ratio:
 * el MAG no opera terneros.
 *
 * Acá cada lote se valúa con la banda observada de su categoría y su rango de peso
 * (`getReferenciaPorPeso`), en tres puntas: conservador (P10), central (mediana) y
 * optimista (P90). Un lote sin referencia observada queda SIN VALUAR y se dice cuántas
 * cabezas son: no se completa con un ratio, ni con el INMAG, ni con cero.
 */
import { getReferenciaPorPeso, vrVentana, VR_METODOLOGIA, type VrReferenciaPeso } from '@/lib/vr'

export interface LoteRodeo {
  categoria: string
  cabezas: number
  peso: number
}

export interface LoteValuado extends LoteRodeo {
  kilos: number
  ref: VrReferenciaPeso
  /** null cuando el lote no tiene referencia observada. */
  conservador: number | null
  central: number | null
  optimista: number | null
}

export interface RodeoValuado {
  lotes: LoteValuado[]
  /** Lo que sí se valuó. */
  valuado: { cabezas: number; kilos: number }
  /** Lo que quedó afuera por no tener referencia observada. */
  sinValuar: { cabezas: number; kilos: number; categorias: string[] }
  /** null si ningún lote tiene referencia. */
  total: { conservador: number; central: number; optimista: number } | null
  fecha_dato: string
  ventana: { desde: string; hasta: string }
  metodologia: string
}

/** Filas inválidas (cabezas o peso ≤ 0, NaN) no se valúan ni se cuentan. */
function esValido(l: LoteRodeo): boolean {
  return Number.isFinite(l.cabezas) && Number.isFinite(l.peso) && l.cabezas > 0 && l.peso > 0
}

export function valuarRodeo(lotes: LoteRodeo[]): RodeoValuado {
  const valuados: LoteValuado[] = []
  const valuado = { cabezas: 0, kilos: 0 }
  const sinValuar = { cabezas: 0, kilos: 0, categorias: [] as string[] }
  const acc = { conservador: 0, central: 0, optimista: 0 }
  let hayValuados = false

  for (const l of lotes) {
    if (!esValido(l)) continue
    const kilos = l.cabezas * l.peso
    const ref = getReferenciaPorPeso(l.categoria, l.peso)
    if (!ref.banda) {
      valuados.push({ ...l, kilos, ref, conservador: null, central: null, optimista: null })
      sinValuar.cabezas += l.cabezas
      sinValuar.kilos += kilos
      if (!sinValuar.categorias.includes(l.categoria)) sinValuar.categorias.push(l.categoria)
      continue
    }
    const conservador = Math.round(ref.banda.p10 * kilos)
    const central = Math.round(ref.banda.mediana * kilos)
    const optimista = Math.round(ref.banda.p90 * kilos)
    valuados.push({ ...l, kilos, ref, conservador, central, optimista })
    valuado.cabezas += l.cabezas
    valuado.kilos += kilos
    acc.conservador += conservador
    acc.central += central
    acc.optimista += optimista
    hayValuados = true
  }

  const ventana = vrVentana()
  return {
    lotes: valuados,
    valuado,
    sinValuar,
    total: hayValuados ? acc : null,
    fecha_dato: ventana.hasta,
    ventana,
    metodologia: VR_METODOLOGIA,
  }
}

/**
 * Relación entre el precio de referencia de cada categoría DEL RODEO (ponderada por los
 * kilos de cada lote, con la banda de su peso) y el INMAG promedio de la misma ventana.
 *
 * Es lo que permite llevar la valuación hacia atrás con la serie del INMAG, que existe
 * desde 2015. El ancla es el promedio del INMAG en la ventana de la banda —no el INMAG
 * de un día— porque la banda también es de la ventana: comparar una mediana de 30 días
 * contra el índice de un solo día mezcla dos plazos distintos.
 *
 * Una categoría sin referencia observada NO tiene ratio, y `valuarHistorico` la deja
 * afuera (antes valía "el índice": era un número inventado).
 */
export function ratiosDesdeRodeo(rodeo: RodeoValuado, inmagAncla: number): Map<string, number> {
  const m = new Map<string, number>()
  if (!(inmagAncla > 0)) return m
  const porCat = new Map<string, { ars: number; kilos: number }>()
  for (const l of rodeo.lotes) {
    if (l.central == null) continue
    const acc = porCat.get(l.categoria) ?? { ars: 0, kilos: 0 }
    acc.ars += l.central
    acc.kilos += l.kilos
    porCat.set(l.categoria, acc)
  }
  for (const [cat, { ars, kilos }] of porCat) {
    if (kilos > 0) m.set(cat, ars / kilos / inmagAncla)
  }
  return m
}

/** Promedio del INMAG entre dos fechas (inclusive). null si no hay ruedas en el rango. */
export function inmagPromedio(
  serie: Array<{ date: string; value: number }>,
  desde: string,
  hasta: string,
): number | null {
  const vals = serie.filter((d) => d.date >= desde && d.date <= hasta && d.value > 0).map((d) => d.value)
  if (vals.length === 0) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}
