/**
 * Los números de /admin/agente, calculados sin red para poder testearlos.
 *
 * La pregunta que contesta el tablero es una sola: ¿cuánta comisión hay en
 * juego y qué la está frenando? Por eso la plata se separa en tres capas:
 *  · potencial: 1% del bruto estimado de cada caso vivo (cabezas × peso de
 *    referencia × INMAG, la misma estimación que usa el formulario);
 *  · en juego: los casos ya presentados, donde las partes negocian solas;
 *  · cerrada: lo que las partes informaron como operación concretada.
 */
import { estimateOperation } from '@/lib/leads/routing'
import type { DatosHacienda, EstadoCaso, Lado } from './reglas'

export interface CasoFila {
  lead_id: number
  lado: Lado
  estado: EstadoCaso
  datos: DatosHacienda
  motivo: string | null
  tandas: number
  proximo_at: string
  actualizado_at: string
}

export interface OfertaFila {
  lead_id: number
  tipo: string
  nombre: string
  estado: string
  enviada_at: string
  respondida_at: string | null
  cierre: { comision_ars?: number | null; bruto_ars?: number | null } | null
}

export const ACTIVOS: EstadoCaso[] = ['nuevo', 'pidiendo_datos', 'ofreciendo', 'presentado', 'escalado']
export const ORDEN_ESTADOS: EstadoCaso[] = ['nuevo', 'pidiendo_datos', 'ofreciendo', 'presentado', 'escalado', 'cerrado', 'sin_contraparte', 'dormido', 'retirado', 'descartado']

export const ESTADO_LABEL: Record<EstadoCaso, string> = {
  nuevo: 'Nuevo',
  pidiendo_datos: 'Pidiendo datos',
  ofreciendo: 'Ofreciendo',
  presentado: 'Presentado',
  escalado: 'A mano (José)',
  cerrado: 'Cerrado',
  sin_contraparte: 'Sin contraparte',
  dormido: 'Dormido',
  retirado: 'Retirado',
  descartado: 'Descartado',
}

/** Comisión estimada de un caso, o null si no hay cabezas para estimar. */
export function comisionEstimada(d: DatosHacienda): number | null {
  return estimateOperation({ headCount: d.cabezas ?? null, category: d.categoria ?? null }).feeArs
}

export interface Tablero {
  porEstado: Record<EstadoCaso, number>
  plata: { potencial: number; enJuego: number; cerrada: number; sinEstimar: number }
  ofertas: { enviadas: number; respondidas: number; aceptadas: number; rechazos: number; sinRespuesta: number; esperando: number; tasaRespuesta: number | null }
  /** Casos vivos ordenados por plata: lo primero que hay que mirar. */
  vivos: Array<CasoFila & { comision: number | null; ofertas: number; respondidas: number }>
}

export function armarTablero(casos: CasoFila[], ofertas: OfertaFila[]): Tablero {
  const porEstado = Object.fromEntries(ORDEN_ESTADOS.map((e) => [e, 0])) as Record<EstadoCaso, number>
  const plata = { potencial: 0, enJuego: 0, cerrada: 0, sinEstimar: 0 }
  const vivos: Tablero['vivos'] = []
  const porLead = new Map<number, OfertaFila[]>()
  for (const o of ofertas) porLead.set(o.lead_id, [...(porLead.get(o.lead_id) ?? []), o])

  for (const c of casos) {
    porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1
    if (!ACTIVOS.includes(c.estado)) continue
    // Los casos a mano no entran en la cuenta: el #48 son 300 cabezas POR DÍA de un servicio de faena.
    const aMano = c.estado === 'escalado'
    const comision = aMano ? null : comisionEstimada(c.datos)
    if (!aMano && comision == null) plata.sinEstimar++
    else if (comision != null && c.estado === 'presentado') plata.enJuego += comision
    else if (comision != null) plata.potencial += comision
    const os = porLead.get(c.lead_id) ?? []
    vivos.push({ ...c, comision, ofertas: os.length, respondidas: os.filter((o) => o.respondida_at).length })
  }
  for (const o of ofertas) if (o.estado === 'cerrada') plata.cerrada += o.cierre?.comision_ars ?? 0

  const respondidas = ofertas.filter((o) => o.respondida_at).length
  const tablero: Tablero = {
    porEstado,
    plata,
    ofertas: {
      enviadas: ofertas.length,
      respondidas,
      aceptadas: ofertas.filter((o) => ['acepto', 'presentada', 'cerrada', 'caida'].includes(o.estado)).length,
      rechazos: ofertas.filter((o) => o.estado === 'rechazo').length,
      sinRespuesta: ofertas.filter((o) => o.estado === 'sin_respuesta').length,
      esperando: ofertas.filter((o) => o.estado === 'enviada').length,
      tasaRespuesta: ofertas.length ? respondidas / ofertas.length : null,
    },
    vivos: vivos.sort((a, b) => (b.comision ?? -1) - (a.comision ?? -1)),
  }
  return tablero
}

/** Qué va a pasar después con un caso, en palabras. */
export function proximoPaso(c: Pick<CasoFila, 'estado' | 'proximo_at'>, ahora = new Date()): string {
  const cuando = new Date(c.proximo_at)
  const dias = Math.round((cuando.getTime() - ahora.getTime()) / 86_400_000)
  const enCuanto = cuando <= ahora ? 'en la próxima corrida' : dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`
  switch (c.estado) {
    case 'nuevo':
      return `arranca ${enCuanto}`
    case 'pidiendo_datos':
      return `recordatorio ${enCuanto}`
    case 'ofreciendo':
      return `nueva tanda ${enCuanto} (antes, si aparece un cruce)`
    case 'presentado':
      return 'seguimiento de la presentación'
    case 'escalado':
      return 'lo llevás vos'
    default:
      return ''
  }
}
