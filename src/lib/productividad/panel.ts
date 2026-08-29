/**
 * Panel productivo departamental — lectura tipada de `stock-departamental.json`.
 *
 * La fuente es la serie oficial de MAGyP (base SIGSA/SENASA): 527 departamentos, 2012-2025,
 * composición del rodeo por categoría. La genera `scripts/build-panel-productivo.mjs`.
 *
 * De acá sale el indicador que da sentido al producto: el **índice terneros/vaca por
 * departamento**, que no está publicado como serie en ninguna fuente oficial. Ver
 * `docs/strategy/PRODUCTO-INFORME-ZONA.md`.
 *
 * ⚠️ **Sólo servidor.** El JSON pesa ~570 KB. Importarlo desde un componente cliente lo
 * mete entero en el bundle. Las fichas son SSG: se lee en build y se pasan números sueltos.
 */

import panel from '@/lib/data/stock-departamental.json'

/** Una fila anual: las 9 categorías + total + unidades productivas. */
export interface FilaAnual {
  vacas: number
  vaquillonas: number
  novillos: number
  novillitos: number
  terneros: number
  terneras: number
  toros: number
  toritos: number
  bueyes: number
  total: number
  /** `null` hasta 2021 — el origen no lo informaba. No es cero. */
  up: number | null
}

export interface Departamento {
  clave: string
  provincia: string
  provinciaNombre: string
  nombre: string
  slugProvincia: string
  slugDepartamento: string
  /** UP del año más reciente que las informe (2022+). */
  up: number | null
  upAnio: number | null
  /** false si está bajo el umbral de UP: no genera ficha pública ni informe. */
  publicable: boolean
  serie: Record<number, FilaAnual>
}

export interface Provincia {
  clave: string
  nombre: string
  slug: string
}

type FilaCruda = number[]

interface PanelCrudo {
  meta: {
    organismo: string
    dataset: string
    url: string
    generado: string
    minUpPublicable: number
    aniosEstimados: number[]
    colisiones: { departamento: string; anio: number; sumadas: number }[]
    nota: string
  }
  categorias: string[]
  provincias: Provincia[]
  departamentos: {
    clave: string
    provincia: string
    provinciaNombre: string
    nombre: string
    slugProvincia: string
    slugDepartamento: string
    up: number | null
    upAnio: number | null
    publicable: boolean
    serie: Record<string, FilaCruda>
  }[]
  totalesProvinciales: Record<string, Record<string, FilaCruda>>
  totalesPais: Record<string, FilaCruda>
}

const CRUDO = panel as unknown as PanelCrudo

export const META = CRUDO.meta

function hidratar(f: FilaCruda): FilaAnual {
  return {
    vacas: f[0], vaquillonas: f[1], novillos: f[2], novillitos: f[3],
    terneros: f[4], terneras: f[5], toros: f[6], toritos: f[7], bueyes: f[8],
    total: f[9],
    up: f[10] ?? null,
  }
}

function hidratarSerie(s: Record<string, FilaCruda>): Record<number, FilaAnual> {
  const out: Record<number, FilaAnual> = {}
  for (const [anio, fila] of Object.entries(s)) out[Number(anio)] = hidratar(fila)
  return out
}

let cacheDeptos: Departamento[] | null = null

/** Todos los departamentos, publicables o no. */
export function getDepartamentos(): Departamento[] {
  cacheDeptos ??= CRUDO.departamentos.map((d) => ({ ...d, serie: hidratarSerie(d.serie) }))
  return cacheDeptos
}

/** Los que generan ficha pública. Es la lista de `generateStaticParams`. */
export function getDepartamentosPublicables(): Departamento[] {
  return getDepartamentos().filter((d) => d.publicable)
}

export function getProvincias(): Provincia[] {
  return CRUDO.provincias
}

export function getDepartamento(slugProvincia: string, slugDepartamento: string): Departamento | null {
  return (
    getDepartamentos().find(
      (d) => d.slugProvincia === slugProvincia && d.slugDepartamento === slugDepartamento,
    ) ?? null
  )
}

let cacheAnios: number[] | null = null

/**
 * Años con desagregación departamental, ascendente.
 *
 * Es la unión de todos los departamentos, no la serie de uno: hay departamentos que no
 * cubren el rango completo, así que preguntarle a cualquiera devuelve un año final
 * equivocado.
 */
export function aniosDisponibles(): number[] {
  cacheAnios ??= [
    ...new Set(getDepartamentos().flatMap((d) => Object.keys(d.serie).map(Number))),
  ].sort((a, b) => a - b)
  return cacheAnios
}

/** Último año con dato de ESTE departamento, que puede no ser el último del panel. */
export function ultimoAnioCon(d: Departamento): number | null {
  const anios = Object.keys(d.serie).map(Number)
  return anios.length ? Math.max(...anios) : null
}

/** true si el departamento tiene dato en el último año del panel. */
export function tieneDatoReciente(d: Departamento): boolean {
  return d.serie[ultimoAnio()] != null
}

export function ultimoAnio(): number {
  const a = aniosDisponibles()
  return a[a.length - 1]
}

/**
 * Índice terneros/vaca. Es lo que el dato mide directamente: terneros y terneras al 31/12
 * sobre las vacas del mismo stock.
 *
 * **No es el índice de destete**, aunque se le parece y suele confundirse. Ver
 * `desteteEstimado()`.
 */
export function indiceTernerosVaca(f: FilaAnual): number | null {
  if (!f.vacas) return null
  return (f.terneros + f.terneras) / f.vacas
}

/**
 * Supuesto del NEA: las vacas de invernada son ~17 % del total de vacas, así que los
 * vientres en servicio son el 83 % restante.
 *
 * Fuente: Sampedro, D. y Calvi, M. (2018), cap. 1 de *Cría Vacuna en el NEA*, Ediciones
 * INTA, págs. 9-10 — "se asume que las vacas disponibles para invernada constituyen un
 * 17 % del total de vacas".
 */
export const PROPORCION_VIENTRES_NEA = 0.83

/**
 * Techo biológico del índice terneros/vaca en un rodeo de cría.
 *
 * Una vaca pare un ternero por año; con mellizos y algún desfasaje de registro al 31/12 el
 * cociente puede acercarse a 1, nunca superarlo de forma sostenida. Un destete del 80 %
 * sobre vientres al 83 % de las vacas da un índice de 0,66 — que es el orden de magnitud
 * real de la ganadería argentina.
 *
 * **Por encima de este valor, el exceso son terneros comprados, no paridos**: el
 * departamento no es de cría, es de invernada o engorde, y ahí el índice deja de medir
 * eficiencia reproductiva. En el panel 2025 hay 33 departamentos publicables por encima de
 * 0,95, con casos como La Cocha (Tucumán) en 4,17 y Gaiman (Chubut) en 3,53. Publicar eso
 * como "destete" sería publicar un disparate.
 */
export const TECHO_BIOLOGICO_INDICE = 0.95

/**
 * true si el departamento tiene más terneros de los que su rodeo de vacas puede parir.
 *
 * No es un error del dato: es la firma de una zona que compra terneros para engordar. Toda
 * ficha que muestre el índice tiene que ramificar acá antes de llamarlo "destete".
 */
export function hayCompraDeTerneros(f: FilaAnual): boolean {
  const i = indiceTernerosVaca(f)
  return i != null && i > TECHO_BIOLOGICO_INDICE
}

/**
 * Peso de la invernada: novillos y novillitos sobre vacas.
 *
 * Es el complemento de `hayCompraDeTerneros` y sirve para el caso inverso — una zona puede
 * engordar sin comprar terneros, reteniendo los propios. En cría pura el cociente es bajo
 * (Corrientes 2025 ronda 0,1); en invernada se acerca o supera 1.
 */
export function pesoInvernada(f: FilaAnual): number | null {
  if (!f.vacas) return null
  return (f.novillos + f.novillitos) / f.vacas
}

/**
 * Destete estimado: el índice medido, corregido por la proporción de vacas que
 * efectivamente entran en servicio.
 *
 * ⚠️ **Es una estimación, no una medición.** El origen no distingue vacas de cría de vacas
 * de invernada, así que hay que asumir la proporción. El default (0,83) es el supuesto que
 * INTA usa para el NEA y **no es trasladable a otra región sin justificarlo** — en una zona
 * de invernada la proporción es distinta y el número saldría inflado.
 *
 * Devuelve `null` cuando el índice supera el techo biológico: en esos departamentos entran
 * terneros comprados y el cociente ya no habla de eficiencia reproductiva. Es preferible no
 * mostrar el número a mostrar un 417 % de destete.
 *
 * Regla para el producto: mostrar siempre `indiceTernerosVaca` como el dato, y este número
 * sólo donde el supuesto aplique, dicho como estimación y con la fuente.
 */
export function desteteEstimado(f: FilaAnual, proporcionVientres = PROPORCION_VIENTRES_NEA): number | null {
  const i = indiceTernerosVaca(f)
  if (i == null || proporcionVientres <= 0) return null
  if (i > TECHO_BIOLOGICO_INDICE) return null
  return i / proporcionVientres
}

/** Cabezas por unidad productiva. `null` en los años sin UP. */
export function escala(f: FilaAnual): number | null {
  if (!f.up) return null
  return f.total / f.up
}

export interface PuestoRanking {
  departamento: Departamento
  indice: number
  puesto: number
  de: number
}

/**
 * Ranking de una provincia por índice terneros/vaca, descendente.
 *
 * Quiénes NO entran, y por qué:
 *  · Los que están bajo el umbral de UP: un departamento con tres establecimientos no
 *    describe una zona, y además no se publica.
 *  · **Los que compran terneros.** El ranking mide eficiencia reproductiva, y una zona de
 *    engorde no compite en eso: su cociente es alto porque compra, no porque para. Sin
 *    este filtro, La Cocha (Tucumán) salía primera de su provincia con 417 %, que es
 *    exactamente el número que no significa lo que el ranking dice medir.
 */
export function rankingProvincial(provincia: string, anio = ultimoAnio()): PuestoRanking[] {
  const lista = getDepartamentosPublicables()
    .filter((d) => d.provincia === provincia && d.serie[anio] && !hayCompraDeTerneros(d.serie[anio]))
    .map((d) => ({ departamento: d, indice: indiceTernerosVaca(d.serie[anio]) }))
    .filter((x): x is { departamento: Departamento; indice: number } => x.indice != null)
    .sort((a, b) => b.indice - a.indice)

  return lista.map((x, i) => ({ ...x, puesto: i + 1, de: lista.length }))
}

/** Dónde está parado un departamento en su provincia. `null` si no es publicable. */
export function puestoEnProvincia(d: Departamento, anio = ultimoAnio()): PuestoRanking | null {
  return rankingProvincial(d.provincia, anio).find((p) => p.departamento.clave === d.clave) ?? null
}

export interface Tendencia {
  desde: number
  hasta: number
  stockDesde: number
  stockHasta: number
  /** Variación relativa del stock. −0,17 = cayó 17 %. */
  stockVar: number
  indiceDesde: number | null
  indiceHasta: number | null
  /** Diferencia en puntos porcentuales. +5,3 = mejoró 5,3 puntos. */
  indiceDeltaPuntos: number | null
}

/**
 * Tendencia entre dos años.
 *
 * El par que cuenta la historia es stock + índice a la vez: el sur de Corrientes achicó el
 * rodeo y mejoró la eficiencia, mientras que el norte perdió stock sin moverse un punto.
 * Mostrar sólo uno de los dos da la mitad equivocada.
 */
export function tendencia(d: Departamento, desde = 2012, hasta = ultimoAnio()): Tendencia | null {
  const a = d.serie[desde]
  const b = d.serie[hasta]
  if (!a || !b || !a.total) return null

  const iA = indiceTernerosVaca(a)
  const iB = indiceTernerosVaca(b)

  return {
    desde,
    hasta,
    stockDesde: a.total,
    stockHasta: b.total,
    stockVar: (b.total - a.total) / a.total,
    indiceDesde: iA,
    indiceHasta: iB,
    indiceDeltaPuntos: iA != null && iB != null ? (iB - iA) * 100 : null,
  }
}

/** Total provincial publicado por el origen (no la suma de departamentos). */
export function totalProvincial(provincia: string, anio = ultimoAnio()): FilaAnual | null {
  const f = CRUDO.totalesProvinciales[provincia]?.[String(anio)]
  return f ? hidratar(f) : null
}

export function totalPais(anio = ultimoAnio()): FilaAnual | null {
  const f = CRUDO.totalesPais[String(anio)]
  return f ? hidratar(f) : null
}

/**
 * Años en que el origen trajo más de una fila para este departamento y hubo que sumarlas.
 *
 * La ficha tiene que declararlos: la serie de esos años carga ruido. El caso conocido es
 * Capitán Sarmiento 2012-2018, donde el origen etiquetó filas de General Sarmiento con el
 * nombre equivocado y lo corrigió en 2019.
 */
export function aniosConRuido(d: Departamento): number[] {
  return META.colisiones.filter((c) => c.departamento === d.clave).map((c) => c.anio).sort()
}
