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
 * LA DEFENSA REAL NO ES EL TECHO: ES QUE NO SE PUEDA ENUMERAR. Un tope por IP lo
 * esquiva cualquiera alquilando direcciones — son baratas y rotan. Lo que no se
 * esquiva es no poder preguntar "dame la lista": sin credencial hay que saber de
 * antemano a quién buscás, y entonces no hay barrido posible, tarde lo que tarde.
 * El techo diario es el cinturón; el cierre de la enumeración es el tirante.
 *
 * LO QUE NO SE TOCA. El que busca una firma por nombre, un frigorífico por CUIT o
 * los remates de su provincia pasa sin enterarse: son 25 llamadas por día y nadie
 * que esté resolviendo algo real hace más. El techo cuenta por IP y por día.
 */

import { enforceRateLimit, clientIp } from '@/lib/rate-limit-db'

/** Filas por llamada sin credencial. Alcanza para responder, no para copiar. */
export const FILAS_ANONIMAS = 5

/** Llamadas de listado por IP y por día sin credencial. */
export const LLAMADAS_DIA_ANONIMAS = 25

/** Ventana máxima, en días, para la actividad del MAG sin credencial. */
export const VENTANA_MAX_DIAS = 31

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

  if (enumera) {
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
