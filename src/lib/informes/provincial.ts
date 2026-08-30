import {
  getProvincias,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  hayCompraDeTerneros,
  escala,
  tendencia,
  totalProvincial,
  ultimoAnio,
  META,
  type Departamento,
} from '@/lib/productividad/panel'
import senasa from '@/lib/data/senasa-habilitados.json'
import remates from '@/lib/data/remates.json'

/**
 * provincial.ts — arma el informe de prospección de una provincia.
 *
 * PARA QUIÉN
 * Las ~85 casas que trabajan el interior y no operan en Cañuelas. A ellas no se les puede
 * mostrar su propia cartera porque no hay dato transaccional suyo; lo que sí se les puede
 * mostrar es **dónde está el rodeo de su provincia**: qué partidos crecen, cuáles se
 * vacían, de qué escala son los establecimientos y qué canal de salida ya existe.
 *
 * A diferencia de PRO Territorio, esto no necesita que la firma opere en ningún mercado
 * nuestro: sale del padrón oficial, que cubre todo el país.
 */

export interface PartidoProvincial {
  nombre: string
  slugProvincia: string
  slugDepartamento: string
  cabezas: number
  vacas: number
  establecimientos: number | null
  escalaMedia: number | null
  indice: number | null
  /** true si compra terneros: es invernada, no cría. */
  invernada: boolean
  /** Variación del rodeo desde 2012. `null` si no tiene serie completa. */
  variacion: number | null
}

export interface InformeProvincial {
  provincia: string
  slug: string
  anio: number

  totalCabezas: number | null
  totalEstablecimientos: number | null
  totalVacas: number | null
  /** Variación provincial del rodeo desde 2012. */
  variacionProvincial: number | null

  partidos: PartidoProvincial[]
  /**
   * Los que más rodeo ganaron, **entre los de tamaño relevante**. Un partido chico que
   * duplica cuarenta animales no es una oportunidad comercial.
   */
  enCrecimiento: PartidoProvincial[]
  /** Los que más perdieron, con el mismo piso. Prospectar ahí es remar contra la corriente. */
  enRetroceso: PartidoProvincial[]
  /** El piso de rodeo que se usó para esos dos rankings. Va declarado en el informe. */
  pisoRodeo: number

  /** Canal de salida que ya existe en la provincia. */
  frigorificos: number
  rematesProximos: number
  firmasQueRematan: string[]

  fuente: string
  datasetGenerado: string
  compradorEmail: string
  generadoISO: string
}

interface SenasaSnapshot {
  byCuit: Record<string, { provincia: string }>
}
interface RemateJson {
  province?: string
  date: string
  consignatariaName?: string
}

/** Las provincias vendibles: las que tienen al menos 5 partidos con dato publicable. */
export function provinciasDisponibles(): Array<{ slug: string; label: string }> {
  const anio = ultimoAnio()
  const cuenta = new Map<string, number>()
  for (const d of getDepartamentosPublicables()) {
    if (d.serie[anio]) cuenta.set(d.provincia, (cuenta.get(d.provincia) ?? 0) + 1)
  }
  return getProvincias()
    .filter((p) => (cuenta.get(p.clave) ?? 0) >= 5)
    .map((p) => ({ slug: p.slug, label: p.nombre }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function labelProvincia(slug: string): string | null {
  return getProvincias().find((p) => p.slug === slug)?.nombre ?? null
}

function aFila(d: Departamento, anio: number): PartidoProvincial {
  const f = d.serie[anio]
  const t = tendencia(d, 2012, anio)
  return {
    nombre: d.nombre,
    slugProvincia: d.slugProvincia,
    slugDepartamento: d.slugDepartamento,
    cabezas: f.total,
    vacas: f.vacas,
    establecimientos: f.up ?? d.up,
    escalaMedia: escala(f),
    indice: indiceTernerosVaca(f),
    invernada: hayCompraDeTerneros(f),
    variacion: t?.stockVar ?? null,
  }
}

export function armarInformeProvincial(
  slugProvincia: string,
  compradorEmail: string,
  hoy = new Date(),
): InformeProvincial | null {
  const p = getProvincias().find((x) => x.slug === slugProvincia)
  if (!p) return null

  const anio = ultimoAnio()
  const deptos = getDepartamentosPublicables().filter(
    (d) => d.provincia === p.clave && d.serie[anio],
  )
  if (deptos.length < 5) return null

  const partidos = deptos
    .map((d) => aFila(d, anio))
    .sort((a, b) => b.cabezas - a.cabezas)

  /**
   * Piso de rodeo para entrar a los rankings de crecimiento y retroceso.
   *
   * Sin esto, Buenos Aires "crece" en Esteban Echeverría (+65 %) y Presidente Perón
   * (+33 %): partidos del conurbano con rodeos de unos cientos de cabezas donde un
   * porcentaje enorme son cuarenta animales. A una casa que busca dónde prospectar eso no
   * le sirve — necesita partidos donde haya con quién trabajar.
   *
   * El piso es la mediana provincial: se compara cada partido contra el tamaño típico de
   * SU provincia, y no contra un número fijo que dejaría a Corrientes entera adentro y a
   * media Buenos Aires afuera.
   */
  const tamanos = partidos.map((x) => x.cabezas).sort((a, b) => a - b)
  const pisoRodeo = tamanos.length ? tamanos[Math.floor(tamanos.length / 2)] : 0
  const conVariacion = partidos.filter((x) => x.variacion != null && x.cabezas >= pisoRodeo)
  const total = totalProvincial(p.clave, anio)
  const total2012 = totalProvincial(p.clave, 2012)

  // Canal de salida ya existente. El padrón de SENASA escribe la provincia en mayúsculas
  // sin acentos, igual que la clave del panel, así que compara directo.
  const frigorificos = Object.values((senasa as SenasaSnapshot).byCuit).filter(
    (r) => r.provincia === p.clave,
  ).length

  const hoyISO = hoy.toISOString().slice(0, 10)
  const rematesProv = (remates as RemateJson[]).filter(
    (r) => r.province && normalizarProvincia(r.province) === p.clave && r.date >= hoyISO,
  )

  return {
    provincia: p.nombre,
    slug: p.slug,
    anio,
    totalCabezas: total?.total ?? null,
    totalEstablecimientos: total?.up ?? null,
    totalVacas: total?.vacas ?? null,
    variacionProvincial:
      total && total2012 && total2012.total ? (total.total - total2012.total) / total2012.total : null,
    partidos,
    enCrecimiento: [...conVariacion].sort((a, b) => b.variacion! - a.variacion!).slice(0, 5),
    enRetroceso: [...conVariacion].sort((a, b) => a.variacion! - b.variacion!).slice(0, 5),
    pisoRodeo,
    frigorificos,
    rematesProximos: rematesProv.length,
    firmasQueRematan: [
      ...new Set(rematesProv.map((r) => r.consignatariaName).filter(Boolean) as string[]),
    ].slice(0, 12),
    fuente: META.organismo,
    datasetGenerado: META.generado,
    compradorEmail,
    generadoISO: hoy.toISOString().slice(0, 10),
  }
}

/**
 * El calendario escribe la provincia con acentos y en title case; el panel la tiene en
 * mayúsculas sin acentos. Sin esto, Entre Ríos y Río Negro pierden todos sus remates.
 */
function normalizarProvincia(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}
