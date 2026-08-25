/**
 * cartera.ts — los remitentes de una consignataria: quién le consigna, quién dejó
 * de hacerlo y quién es nuevo.
 *
 * POR QUÉ ESTO ES EL PRODUCTO
 * El negocio de una casa de remates es su cartera. Y el dato del MAG muestra algo que
 * define el mercado: **el 97,7% de los remitentes opera con UNA sola consignataria**
 * (2.453 de 2.510 en 90 días). No hay clientes compartidos: perder uno es perderlo
 * entero, y ganarlo es ganarlo entero.
 *
 * Su propio sistema le dice a quién le facturó. Lo que no le dice —porque no puede—
 * es que un cliente rompió su ritmo, ni que el productor que dejó de llamarla está
 * consignando en otra casa. Eso está en el dato público del MAG, operación por
 * operación, y hay que cruzarlo para verlo.
 *
 * EL ERROR QUE HAY QUE EVITAR
 * La versión ingenua es "no consignó en los últimos 45 días ⇒ está en riesgo". Con
 * eso, Colombo y Magliano tenía **147 clientes en riesgo**: una lista que nadie va a
 * llamar. Y está mal de raíz, porque un criador vende al destete, una o dos veces al
 * año: 45 días de silencio no significan nada para él.
 *
 * La regla honesta compara a cada cliente **contra su propio ritmo**: si consigna cada
 * 30 días y hace 90 que no aparece, eso es una señal; si consigna cada 180, no. Con
 * esa regla la misma casa tiene **14 clientes que rompieron su patrón** — una lista
 * que un comercial sí levanta el teléfono para atender.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchLotesDesde,
  haceDias,
  claveRemitente,
  magIdDeSlug,
  mediana,
  repararTexto,
  type Lote,
} from './mag-lotes'

/**
 * Consignaciones mínimas para decir que un cliente tiene un ritmo.
 * Con dos fechas hay un solo intervalo y cualquier cosa parece patrón; con tres hay
 * al menos dos intervalos que comparar.
 */
export const MIN_CONSIGNACIONES = 3

/**
 * Cuántas veces su propio ritmo tiene que pasar para encender la alerta.
 *
 * Estaba en 2 y era poco: alcanzaba con que un cliente de ritmo semanal pasara dos
 * semanas sin operar. En este negocio eso no significa nada — significa que no tiene
 * hacienda lista.
 */
export const FACTOR_ALERTA = 3

/**
 * Piso absoluto de silencio, en días. Sin esto, un cliente que consigna cada 2 días
 * saltaba la alerta a los 6, que es ridículo para hacienda: entre que se junta la
 * tropa, se coordina el flete y hay remate, un mes es lo normal.
 *
 * La condición final es `silencio > max(FACTOR × cadencia, PISO)`: las dos tienen que
 * cumplirse, así que ni el ritmo muy corto ni el muy largo generan falsas alarmas.
 */
export const PISO_DIAS_SILENCIO = 30

export interface ClienteEnRiesgo {
  nombre: string
  localidad: string | null
  provincia: string | null
  /** Días desde la última vez que consignó. */
  diasSilencio: number
  /** Cada cuántos días solía consignar (mediana de sus intervalos). */
  cadenciaDias: number
  consignaciones: number
  cabezas: number
  /** Si volvió a aparecer en el MAG con OTRA casa, cuál. Null si simplemente no operó. */
  seFueA: string | null
}

export interface ClienteNuevo {
  nombre: string
  localidad: string | null
  cabezas: number
  primeraVez: string
}

/** Cliente que antes consignaba en otra casa y ahora consigna acá. */
export interface ClienteGanado {
  nombre: string
  localidad: string | null
  cabezas: number
  /** De qué casa venía. */
  veniaDe: string
  desde: string
}

export interface ClienteTop {
  nombre: string
  localidad: string | null
  cabezas: number
  consignaciones: number
  /** Qué porcentaje de las cabezas de la firma aporta este cliente. */
  pctDelVolumen: number
}

export interface Cartera {
  slug: string
  dias: number
  totalClientes: number
  /** Clientes que rompieron su propio ritmo. Ordenados por cabezas en juego. */
  enRiesgo: ClienteEnRiesgo[]
  /**
   * Primera aparición en TODO el mercado dentro del período (no operaron con
   * ninguna casa antes). Ojo: la ventana del MAG es corta, así que un productor
   * que vende una vez al año puede caer acá sin ser nuevo de verdad.
   */
  nuevos: ClienteNuevo[]
  /** Venían de otra casa. Esto sí es una captura demostrable. */
  ganados: ClienteGanado[]
  top: ClienteTop[]
  /** Qué porcentaje del volumen aportan los 5 clientes más grandes. */
  concentracionTop5: number
  /** Cabezas totales del período. */
  cabezas: number
}

interface Actividad {
  nombre: string
  fechas: Set<string>
  cabezas: number
  localidad: string | null
  provincia: string | null
  primera: string
  ultima: string
}

function acumular(mapa: Map<string, Actividad>, l: Lote) {
  const clave = claveRemitente(l.remitente)
  if (!clave) return
  const prev = mapa.get(clave)
  if (!prev) {
    mapa.set(clave, {
      nombre: repararTexto((l.remitente ?? '').trim()),
      fechas: new Set([l.date]),
      cabezas: l.head_count ?? 0,
      localidad: l.localidad ? repararTexto(l.localidad.trim()) : null,
      provincia: l.provincia?.trim() || null,
      primera: l.date,
      ultima: l.date,
    })
    return
  }
  prev.fechas.add(l.date)
  prev.cabezas += l.head_count ?? 0
  if (l.date < prev.primera) prev.primera = l.date
  if (l.date > prev.ultima) prev.ultima = l.date
  if (!prev.localidad && l.localidad) prev.localidad = repararTexto(l.localidad.trim())
}

/** Días entre consignaciones sucesivas. */
function intervalos(fechas: Set<string>): number[] {
  const orden = [...fechas].sort()
  const out: number[] = []
  for (let i = 1; i < orden.length; i++) {
    const d = (Date.parse(orden[i]) - Date.parse(orden[i - 1])) / 86_400_000
    if (d > 0) out.push(d)
  }
  return out
}

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - Date.parse(fecha)) / 86_400_000)
}

/**
 * La cartera de una firma en los últimos `dias`.
 *
 * Devuelve null si la firma no opera en el MAG — que es el caso de casi todas las
 * casas del interior, y decirlo así es más honesto que mostrar una tabla vacía.
 */
export async function getCartera(
  db: SupabaseClient | null,
  slug: string,
  dias = 90,
): Promise<Cartera | null> {
  if (!db) return null
  try {
    const magId = await magIdDeSlug(db, slug)
    if (!magId) return null

    const lotes = await fetchLotesDesde(db, haceDias(dias))
    if (lotes.length === 0) return null

    // Actividad de MI cartera, y en paralelo el rastro de cada remitente en TODO el
    // mercado. Ese segundo mapa es lo que permite las dos afirmaciones fuertes:
    // "este cliente se fue a tal casa" y "a este lo trajiste de tal otra".
    const mios = new Map<string, Actividad>()
    const rastro = new Map<string, Map<number, { primera: string; ultima: string }>>()

    for (const l of lotes) {
      const clave = claveRemitente(l.remitente)
      if (!clave) continue

      const porCasa = rastro.get(clave) ?? new Map<number, { primera: string; ultima: string }>()
      const prev = porCasa.get(l.mag_consignataria_id)
      if (!prev) porCasa.set(l.mag_consignataria_id, { primera: l.date, ultima: l.date })
      else {
        if (l.date < prev.primera) prev.primera = l.date
        if (l.date > prev.ultima) prev.ultima = l.date
      }
      rastro.set(clave, porCasa)

      if (l.mag_consignataria_id === magId) acumular(mios, l)
    }

    if (mios.size === 0) return null

    const cabezasTotales = [...mios.values()].reduce((a, c) => a + c.cabezas, 0)

    // Nombres de las otras casas, para poder decir a dónde se fue un cliente.
    const { data: casas } = await db.from('mag_consignatarias').select('mag_id, name')
    const nombreCasa = new Map<number, string>(
      ((casas ?? []) as { mag_id: number; name: string }[]).map((c) => [c.mag_id, c.name]),
    )

    const enRiesgo: ClienteEnRiesgo[] = []
    const nuevos: ClienteNuevo[] = []
    const ganados: ClienteGanado[] = []
    const mitad = haceDias(Math.floor(dias / 2))

    for (const [clave, a] of mios) {
      const suRastro = rastro.get(clave) ?? new Map()

      // ¿Rompió su propio ritmo?
      const ints = intervalos(a.fechas)
      if (ints.length >= MIN_CONSIGNACIONES - 1) {
        const cadencia = mediana(ints)
        const silencio = diasDesde(a.ultima)
        const umbral = Math.max(FACTOR_ALERTA * cadencia, PISO_DIAS_SILENCIO)
        if (cadencia > 0 && silencio > umbral) {
          // ¿Apareció con otra casa DESPUÉS de dejar de operar con nosotros?
          let seFueA: string | null = null
          for (const [casaId, r] of suRastro) {
            if (casaId !== magId && r.ultima > a.ultima) {
              seFueA = nombreCasa.get(casaId) ?? null
              break
            }
          }
          enRiesgo.push({
            nombre: a.nombre,
            localidad: a.localidad,
            provincia: a.provincia,
            diasSilencio: silencio,
            cadenciaDias: Math.round(cadencia),
            consignaciones: a.fechas.size,
            cabezas: a.cabezas,
            seFueA,
          })
        }
      }

      // ¿Lo trajimos de otra casa? Es demostrable: operaba con otra ANTES de su
      // primera consignación acá.
      let veniaDe: string | null = null
      for (const [casaId, r] of suRastro) {
        if (casaId !== magId && r.primera < a.primera) {
          veniaDe = nombreCasa.get(casaId) ?? null
          break
        }
      }
      if (veniaDe) {
        ganados.push({ nombre: a.nombre, localidad: a.localidad, cabezas: a.cabezas, veniaDe, desde: a.primera })
        continue // ya está contado como captura; no es "nuevo".
      }

      // "Nuevo" SÓLO si no aparece con NINGUNA casa antes de su primera vez acá.
      //
      // La versión anterior marcaba nuevo a todo el que empezaba en la segunda mitad
      // del período, y daba 140 para una sola firma: pura frontera de ventana. Un
      // productor que vende cada seis meses entra y sale del recorte sin ser nuevo.
      // Exigir que tampoco esté en el resto del mercado saca a los que sólo estaban
      // fuera de foco, pero el límite queda: con ~3 meses de MAG no se puede probar
      // que alguien es nuevo de verdad. Por eso el tipo lo aclara.
      const soloConNosotros = [...suRastro.keys()].every((casaId) => casaId === magId)
      if (a.primera >= mitad && soloConNosotros) {
        nuevos.push({
          nombre: a.nombre,
          localidad: a.localidad,
          cabezas: a.cabezas,
          primeraVez: a.primera,
        })
      }
    }

    const top: ClienteTop[] = [...mios.values()]
      .sort((x, y) => y.cabezas - x.cabezas)
      .slice(0, 10)
      .map((c) => ({
        nombre: c.nombre,
        localidad: c.localidad,
        cabezas: c.cabezas,
        consignaciones: c.fechas.size,
        pctDelVolumen: cabezasTotales > 0 ? Number(((c.cabezas / cabezasTotales) * 100).toFixed(1)) : 0,
      }))

    const concentracionTop5 = Number(
      top.slice(0, 5).reduce((a, c) => a + c.pctDelVolumen, 0).toFixed(1),
    )

    return {
      slug,
      dias,
      totalClientes: mios.size,
      // Primero los que más cabezas mueven: si hay que llamar a cinco, esos cinco.
      enRiesgo: enRiesgo.sort((a, b) => b.cabezas - a.cabezas),
      nuevos: nuevos.sort((a, b) => b.cabezas - a.cabezas),
      ganados: ganados.sort((a, b) => b.cabezas - a.cabezas),
      top,
      concentracionTop5,
      cabezas: cabezasTotales,
    }
  } catch (e) {
    console.error('[cartera] falló:', e)
    return null
  }
}
