/**
 * Qué ES el precio del ternero que publicamos, en un solo lugar.
 *
 * El Mercado Agroganadero no opera terneros. Hasta la v1.26x el scraper lo calculaba
 * siempre como INMAG × 1,10 y unas 20 páginas lo decían a mano; el 20/11/2026 eso daba
 * 4.486 $/kg contra 6.389 de MAGyP (oct-2026), 29,8% abajo. Ahora el scraper
 * (scripts/ternero-magyp.mjs) trae la observación MENSUAL de MAGyP / Entre Surcos y
 * Corrales y deja el ratio solo de respaldo, rotulado. Toda superficie que muestre el
 * ternero toma de acá el rótulo: así nunca dice «estimado» de un dato observado ni
 * «observado» de un ratio.
 */
import marketPrices from '@/lib/data/market-prices.json'

export type EntradaTernero = {
  current: number
  source?: string
  observado?: boolean
  observedDate?: string | null
  metodo?: string | null
}

export interface TerneroDato {
  precio: number
  observado: boolean
  /** "AAAA-MM" de la observación (MAGyP es mensual); null si es estimado. */
  mes: string | null
  /** Fuente legible: "MAGyP (Entre Surcos y Corrales)" o "estimación propia". */
  fuente: string
  /** Cómo se calculó si es estimado ("INMAG × 1,10"); null si es observado. */
  metodo: string | null
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const FUENTE_MAGYP = 'MAGyP · Entre Surcos y Corrales (mensual)'

export function terneroDato(e: EntradaTernero = (marketPrices as { categories: { terneros: EntradaTernero } }).categories.terneros): TerneroDato {
  const observado = e.observado === true || e.source === FUENTE_MAGYP
  const mes = observado && typeof e.observedDate === 'string' && /^\d{4}-\d{2}$/.test(e.observedDate) ? e.observedDate : null
  return {
    precio: Math.round(e.current),
    observado,
    mes,
    fuente: observado ? 'MAGyP (Entre Surcos y Corrales)' : 'estimación propia',
    metodo: observado ? null : e.metodo || 'INMAG × 1,10',
  }
}

/** "octubre de 2026". */
export function mesLargo(mes: string | null): string {
  if (!mes) return ''
  const [y, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} de ${y}`
}

/** Rótulo corto para poner al lado del número: "(MAGyP, octubre de 2026)" o "(estimado)". */
export function terneroCalificador(d: TerneroDato = terneroDato()): string {
  return d.observado ? `(MAGyP, ${mesLargo(d.mes)})` : '(estimado)'
}

/** Una línea de procedencia, para debajo del número o en un title. */
export function terneroNota(d: TerneroDato = terneroDato()): string {
  return d.observado
    ? `Precio observado: promedio mensual de ${mesLargo(d.mes)} de MAGyP (Entre Surcos y Corrales), ternero de 160-180 kg. El Mercado Agroganadero no opera terneros; el precio de cada lote lo marcan los remates de invernada.`
    : `Estimado: ${d.metodo}. El Mercado Agroganadero no opera terneros; no es un precio observado.`
}

/** Frase de atribución para citas y FAQ ("según MAGyP…" / "estimación propia…"). */
export function terneroFuenteFrase(d: TerneroDato = terneroDato()): string {
  return d.observado
    ? `según MAGyP (Entre Surcos y Corrales), promedio de ${mesLargo(d.mes)}`
    : `estimación propia sobre el INMAG (${d.metodo}), no un precio observado`
}

/**
 * Cuándo vale el número: "último dato, octubre de 2026" si es la observación mensual de
 * MAGyP (no es «de hoy»), o "hoy, {fechaDiaria}" si es la estimación diaria sobre el INMAG.
 */
export function terneroCuando(fechaDiaria: string, d: TerneroDato = terneroDato()): string {
  return d.observado ? `último dato, ${mesLargo(d.mes)}` : `hoy, ${fechaDiaria}`
}

/**
 * El número dentro de una oración: "el último dato, según MAGyP (…), promedio de octubre de
 * 2026, es $6.389/kg" o "nuestra estimación de hoy es $4.486/kg (INMAG × 1,10, 2026-11-20)".
 * `precio` viene ya formateado ("$6.389/kg").
 */
export function terneroValorFrase(precio: string, fechaDiaria: string, d: TerneroDato = terneroDato()): string {
  return d.observado
    ? `el último dato, ${terneroFuenteFrase(d)}, es ${precio}`
    : `nuestra estimación de hoy es ${precio} (${d.metodo}, ${fechaDiaria})`
}
