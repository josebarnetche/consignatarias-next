import {
  getDepartamento,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  desteteEstimado,
  hayCompraDeTerneros,
  pesoInvernada,
  escala,
  rankingProvincial,
  puestoEnProvincia,
  tendencia,
  totalProvincial,
  aniosConRuido,
  ultimoAnio,
  META,
  type Departamento,
} from '@/lib/productividad/panel'

/**
 * departamental.ts — arma el informe productivo de un departamento.
 *
 * Traduce el panel a algo que se pueda leer sin ser estadístico, y **se hace cargo de los
 * dos límites del indicador** en vez de esconderlos:
 *
 *  1. En 33 de los 455 departamentos publicables el índice terneros/vaca supera lo que un
 *     rodeo puede parir: ahí los terneros se compran. El informe lo dice y no habla de
 *     destete.
 *  2. Los años en que el origen trajo filas duplicadas cargan ruido en la serie. Van
 *     declarados.
 */

export interface FilaCategoria {
  nombre: string
  cabezas: number
  porcentaje: number
}

export interface InformeDepartamental {
  provincia: string
  departamento: string
  anio: number

  totalCabezas: number
  establecimientos: number | null
  escalaMedia: number | null

  composicion: FilaCategoria[]

  /** El índice medido. Siempre presente. */
  indice: number | null
  /** El destete estimado. `null` donde el índice no es interpretable como tal. */
  destete: number | null
  /** true si la zona compra terneros: es invernada, no cría. */
  compraTerneros: boolean
  pesoInvernada: number | null

  puesto: number | null
  deCuantos: number | null
  /** Los tres de arriba y los tres de abajo de la provincia, para ubicarse. */
  referencias: Array<{ nombre: string; indice: number; esEsteDepartamento: boolean }>

  /** Serie de stock e índice, año por año. */
  serie: Array<{ anio: number; total: number; indice: number | null; conRuido: boolean }>
  variacionStock: number | null
  variacionIndicePuntos: number | null

  provinciaTotal: number | null
  paisFuente: string
  datasetGenerado: string
  compradorEmail: string
  generadoISO: string
}

/** Las categorías del rodeo, en el orden en que se leen. */
const CATEGORIAS_LABEL: Array<[string, string]> = [
  ['vacas', 'Vacas'],
  ['vaquillonas', 'Vaquillonas'],
  ['novillos', 'Novillos'],
  ['novillitos', 'Novillitos'],
  ['terneros', 'Terneros'],
  ['terneras', 'Terneras'],
  ['toros', 'Toros'],
  ['toritos', 'Toritos'],
  ['bueyes', 'Bueyes'],
]

/** Las variantes vendibles: `provincia/departamento`, sólo publicables. */
export function variantesDisponibles(): Array<{ slug: string; label: string }> {
  return getDepartamentosPublicables()
    .map((d) => ({
      slug: `${d.slugProvincia}/${d.slugDepartamento}`,
      label: `${d.nombre}, ${d.provinciaNombre}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function armarInformeDepartamental(
  varianteSlug: string,
  compradorEmail: string,
  hoy = new Date(),
): InformeDepartamental | null {
  const [slugProv, slugDep] = varianteSlug.split('/')
  if (!slugProv || !slugDep) return null

  const d = getDepartamento(slugProv, slugDep)
  if (!d || !d.publicable) return null

  const anio = ultimoAnio()
  const f = d.serie[anio]
  if (!f) return null

  const indice = indiceTernerosVaca(f)
  const compra = hayCompraDeTerneros(f)
  const puesto = puestoEnProvincia(d, anio)
  const ranking = rankingProvincial(d.provincia, anio)
  const t = tendencia(d, 2012, anio)
  const conRuido = new Set(aniosConRuido(d))

  // Tres arriba y tres abajo, más el propio, para ubicarse sin la tabla entera.
  const refs = [...ranking.slice(0, 3), ...ranking.slice(-3)]
    .filter((r, i, arr) => arr.findIndex((x) => x.departamento.clave === r.departamento.clave) === i)
    .map((r) => ({
      nombre: r.departamento.nombre,
      indice: r.indice,
      esEsteDepartamento: r.departamento.clave === d.clave,
    }))

  const composicion: FilaCategoria[] = CATEGORIAS_LABEL.map(([k, nombre]) => {
    const cabezas = (f as unknown as Record<string, number>)[k] ?? 0
    return { nombre, cabezas, porcentaje: f.total ? cabezas / f.total : 0 }
  }).filter((c) => c.cabezas > 0)

  const serie = Object.keys(d.serie)
    .map(Number)
    .sort((a, b) => a - b)
    .map((a) => ({
      anio: a,
      total: d.serie[a].total,
      indice: indiceTernerosVaca(d.serie[a]),
      conRuido: conRuido.has(a),
    }))

  const provTotal = totalProvincial(d.provincia, anio)

  return {
    provincia: d.provinciaNombre,
    departamento: d.nombre,
    anio,
    totalCabezas: f.total,
    establecimientos: f.up ?? d.up,
    escalaMedia: escala(f),
    composicion,
    indice,
    destete: desteteEstimado(f),
    compraTerneros: compra,
    pesoInvernada: pesoInvernada(f),
    puesto: puesto?.puesto ?? null,
    deCuantos: puesto?.de ?? null,
    referencias: refs,
    serie,
    variacionStock: t?.stockVar ?? null,
    variacionIndicePuntos: t?.indiceDeltaPuntos ?? null,
    provinciaTotal: provTotal?.total ?? null,
    paisFuente: META.organismo,
    datasetGenerado: META.generado,
    compradorEmail,
    generadoISO: hoy.toISOString().slice(0, 10),
  }
}

/** Etiqueta humana de una variante, para el checkout y la biblioteca. */
export function labelVariante(varianteSlug: string): string | null {
  const [p, dd] = varianteSlug.split('/')
  const d = p && dd ? getDepartamento(p, dd) : null
  return d ? `${d.nombre}, ${d.provinciaNombre}` : null
}

export type { Departamento }
