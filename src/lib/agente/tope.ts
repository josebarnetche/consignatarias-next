/**
 * Tope diario de correos proactivos por dirección (propuesta del 30-10-2026).
 *
 * La regla «a nadie dos veces en el mismo día» vivía solo en las ofertas
 * (`agente_ofertas.enviada_at`). El 22-10 una misma persona recibió tres correos
 * en un día: una oferta, una presentación y un pedido de datos de su propio caso.
 * Este módulo pone el tope sobre TODO lo que manda el agente, leyendo el log
 * (`agente_mensajes`), que es lo único que registra cada salida sea del tipo que sea.
 *
 * La regla: a una dirección no le sale un correo PROACTIVO si en las últimas 24 h
 * (ventana móvil) ya recibió TOPE_PROACTIVOS_24H correos del agente, de cualquier
 * plantilla. Lo que no sale se difiere (el llamador mueve `proximo_at` a `hasta`),
 * nunca se descarta.
 *
 * No cuentan como proactivos:
 *  · las plantillas de PLANTILLAS_EXENTAS: confirmación de BAJA, presentación tras un
 *    ACEPTO escrito, y lo que se manda dentro de una conversación que alguien acaba
 *    de abrir y que no tiene cola donde esperar (traslados, aviso de comisión);
 *  · la respuesta directa: esa persona escribió en ESE caso después del último
 *    correo que le mandamos (una respuesta por mensaje recibido, no un pase libre).
 *
 * Los exentos sí ocupan la ventana: después de una presentación, el pedido de datos
 * de otro caso espera al día siguiente. Es exactamente el caso del 22-10.
 *
 * Puro (sin red ni base) para que cada borde tenga su test.
 */
import { DIA_MS } from './reglas'

/** Correos del agente que puede recibir una dirección en 24 h antes de que lo proactivo espere. */
export const TOPE_PROACTIVOS_24H = 1

/** Plantillas que nunca esperan, con el porqué. Toda plantilla que no está acá es proactiva. */
export const PLANTILLAS_EXENTAS: Readonly<Record<string, string>> = {
  baja: 'confirmación de BAJA',
  presentacion: 'presentación tras un ACEPTO escrito',
  presentacion_campo: 'presentación tras un ACEPTO escrito (campo, PR #110)',
  traslado_contraparte: 'respuesta a la pregunta que hizo la contraparte',
  traslado_productor: 'pregunta de la contraparte en curso: no tiene cola, diferirla la perdería',
  aviso_comision: 'aviso tras un cierre informado por escrito: no tiene cola, diferirlo lo perdería',
}

/** Una fila del log `agente_mensajes`, lo mínimo que hace falta. */
export interface MensajeLog {
  dir: 'in' | 'out'
  /** Remitente (para los entrantes). */
  de: string | null
  /** Destinatarios separados por coma (para los salientes). */
  para: string | null
  lead_id: number | null
  creado_at: string
}

export type Veredicto =
  | { ok: true; por: 'exenta' | 'respuesta' | 'libre'; motivo: string }
  | { ok: false; hasta: Date; motivo: string }

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
const destinatarios = (para: string | null) => norm(para).split(/[,;\s]+/).filter(Boolean)

export function esExenta(plantilla: string): boolean {
  return Object.prototype.hasOwnProperty.call(PLANTILLAS_EXENTAS, plantilla)
}

/**
 * ¿Puede salir ahora este correo a esta dirección?
 * `mensajes24h` puede traer filas más viejas: se filtran por la ventana.
 */
export function puedeMandarProactivo(
  email: string,
  mensajes24h: readonly MensajeLog[],
  plantilla: string,
  opts: { ahora: Date; leadId?: number | null; tope?: number },
): Veredicto {
  if (esExenta(plantilla)) return { ok: true, por: 'exenta', motivo: PLANTILLAS_EXENTAS[plantilla] }
  const e = norm(email)
  const tope = Math.max(1, opts.tope ?? TOPE_PROACTIVOS_24H)
  const desde = opts.ahora.getTime() - DIA_MS
  const en = (m: MensajeLog) => {
    const t = new Date(m.creado_at).getTime()
    return Number.isFinite(t) && t > desde && t <= opts.ahora.getTime() ? t : null
  }

  const salidas: number[] = []
  let ultimaEntradaDelCaso = -Infinity
  for (const m of mensajes24h) {
    const t = en(m)
    if (t === null) continue
    if (m.dir === 'out' && destinatarios(m.para).includes(e)) salidas.push(t)
    if (m.dir === 'in' && norm(m.de) === e && opts.leadId != null && m.lead_id === opts.leadId) ultimaEntradaDelCaso = Math.max(ultimaEntradaDelCaso, t)
  }
  const ultimaSalida = salidas.length ? Math.max(...salidas) : -Infinity

  // Escribió en este caso después de lo último que le mandamos: contestarle no es insistir.
  if (ultimaEntradaDelCaso > ultimaSalida) return { ok: true, por: 'respuesta', motivo: 'responde a lo que escribió en este caso' }

  if (salidas.length < tope) return { ok: true, por: 'libre', motivo: 'sin correos del agente en 24 h' }

  // Ventana móvil: se libera cuando el tope-ésimo correo más reciente cumple 24 h.
  salidas.sort((a, b) => b - a)
  const hasta = new Date(salidas[tope - 1] + DIA_MS)
  return { ok: false, hasta, motivo: `ya recibió ${salidas.length} correo(s) del agente en 24 h` }
}

/**
 * Lo mismo para un correo con varios destinatarios (el seguimiento va a las dos
 * partes): sale entero o espera entero, hasta que se libere el último.
 */
export function topeParaTodos(
  para: readonly string[],
  mensajes24h: readonly MensajeLog[],
  plantilla: string,
  opts: { ahora: Date; leadId?: number | null; tope?: number },
): { ok: true } | { ok: false; hasta: Date; motivo: string } {
  let peor: { hasta: Date; motivo: string } | null = null
  for (const p of para) {
    const v = puedeMandarProactivo(p, mensajes24h, plantilla, opts)
    if (!v.ok && (!peor || v.hasta > peor.hasta)) peor = { hasta: v.hasta, motivo: `${norm(p)}: ${v.motivo}` }
  }
  return peor ? { ok: false, ...peor } : { ok: true }
}
