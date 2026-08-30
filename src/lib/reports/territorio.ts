import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchLotesDesde, claveRemitente, type Lote } from './mag-lotes'
import { partidoDeOrigen } from '@/lib/territorio/partidos'
import { indiceTernerosVaca, escala, ultimoAnio, type Departamento } from '@/lib/productividad/panel'

/**
 * territorio.ts — el mapa de la cartera de una firma, partido por partido.
 *
 * LA PREGUNTA QUE CONTESTA
 * "¿A qué partido mando al comercial el mes que viene?". El sistema de la casa tiene a los
 * que ya son clientes: le dice dónde **está**. Esto le dice dónde **no está**, sobre
 * productores que ya demostraron que mandan hacienda al Mercado de Cañuelas.
 *
 * POR QUÉ ES ACCIONABLE Y NO UNA CURIOSIDAD
 * El 97,7 % de los remitentes opera con una sola casa: un productor que no es suyo es de
 * otro, entero. Y no se trata de una lista fría — cada nombre del denominador ya cargó un
 * camión para Cañuelas.
 *
 * LÍMITE: sólo Buenos Aires. El origen de los lotes se resuelve a partido con precisión
 * ahí; en el resto del país la cobertura es despareja y preferimos no inventarla.
 */

/** Ventana de análisis. El MAG publica lote a lote y 90 días son ~3 ciclos comerciales. */
export const DIAS_VENTANA = 99

export interface PartidoCartera {
  partido: string
  slugProvincia: string
  slugDepartamento: string

  /** Remitentes distintos de ESTA casa en el partido, en la ventana. */
  propios: number
  /** Remitentes distintos de CUALQUIER casa. Es el mercado que ya va a Cañuelas. */
  totales: number
  /** propios / totales. La cuota real, medida. */
  cuota: number
  /** Cuántas casas operan ahí. Mide con cuántos hay que competir. */
  casas: number
  cabezasPropias: number

  /** Del padrón oficial: el tamaño del partido. */
  stock: number | null
  establecimientos: number | null
  escalaMedia: number | null
  indice: number | null
}

export interface Territorio {
  magId: number
  desde: string
  hasta: string
  /** Donde ya tiene al menos un remitente. */
  presencia: PartidoCartera[]
  /**
   * Donde NO tiene ninguno y hay productores yendo al MAG. Es la lista de prospección,
   * ordenada por lo que hay para ganar.
   */
  oportunidades: PartidoCartera[]
  totalRemitentesPropios: number
  totalPartidosConActividad: number
}

/**
 * Arma el territorio de una firma.
 *
 * Trae los lotes UNA vez y cruza en memoria: son ~12.000 filas para Buenos Aires y hacer
 * una consulta por partido serían 117 idas a la base para el mismo dato.
 */
export async function construirTerritorio(
  db: SupabaseClient,
  magId: number,
  opts: { dias?: number; ahora?: Date } = {},
): Promise<Territorio> {
  const dias = opts.dias ?? DIAS_VENTANA
  const ahora = opts.ahora ?? new Date()
  const desde = new Date(ahora.getTime() - dias * 86_400_000)
  const desdeISO = desde.toISOString().slice(0, 10)

  const lotes = (await fetchLotesDesde(db, desdeISO)).filter(
    (l: Lote) => l.provincia === 'BUE' && l.localidad && l.remitente,
  )

  const anio = ultimoAnio()

  // clave de partido -> { departamento, remitentes de todos, remitentes propios, casas }
  const porPartido = new Map<
    string,
    {
      d: Departamento
      todos: Set<string>
      propios: Set<string>
      casas: Set<number>
      cabezasPropias: number
    }
  >()

  for (const l of lotes) {
    const d = partidoDeOrigen(l.localidad)
    if (!d) continue

    const k = d.clave
    let e = porPartido.get(k)
    if (!e) {
      e = { d, todos: new Set(), propios: new Set(), casas: new Set(), cabezasPropias: 0 }
      porPartido.set(k, e)
    }

    const rem = claveRemitente(l.remitente)
    if (!rem) continue

    e.todos.add(rem)
    e.casas.add(l.mag_consignataria_id)
    if (l.mag_consignataria_id === magId) {
      e.propios.add(rem)
      e.cabezasPropias += l.head_count ?? 0
    }
  }

  const filas: PartidoCartera[] = [...porPartido.values()].map((e) => {
    const f = e.d.serie[anio]
    return {
      partido: e.d.nombre,
      slugProvincia: e.d.slugProvincia,
      slugDepartamento: e.d.slugDepartamento,
      propios: e.propios.size,
      totales: e.todos.size,
      cuota: e.todos.size ? e.propios.size / e.todos.size : 0,
      casas: e.casas.size,
      cabezasPropias: e.cabezasPropias,
      stock: f?.total ?? null,
      establecimientos: f?.up ?? e.d.up,
      escalaMedia: f ? escala(f) : null,
      indice: f ? indiceTernerosVaca(f) : null,
    }
  })

  return {
    magId,
    desde: desdeISO,
    hasta: ahora.toISOString().slice(0, 10),
    presencia: filas.filter((f) => f.propios > 0).sort((a, b) => b.propios - a.propios),
    // La oportunidad se ordena por productores que ya van al MAG y no son suyos: es lo
    // más cerca que se puede estar de "cuántas puertas hay para golpear acá".
    oportunidades: filas
      .filter((f) => f.propios === 0 && f.totales > 0)
      .sort((a, b) => b.totales - a.totales || (b.stock ?? 0) - (a.stock ?? 0)),
    totalRemitentesPropios: new Set(
      lotes
        .filter((l: Lote) => l.mag_consignataria_id === magId)
        .map((l: Lote) => claveRemitente(l.remitente))
        .filter(Boolean),
    ).size,
    totalPartidosConActividad: filas.length,
  }
}

/**
 * La línea que resume el territorio para el panel.
 *
 * No es decorativa: es lo que el dueño de la casa lee primero y lo que decide si abre el
 * resto. Por eso nombra el partido concreto y no da un porcentaje agregado.
 */
export function titularTerritorio(t: Territorio): string {
  const top = t.oportunidades[0]
  if (!top) {
    return `Tenés remitentes en los ${t.presencia.length} partidos donde operás. No hay zona vacía en el dato de Cañuelas.`
  }
  const estab = top.establecimientos ? `${top.establecimientos.toLocaleString('es-AR')} establecimientos` : 'sin dato de establecimientos'
  return `${top.partido}: ${top.totales} productores mandan al MAG desde ahí y ninguno es tuyo. ${estab} en el partido.`
}

export type { Lote }
