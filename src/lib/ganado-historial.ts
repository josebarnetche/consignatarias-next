/**
 * La evolución del rodeo que TENÉS HOY, hacia atrás en el tiempo.
 *
 * EL PROBLEMA CON LOS SNAPSHOTS
 * `ganado_value_snapshots` guarda cuánto valía la cartera el día que el usuario entró a
 * la página. Eso tiene dos defectos que se ven apenas se usa:
 *
 *  1. **La serie sólo existe si visitás.** Seis usuarios acumularon 19 puntos en meses —
 *     unos tres cada uno. El gráfico salta de mayo a septiembre y dibuja una recta que no
 *     pasó.
 *  2. **Si cambiás el lote, la serie miente.** Un usuario que tenía 40 novillos en mayo y
 *     hoy tiene 6 terneros ve "−93,1 %", como si el mercado se hubiera derrumbado. No se
 *     derrumbó: cambió el rodeo. La serie mezcla dos cosas distintas —cuánto tenías y
 *     cuánto valía— y las presenta como una.
 *
 * LO QUE HACE ESTO
 * Toma el rodeo actual y lo valúa contra la serie de precios de cada fecha. Responde la
 * pregunta que el ganadero realmente tiene —"lo que tengo hoy, ¿cuánto valía hace un
 * año?"— y funciona desde el primer día, sin esperar a juntar visitas.
 *
 * EL PROXY, DECLARADO
 * Tenemos el INMAG diario desde 2015 (1.731 ruedas) pero los precios POR CATEGORÍA sólo
 * desde mayo de 2026. Para ir más atrás se usa el INMAG como base y se mantiene la
 * relación de hoy entre cada categoría y el índice: si el ternero está hoy a 1,15 veces
 * el INMAG, se asume esa relación hacia atrás. Es un proxy y la página lo dice — la
 * relación entre categorías cambia con el ciclo, así que la curva muestra la tendencia
 * del mercado sobre tu composición, no una reconstrucción exacta de precios.
 */

export interface LoteItem {
  categoria: string
  cabezas: number
  peso: number
}

export interface PuntoHistorial {
  fecha: string
  /** Valor del rodeo actual a los precios de esa fecha, en pesos. */
  ars: number
  /** El mismo valor en dólares, al blue de esa fecha. */
  usd: number | null
}

export type Rango = '30d' | '90d' | '1a' | '2a' | 'todo'

export const RANGOS: Array<{ id: Rango; label: string; dias: number | null }> = [
  { id: '30d', label: '30 días', dias: 30 },
  { id: '90d', label: '90 días', dias: 90 },
  { id: '1a', label: '1 año', dias: 365 },
  { id: '2a', label: '2 años', dias: 730 },
  { id: 'todo', label: 'Todo', dias: null },
]

/**
 * Cuántos kilos tiene el rodeo en cada categoría. Es lo único del lote que importa para
 * valuarlo: cabezas × peso.
 */
export function kilosPorCategoria(lote: LoteItem[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of lote) {
    const kilos = (it.cabezas || 0) * (it.peso || 0)
    if (kilos <= 0) continue
    m.set(it.categoria, (m.get(it.categoria) ?? 0) + kilos)
  }
  return m
}

/**
 * La relación de hoy entre el precio de cada categoría y el INMAG.
 *
 * Es lo que permite proyectar hacia atrás: el INMAG lo tenemos desde 2015, los precios por
 * categoría no. Una categoría sin precio publicado cae a 1 (vale el índice).
 */
export function ratiosContraInmag(
  precios: Record<string, { current: number }>,
  inmagHoy: number,
): Map<string, number> {
  const m = new Map<string, number>()
  if (!(inmagHoy > 0)) return m
  for (const [cat, p] of Object.entries(precios)) {
    if (p?.current > 0) m.set(cat, p.current / inmagHoy)
  }
  return m
}

/**
 * Valúa el rodeo actual contra la serie de INMAG.
 *
 * `blue` mapea fecha → dólar; si falta la del día se usa la última conocida (forward-fill),
 * que es la misma regla que el resto del sitio.
 */
export function valuarHistorico(opts: {
  lote: LoteItem[]
  inmag: Array<{ date: string; value: number }>
  blue: Array<{ date: string; venta: number }>
  ratios: Map<string, number>
}): PuntoHistorial[] {
  const { lote, inmag, blue, ratios } = opts
  const kilos = kilosPorCategoria(lote)
  if (kilos.size === 0 || inmag.length === 0) return []

  // Kilos "equivalentes INMAG": aplicar el ratio de cada categoría una sola vez y sumar.
  // Después, el valor de cualquier fecha es una multiplicación.
  let kilosEquivalentes = 0
  for (const [cat, k] of kilos) kilosEquivalentes += k * (ratios.get(cat) ?? 1)

  const serieBlue = [...blue].sort((a, b) => a.date.localeCompare(b.date))
  let bi = 0

  return inmag
    .filter((d) => d.value > 0)
    .map((d) => {
      while (bi + 1 < serieBlue.length && serieBlue[bi + 1].date <= d.date) bi++
      const usdDia = serieBlue.length && serieBlue[bi].date <= d.date ? serieBlue[bi].venta : null
      const ars = kilosEquivalentes * d.value
      return {
        fecha: d.date,
        ars,
        usd: usdDia && usdDia > 0 ? ars / usdDia : null,
      }
    })
}

/** Recorta la serie al rango pedido. */
export function recortar(serie: PuntoHistorial[], rango: Rango): PuntoHistorial[] {
  const def = RANGOS.find((r) => r.id === rango)
  if (!def?.dias || serie.length === 0) return serie
  const corte = new Date(Date.parse(`${serie[serie.length - 1].fecha}T00:00:00Z`) - def.dias * 86_400_000)
    .toISOString()
    .slice(0, 10)
  return serie.filter((p) => p.fecha >= corte)
}

export interface ResumenHistorial {
  desde: PuntoHistorial
  hasta: PuntoHistorial
  cambioArs: number
  cambioPctArs: number
  cambioPctUsd: number | null
  /** El punto más alto y el más bajo del rango, que es lo que se mira después del total. */
  max: PuntoHistorial
  min: PuntoHistorial
}

export function resumir(serie: PuntoHistorial[]): ResumenHistorial | null {
  if (serie.length < 2) return null
  const desde = serie[0]
  const hasta = serie[serie.length - 1]
  const cambioArs = hasta.ars - desde.ars
  const cambioPctArs = desde.ars > 0 ? (cambioArs / desde.ars) * 100 : 0
  const cambioPctUsd =
    desde.usd && hasta.usd && desde.usd > 0 ? ((hasta.usd - desde.usd) / desde.usd) * 100 : null

  let max = serie[0]
  let min = serie[0]
  for (const p of serie) {
    if (p.ars > max.ars) max = p
    if (p.ars < min.ars) min = p
  }
  return { desde, hasta, cambioArs, cambioPctArs, cambioPctUsd, max, min }
}
