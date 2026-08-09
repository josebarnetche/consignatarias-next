/**
 * VALUACIÓN DE CAMPOS — cuánto vale una hectárea, en dólares.
 *
 * Dos caminos que se cruzan, como en cualquier tasación seria:
 *
 *  1. POR RENTA. Un campo vale, a grandes rasgos, veinte años de su arrendamiento.
 *     El canon se pacta en kilos de novillo por hectárea por mes, así que ese
 *     número ya viene ajustado por la calidad del campo: nadie paga en Chubut lo
 *     que paga en Pergamino. Se anualiza, se pasa a dólares al novillo de hoy y se
 *     multiplica por los años de repago.
 *
 *  2. POR COMPARABLES. Relevamiento propio de precios de venta por provincia
 *     (`tierra-por-kilo.json`): mediana y rango p25-p75 de operaciones y avisos
 *     reales, con la productividad de la zona en kg/ha/año.
 *
 * El resultado que se muestra pondera los dos. Cuando difieren mucho, eso también
 * es información: un campo cuyo canon implica mucho más que el comparable de la
 * zona está caro de arrendar, o es mejor que el promedio de su provincia.
 *
 * Los años de repago NO son 20 fijos: salen del relevamiento por provincia
 * (`anos_repago` = usd_ha ÷ producción bruta anual en USD) y se traducen a años de
 * arrendamiento con la relación canon/producción. En la pampa húmeda dan ~20; en
 * la estepa patagónica, muchos más — porque ahí la tierra no se paga con pasto.
 */
import tierraRaw from '@/lib/data/tierra-por-kilo.json'
import marketPrices from '@/lib/data/market-prices.json'

const mp = marketPrices as unknown as {
  inmag: { current: number; series?: Array<{ date: string; value: number; volume: number }> }
  usdBlue: { current: number }
}

export interface ProvinciaTierra {
  provincia: string
  region: string
  n: number
  usd_ha: number
  p25: number
  p75: number
  kg_ha_ano: number
  usd_por_kg: number
  anos_repago: number
}

export const TIERRA: ProvinciaTierra[] = tierraRaw as ProvinciaTierra[]

/** El canon se liquida con el PROMEDIO DEL MES ANTERIOR, no con el precio de hoy. */
export function promedioMesAnterior(): { valor: number; etiqueta: string; ruedas: number } {
  const serie = mp.inmag.series ?? []
  const hoy = new Date()
  const y = hoy.getUTCMonth() === 0 ? hoy.getUTCFullYear() - 1 : hoy.getUTCFullYear()
  const m = hoy.getUTCMonth() === 0 ? 12 : hoy.getUTCMonth()
  const ym = `${y}-${String(m).padStart(2, '0')}`
  const delMes = serie.filter((p) => p.date.startsWith(ym))
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  if (delMes.length === 0) {
    return { valor: mp.inmag.current, etiqueta: 'último dato disponible', ruedas: 0 }
  }
  const prom = delMes.reduce((s, p) => s + p.value, 0) / delMes.length
  return { valor: prom, etiqueta: `promedio de ${MESES[m - 1]} ${y}`, ruedas: delMes.length }
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function tierraDe(provincia: string | null | undefined): ProvinciaTierra | null {
  if (!provincia) return null
  const p = normalizar(provincia)
  return (
    TIERRA.find((t) => normalizar(t.provincia) === p) ??
    TIERRA.find((t) => p.includes(normalizar(t.provincia)) || normalizar(t.provincia).includes(p)) ??
    null
  )
}

/**
 * Años de arrendamiento que equivalen al valor de la tierra en esa provincia.
 * Sale del relevamiento: los años de repago sobre producción bruta, llevados a
 * años de canon con la proporción típica canon/producción (~30%).
 */
const PROPORCION_CANON_SOBRE_PRODUCCION = 0.3
const ANOS_POR_DEFECTO = 20

export function anosDeArrendamiento(t: ProvinciaTierra | null): { anos: number; propio: boolean } {
  if (!t) return { anos: ANOS_POR_DEFECTO, propio: false }
  return { anos: Math.round(t.anos_repago / PROPORCION_CANON_SOBRE_PRODUCCION), propio: true }
}

export interface Valuacion {
  /** Lo que se muestra grande. */
  usdHa: number
  usdTotal: number
  /** Las dos vías, para el detalle. */
  porRenta: { usdHa: number; usdTotal: number; canonAnualUsdHa: number; anos: number } | null
  porComparables: { usdHa: number; p25: number; p75: number; n: number; region: string } | null
  /** Cuánto se apartan entre sí, en %. Alto = el campo se sale del promedio de su zona. */
  brecha: number | null
  confianza: 'alta' | 'media' | 'baja'
  novilloUsdKg: number
  provinciaEnBase: string | null
}

/**
 * Valúa un campo. Con canon usa las dos vías; sin canon, solo comparables.
 */
export function valuarCampo(opts: {
  hectareas: number
  provincia: string | null
  kgHaMes?: number | null
}): Valuacion {
  const { valor: novilloArs } = promedioMesAnterior()
  const novilloUsdKg = novilloArs / mp.usdBlue.current
  const t = tierraDe(opts.provincia)

  let porRenta: Valuacion['porRenta'] = null
  if (opts.kgHaMes && opts.kgHaMes > 0) {
    const { anos } = anosDeArrendamiento(t)
    const canonAnualUsdHa = opts.kgHaMes * 12 * novilloUsdKg
    const usdHa = canonAnualUsdHa * anos
    porRenta = { usdHa, usdTotal: usdHa * opts.hectareas, canonAnualUsdHa, anos }
  }

  const porComparables: Valuacion['porComparables'] = t
    ? { usdHa: t.usd_ha, p25: t.p25, p75: t.p75, n: t.n, region: t.region }
    : null

  // Ponderación: la renta manda cuando existe (es el campo concreto, no el promedio
  // provincial), pero el comparable la ancla para que no se dispare.
  let usdHa: number
  let confianza: Valuacion['confianza']
  if (porRenta && porComparables) {
    usdHa = porRenta.usdHa * 0.6 + porComparables.usdHa * 0.4
    confianza = porComparables.n >= 8 ? 'alta' : 'media'
  } else if (porRenta) {
    usdHa = porRenta.usdHa
    confianza = 'baja'
  } else if (porComparables) {
    usdHa = porComparables.usdHa
    confianza = porComparables.n >= 8 ? 'media' : 'baja'
  } else {
    usdHa = 0
    confianza = 'baja'
  }

  const brecha =
    porRenta && porComparables && porComparables.usdHa > 0
      ? ((porRenta.usdHa - porComparables.usdHa) / porComparables.usdHa) * 100
      : null

  return {
    usdHa,
    usdTotal: usdHa * opts.hectareas,
    porRenta,
    porComparables,
    brecha,
    confianza,
    novilloUsdKg,
    provinciaEnBase: t?.provincia ?? null,
  }
}

/** Canon mensual y anual en plata, liquidado con el promedio del mes anterior. */
export function canonEnPlata(hectareas: number, kgHaMes: number) {
  const { valor, etiqueta, ruedas } = promedioMesAnterior()
  const mensualArs = kgHaMes * hectareas * valor
  return {
    mensualArs,
    anualArs: mensualArs * 12,
    mensualUsd: mensualArs / mp.usdBlue.current,
    porHaMensualArs: kgHaMes * valor,
    referencia: valor,
    etiqueta,
    ruedas,
  }
}
