/**
 * Techo de extracción para las tools de LISTADO del MCP.
 *
 * QUÉ PROBLEMA RESUELVE. El de-gateo del 03-10-2026 sacó el cupo de las tools de
 * consulta, que era lo correcto: una valuación o el índice del día no se le
 * racionan a nadie. Pero las tools de *directorio* son otra cosa — `list_remates`,
 * `buscar_consignataria`, `buscar_frigorifico` y `actividad_consignatarias`
 * devuelven filas de una base, y pedidas en serie devuelven la base entera.
 *
 * Entre el 16 y el 22 de septiembre de 2026, una sola IP hizo 1.451 llamadas
 * barriendo exactamente eso: 598 búsquedas de consignatarias (incluyendo
 * `query: ""`, que es "dame todo") y 317 ventanas de fecha sobre la actividad del
 * MAG. Resultó ser un banco de pruebas y no un competidor, pero el agujero es el
 * mismo para cualquiera.
 *
 * POSTURA ELEGIDA: VIDRIERA (decisión de José, 07-10-2026). Quien barría resultó
 * ser **MCP-Bench**, un banco de pruebas académico que mide agentes contra ~28
 * servidores MCP reales y que nos eligió como uno de ellos. Sus tareas enumeran
 * por diseño —buscan con nombres truncados y erratas (`rango`, `ango`, `r`) para
 * medir recuperación difusa—, así que cerrar la enumeración nos sacaba del
 * benchmark. Entre proteger un directorio que de todos modos es público y quedar
 * en la vitrina donde nos descubren, se eligió la vitrina.
 *
 * QUÉ QUEDA ENTONCES. Sólo un tope por IP y por día, alto: frena la extracción
 * industrial sostenida y no toca ni a un benchmark ni a una persona. **No es una
 * defensa real** y conviene no creer que lo es: las IPs son baratas y rotan, y
 * quien quiera la base la va a juntar igual. Lo que de verdad protegería es
 * cerrar la enumeración —poner `ENUMERACION_ABIERTA = false`—, y eso está a un
 * booleano de distancia el día que el benchmark deje de importar.
 *
 * LO QUE NUNCA SE TOCÓ. El que busca una firma por nombre, un frigorífico por
 * CUIT o los remates de su provincia no se entera de que esto existe.
 */

import { enforceRateLimit, clientIp } from '@/lib/rate-limit-db'

/**
 * ¿Se puede pedir "dame la lista" sin credencial? En `true` el servidor queda
 * apto para benchmarks y exploradores; en `false` hay que saber a quién buscás y
 * el barrido se vuelve inviable. Es la única perilla que importa.
 */
export const ENUMERACION_ABIERTA = true

/** Filas por llamada sin credencial. En modo vidriera, el tope propio de cada tool. */
export const FILAS_ANONIMAS = 50

/**
 * Llamadas de listado por IP, por día y por tool. Alto a propósito: una corrida
 * de MCP-Bench hizo 1.051 llamadas en un día y tiene que pasar entera.
 */
export const LLAMADAS_DIA_ANONIMAS = 2000

/** Ventana máxima, en días, para la actividad del MAG sin credencial. */
export const VENTANA_MAX_DIAS = 365

export interface Veredicto {
  /** Filas que se pueden devolver en esta llamada. */
  limite: number
  /** Si no es null, hay que cortar con este texto. */
  corte: string | null
}

const PEDI_KEY =
  'Para listados amplios hace falta una API key: escribinos a agro@memola.com.ar ' +
  'o mirá los planes en https://www.consignatarias.com.ar/enterprise. ' +
  'Sin key podés buscar lo que necesites por nombre, CUIT o provincia, sin cupo por consulta.'

/**
 * Aplica el techo a una tool de listado.
 *
 * `enumera` es verdadero cuando la llamada no acota a nada —query vacío y sin
 * provincia—, que es la forma que necesita un barrido y que ningún usuario real
 * escribe.
 */
export async function techoListado(opts: {
  tool: string
  req: Request
  autorizado: boolean
  pedido: number | undefined
  tope: number
  porDefecto: number
  enumera?: boolean
}): Promise<Veredicto> {
  const { tool, req, autorizado, pedido, tope, porDefecto, enumera } = opts

  const pedidoValido =
    typeof pedido === 'number' && Number.isFinite(pedido) && pedido > 0 ? pedido : porDefecto

  if (autorizado) return { limite: Math.min(pedidoValido, tope), corte: null }

  if (enumera && !ENUMERACION_ABIERTA) {
    return {
      limite: 0,
      corte: `Esta consulta pide el listado completo, y eso va con credencial.\n\n${PEDI_KEY}`,
    }
  }

  const rl = await enforceRateLimit({
    action: `mcp_listado:${tool}`,
    identity: `ip:${clientIp(req)}`,
    limit: LLAMADAS_DIA_ANONIMAS,
    windowSeconds: 86_400,
  })
  if (!rl.ok) {
    const horas = Math.ceil(rl.retryAfter / 3600)
    return {
      limite: 0,
      corte:
        `Llegaste al tope diario de listados sin credencial (${LLAMADAS_DIA_ANONIMAS} por día). ` +
        `Se renueva en ${horas} h.\n\n${PEDI_KEY}`,
    }
  }

  return { limite: Math.min(pedidoValido, FILAS_ANONIMAS), corte: null }
}

/**
 * Recorta la ventana de fechas de la actividad del MAG para quien no tiene
 * credencial. Barrer ventana por ventana es como se reconstruye la serie
 * completa, que es justamente lo que se vende.
 */
export function ventanaAcotada(
  desde: string,
  hasta: string,
  autorizado: boolean,
): { desde: string; nota: string | null } {
  if (autorizado) return { desde, nota: null }
  const d = new Date(desde)
  const h = new Date(hasta)
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return { desde, nota: null }
  const dias = Math.round((h.getTime() - d.getTime()) / 86_400_000)
  if (dias <= VENTANA_MAX_DIAS) return { desde, nota: null }
  const recortado = new Date(h.getTime() - VENTANA_MAX_DIAS * 86_400_000)
    .toISOString()
    .slice(0, 10)
  return {
    desde: recortado,
    nota:
      `Ventana recortada a ${VENTANA_MAX_DIAS} días (pediste ${dias}). ` +
      `La serie larga de actividad va con credencial — ${PEDI_KEY}`,
  }
}
