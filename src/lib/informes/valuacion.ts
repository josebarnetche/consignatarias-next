import {
  TIERRA,
  valuarCampo,
  tierraDe,
  precioSoja,
  type Valuacion,
  type ProvinciaTierra,
} from '@/lib/valuacion-campos'

/**
 * valuacion.ts — arma el informe de valuación de un campo.
 *
 * REUSA EL MOTOR QUE YA EXISTE. `valuarCampo()` es lo que alimenta la calculadora
 * gratuita de `/campos/valuar`, con sus dos vías (renta y comparables) y su lectura de la
 * brecha entre ambas. El informe no recalcula nada distinto: agrega el contexto que la
 * pantalla no puede dar —la dispersión de la zona, los comparables de al lado, los dos
 * repagos, la muestra que respalda cada número— y lo deja en un PDF imprimible.
 *
 * Si el informe dijera un número distinto al de la calculadora, el producto estaría roto.
 */

export interface ZonaComparable {
  nombre: string
  usdHa: number
  p25: number | null
  p75: number | null
  n: number
  kgHaAno: number | null
  aptitud: string | null
}

export interface InformeValuacion {
  zonaNombre: string
  provincia: string
  slug: string

  /** El resultado del motor, tal como lo ve la calculadora. */
  v: Valuacion
  /** La fila del relevamiento, para mostrar la muestra que la respalda. */
  t: ProvinciaTierra

  comparables: ZonaComparable[]

  /** Los dos repagos, que contestan preguntas distintas. */
  aniosPorCanon: number | null
  aniosPorProduccion: number | null

  novilloUsdKg: number
  sojaUsdQuintal: number
  datasetFecha: string
  compradorEmail: string
  generadoISO: string
}

function slugificar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugZonaTierra(t: { provincia: string; zona?: string | null }): string {
  return t.zona ? `${slugificar(t.provincia)}/${slugificar(t.zona)}` : slugificar(t.provincia)
}

export function nombreZonaTierra(t: { provincia: string; zona?: string | null }): string {
  return t.zona ? `${t.provincia} · ${t.zona}` : t.provincia
}

/** Las zonas vendibles: las que tienen valor de hectárea relevado. */
export function zonasValuables(): Array<{ slug: string; label: string }> {
  return TIERRA.filter((t) => t.usd_ha > 0)
    .map((t) => ({ slug: slugZonaTierra(t), label: nombreZonaTierra(t) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function labelZonaTierra(slug: string): string | null {
  const t = TIERRA.find((x) => slugZonaTierra(x) === slug)
  return t ? nombreZonaTierra(t) : null
}

/**
 * Comparables de una zona.
 *
 * Primero las de la misma región —la vecindad real, no la administrativa— y después las
 * de aptitud parecida. Sin comparables, un valor por hectárea no dice nada: el que lo lee
 * no sabe si está caro o barato.
 */
function comparablesDe(t: ProvinciaTierra, tope = 8): ZonaComparable[] {
  const resto = TIERRA.filter((x) => x.usd_ha > 0 && slugZonaTierra(x) !== slugZonaTierra(t))
  const mismaRegion = resto.filter((x) => x.region && x.region === t.region)
  const mismaAptitud = resto.filter((x) => x.aptitud === t.aptitud && !mismaRegion.includes(x))

  return [...mismaRegion, ...mismaAptitud, ...resto]
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, tope)
    .map((x) => ({
      nombre: nombreZonaTierra(x),
      usdHa: x.usd_ha,
      p25: x.p25 ?? null,
      p75: x.p75 ?? null,
      n: x.n,
      kgHaAno: x.kg_ha_ano ?? null,
      aptitud: x.aptitud ?? null,
    }))
}

/**
 * Arma el informe.
 *
 * `hectareas` sólo escala el total; el valor por hectárea y todo el contexto no dependen
 * de él. Por eso el informe se vende por ZONA y no por campo: lo que se compra es el
 * contexto de mercado, no una tasación de una parcela.
 */
export function armarInformeValuacion(
  slugZona: string,
  compradorEmail: string,
  opts: { hectareas?: number; hoy?: Date } = {},
): InformeValuacion | null {
  const t = TIERRA.find((x) => slugZonaTierra(x) === slugZona)
  if (!t || !t.usd_ha) return null

  const hoy = opts.hoy ?? new Date()
  const hectareas = opts.hectareas && opts.hectareas > 0 ? opts.hectareas : 100

  /**
   * Se le pasa el canon RELEVADO de la zona.
   *
   * `valuarCampo()` sólo calcula la vía de renta si recibe un canon: en la calculadora
   * eso está bien porque el usuario declara el suyo, pero el informe se vende por zona y
   * no hay un campo concreto que lo aporte. Sin esto el PDF mostraría una sola vía y
   * perdería la mitad del método —y la brecha entre ambas, que es de lo más útil que
   * tiene.
   *
   * (El motor sí toma por defecto el canon agrícola de la zona, pero no el ganadero. Es
   * una asimetría suya; se compensa acá en vez de cambiarle el comportamiento a la
   * calculadora, que hoy funciona.)
   */
  const v = valuarCampo({
    hectareas,
    provincia: t.provincia,
    zona: t.zona,
    kgHaMes: t.kg_ha_mes_canon ?? null,
    qqHaAnio: t.qq_soja_ha_anio ?? null,
  })

  // Confirma que el motor resolvió contra esta misma fila del relevamiento. Si tomó otra
  // referencia, el informe estaría mostrando la muestra de una zona y el número de otra.
  const resuelta = tierraDe(t.provincia, t.zona)

  /**
   * Los DOS repagos, que contestan preguntas distintas y suelen confundirse:
   *  · **Por canon** — cuántos años de arrendamiento hacen falta para recuperar la
   *    hectárea. Es lo que le importa a quien la alquila.
   *  · **Por producción** — cuántos años de la producción bruta del campo. Es lo que
   *    viene en `anos_repago` del dataset, y en Corrientes da 10,5 contra los 19 del
   *    canon: casi el doble.
   */
  const aniosPorProduccion = t.anos_repago ?? null
  const aniosPorCanon =
    v.canonAnualUsdHa && v.canonAnualUsdHa > 0 ? t.usd_ha / v.canonAnualUsdHa : null

  return {
    zonaNombre: nombreZonaTierra(t),
    provincia: t.provincia,
    slug: slugZona,
    v,
    t: resuelta ?? t,
    comparables: comparablesDe(t),
    aniosPorCanon,
    aniosPorProduccion,
    novilloUsdKg: v.novilloUsdKg,
    sojaUsdQuintal: precioSoja().usdQuintal,
    datasetFecha: t.fecha ?? '2026-08',
    compradorEmail,
    generadoISO: hoy.toISOString().slice(0, 10),
  }
}
