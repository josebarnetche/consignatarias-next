/**
 * Precio de El Corredor Semanal — anclado en DÓLARES, cobrado en pesos.
 *
 * POR QUÉ EL ANCLA ES EL DÓLAR Y NO EL PESO. El resto del catálogo fija pesos y
 * cotiza el dólar (`proArsMensual` → `cotizarProUsdCents`). Acá es al revés, y es
 * deliberado: el precio se fijó como la mitad del de Faxcarne, que cobra en
 * dólares, y la decisión fue que **cueste lo mismo acá que afuera**. Si el ancla
 * fuera el peso, el suscriptor del exterior pagaría distinto cada mes según se
 * moviera el tipo de cambio, y el argentino vería subir el precio en dólares sin
 * que nadie lo haya aumentado.
 *
 * ⚠️ Esto significa que **el número en pesos sube cuando sube el dólar**. Es el
 * comportamiento buscado, no un error: es el mismo criterio con el que se pacta
 * un arrendamiento en kilos de novillo. El importe en pesos se calcula al blue
 * del scrape diario, igual que el PRO, así que la página y el checkout cobran
 * exactamente lo mismo que muestran.
 *
 * El ancla competitiva: Faxcarne cobra US$ 680 al año y US$ 66 al mes. Esto es
 * la mitad. La banda argentina de informes de mercado va de ARS 232.000
 * (Informe Ganadero, quincenal) a ARS 450.000 (Márgenes Agropecuarios, mensual);
 * a un blue de ~1.550 este precio queda por encima de esa banda, y es una
 * decisión tomada a conciencia: el producto se compara contra Faxcarne, no
 * contra una revista mensual.
 */

import marketPrices from '@/lib/data/market-prices.json'

const mp = marketPrices as unknown as { usdBlue: { current: number }; lastUpdate?: string }

/** US$ por año. La mitad de los US$ 680 de Faxcarne. */
export const CORREDOR_SEMANAL_USD_ANUAL = 340
/** US$ por mes. La mitad de los US$ 66 de Faxcarne. */
export const CORREDOR_SEMANAL_USD_MENSUAL = 33

export type PeriodoCorredor = 'mensual' | 'anual'

export interface PrecioCorredor {
  periodo: PeriodoCorredor
  usd: number
  ars: number
  /** El blue con el que se convirtió, para poder mostrarlo y auditarlo. */
  blue: number
  fechaBlue: string | null
  /** Lo que se ahorra pagando el año de una, contra doce meses sueltos. */
  ahorroPct: number | null
}

/**
 * Redondeo comercial: a mil pesos el mensual, a diez mil el anual.
 *
 * Un precio de ARS 51.150 se lee como un número calculado por una máquina y
 * invita a discutirlo. ARS 51.000 se lee como un precio.
 */
function redondearComercial(ars: number, periodo: PeriodoCorredor): number {
  const paso = periodo === 'anual' ? 10_000 : 1_000
  return Math.round(ars / paso) * paso
}

export function precioCorredorSemanal(periodo: PeriodoCorredor): PrecioCorredor {
  const blue = mp.usdBlue?.current
  const usd = periodo === 'anual' ? CORREDOR_SEMANAL_USD_ANUAL : CORREDOR_SEMANAL_USD_MENSUAL
  if (!blue || blue <= 0) {
    // Sin cotización no se inventa un precio en pesos: se devuelve el dólar y
    // quien llama decide. Cobrar un importe calculado con un tipo de cambio que
    // no existe es peor que no mostrar el precio.
    return { periodo, usd, ars: 0, blue: 0, fechaBlue: null, ahorroPct: null }
  }
  const ars = redondearComercial(usd * blue, periodo)
  const ahorroPct =
    periodo === 'anual'
      ? Number(((1 - CORREDOR_SEMANAL_USD_ANUAL / (CORREDOR_SEMANAL_USD_MENSUAL * 12)) * 100).toFixed(0))
      : null
  return { periodo, usd, ars, blue, fechaBlue: mp.lastUpdate ?? null, ahorroPct }
}

/** "US$ 340 al año (ARS 527.000 al blue de hoy)". La forma en que se comunica. */
export function textoPrecio(periodo: PeriodoCorredor): string {
  const p = precioCorredorSemanal(periodo)
  const unidad = periodo === 'anual' ? 'al año' : 'por mes'
  if (!p.ars) return `US$ ${p.usd} ${unidad}`
  return `US$ ${p.usd} ${unidad} — ARS ${p.ars.toLocaleString('es-AR')} al dólar de hoy`
}
