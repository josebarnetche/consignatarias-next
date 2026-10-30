/**
 * Los números de /admin/agente, calculados sin red para poder testearlos.
 *
 * La pregunta que contesta el tablero es una sola: ¿cuánta comisión hay en
 * juego y qué la está frenando? Por eso la plata se separa en tres capas:
 *  · potencial: 1% del bruto estimado de cada caso vivo (cabezas × peso de
 *    referencia × INMAG, la misma estimación que usa el formulario);
 *  · en juego: los casos ya presentados, donde las partes negocian solas;
 *  · cerrada: lo que las partes informaron como operación concretada.
 *
 * Los casos que no son de hacienda (`datos.tipo`: campo, arrendamiento,
 * tasación) no tienen cabezas: se resumen por superficie, aptitud y zona, y no
 * cuentan como "sin cabezas". La venta de campo lleva aparte una comisión en USD
 * que es un ESTIMADO INTERNO (2,4% de ha × USD/ha de referencia de la provincia,
 * tipos.ts): nunca se pactó ni se le dice a nadie, y no se suma a la plata en pesos.
 */
import { estimateOperation } from '@/lib/leads/routing'
import { resumenHacienda } from './mensajes'
import { usdHaTipico } from './por-tipo'
import { TIPOS, type TipoOperacion } from './tipos'
import { MAX_TANDAS, type DatosHacienda, type EstadoCaso, type Lado } from './reglas'

/** Lo que guarda `agente_casos.datos`: hacienda (sin `tipo`, los viejos) o un caso de campo. */
export interface DatosTablero extends DatosHacienda {
  tipo?: TipoOperacion | null
  hectareas?: number | null
  aptitud?: string | null
  plazo?: string | null
}

export interface CasoFila {
  lead_id: number
  lado: Lado
  estado: EstadoCaso
  datos: DatosTablero
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

/** Comisión estimada de un caso de hacienda, o null si no hay cabezas para estimar. */
export function comisionEstimada(d: DatosHacienda): number | null {
  return estimateOperation({ headCount: d.cabezas ?? null, category: d.categoria ?? null }).feeArs
}

/** Tipo de operación del caso. Los casos viejos no tienen `tipo`: son de hacienda. */
export function tipoCaso(d: DatosTablero | null | undefined): TipoOperacion {
  return d?.tipo ?? 'hacienda'
}

/**
 * El caso en una línea para el tablero. Hacienda: cabezas, categoría y zona.
 * Lo demás: tipo, superficie, aptitud y zona ("Venta de campo · 900 ha · ganadera · Azul, Buenos Aires").
 */
export function resumenCaso(d: DatosTablero): string {
  const tipo = tipoCaso(d)
  if (tipo === 'hacienda') return resumenHacienda(d)
  const lugar = [d.zona, d.provincia].filter((x) => x?.trim()).filter((v, i, a) => a.indexOf(v) === i).join(', ')
  return [
    TIPOS[tipo].label,
    d.hectareas ? `${Math.round(d.hectareas).toLocaleString('es-AR')} ha` : 'ha s/d',
    d.aptitud?.trim().toLowerCase() || 'aptitud s/d',
    lugar || 'zona s/d',
  ].join(' · ')
}

/**
 * Comisión de una venta de campo en USD: ESTIMADO INTERNO para ordenar y dimensionar,
 * no una condición pactada (el mail a la consignataria no menciona comisión).
 * null si no es venta de campo o faltan las hectáreas.
 */
export function comisionCampoUsd(d: DatosTablero): number | null {
  if (tipoCaso(d) !== 'campo' || !d.hectareas || d.hectareas <= 0) return null
  const usdHa = usdHaTipico(d.provincia)
  const pct = TIPOS.campo.comisionPct
  if (!usdHa || pct == null) return null
  return Math.round((d.hectareas * usdHa * pct) / 100)
}

const ACEPTADAS = ['acepto', 'presentada', 'cerrada', 'caida']
const PENDIENTES = ['enviada', 'sin_respuesta']

export interface Tablero {
  porEstado: Record<EstadoCaso, number>
  /**
   * sinEstimar: casos de HACIENDA sin cabezas. campoUsd: comisión ESTIMADA (interna)
   * de las ventas de campo vivas, en USD, aparte de los pesos.
   */
  plata: { potencial: number; enJuego: number; cerrada: number; sinEstimar: number; campoUsd: number; campos: number }
  ofertas: { enviadas: number; respondidas: number; aceptadas: number; rechazos: number; sinRespuesta: number; esperando: number; tasaRespuesta: number | null }
  /** Casos vivos ordenados por plata: lo primero que hay que mirar. */
  vivos: Array<
    CasoFila & {
      tipo: TipoOperacion
      /** Pesos, solo hacienda. */
      comision: number | null
      /** USD, solo venta de campo: ESTIMADO interno, nunca pactado. */
      comisionUsd: number | null
      ofertas: number
      respondidas: number
      /** Ofertas que esperan respuesta (enviada o sin_respuesta). */
      pendientes: number
      /** Ofertas con ACEPTO escrito (o ya presentadas / cerradas). */
      aceptadas: number
    }
  >
}

export function armarTablero(casos: CasoFila[], ofertas: OfertaFila[]): Tablero {
  const porEstado = Object.fromEntries(ORDEN_ESTADOS.map((e) => [e, 0])) as Record<EstadoCaso, number>
  const plata = { potencial: 0, enJuego: 0, cerrada: 0, sinEstimar: 0, campoUsd: 0, campos: 0 }
  const vivos: Tablero['vivos'] = []
  const porLead = new Map<number, OfertaFila[]>()
  for (const o of ofertas) porLead.set(o.lead_id, [...(porLead.get(o.lead_id) ?? []), o])

  for (const c of casos) {
    porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1
    if (!ACTIVOS.includes(c.estado)) continue
    // Los casos a mano no entran en la cuenta: el #48 son 300 cabezas POR DÍA de un servicio de faena.
    const aMano = c.estado === 'escalado'
    const tipo = tipoCaso(c.datos)
    const hacienda = tipo === 'hacienda'
    const comision = aMano || !hacienda ? null : comisionEstimada(c.datos)
    const comisionUsd = comisionCampoUsd(c.datos)
    if (hacienda && !aMano && comision == null) plata.sinEstimar++
    else if (comision != null && c.estado === 'presentado') plata.enJuego += comision
    else if (comision != null) plata.potencial += comision
    if (tipo === 'campo' && !aMano) {
      plata.campos++
      plata.campoUsd += comisionUsd ?? 0
    }
    const os = porLead.get(c.lead_id) ?? []
    vivos.push({
      ...c,
      tipo,
      comision,
      comisionUsd,
      ofertas: os.length,
      respondidas: os.filter((o) => o.respondida_at).length,
      pendientes: os.filter((o) => PENDIENTES.includes(o.estado)).length,
      aceptadas: os.filter((o) => ACEPTADAS.includes(o.estado)).length,
    })
  }
  for (const o of ofertas) if (o.estado === 'cerrada') plata.cerrada += o.cierre?.comision_ars ?? 0

  const respondidas = ofertas.filter((o) => o.respondida_at).length
  const tablero: Tablero = {
    porEstado,
    plata,
    ofertas: {
      enviadas: ofertas.length,
      respondidas,
      aceptadas: ofertas.filter((o) => ACEPTADAS.includes(o.estado)).length,
      rechazos: ofertas.filter((o) => o.estado === 'rechazo').length,
      sinRespuesta: ofertas.filter((o) => o.estado === 'sin_respuesta').length,
      esperando: ofertas.filter((o) => o.estado === 'enviada').length,
      tasaRespuesta: ofertas.length ? respondidas / ofertas.length : null,
    },
    // Pesos primero (hacienda); después las ventas de campo por su estimado en USD.
    vivos: vivos.sort((a, b) => (b.comision ?? -1) - (a.comision ?? -1) || (b.comisionUsd ?? -1) - (a.comisionUsd ?? -1)),
  }
  return tablero
}

/** "tanda 2/3" para un caso que se está ofreciendo; '' si no corresponde. */
export function tandaLabel(c: Pick<CasoFila, 'estado' | 'tandas'>): string {
  return c.estado === 'ofreciendo' ? `tanda ${Math.min(c.tandas ?? 0, MAX_TANDAS)}/${MAX_TANDAS}` : ''
}

/** Qué va a pasar después con un caso, en palabras. */
export function proximoPaso(c: Pick<CasoFila, 'estado' | 'proximo_at'> & { datos?: DatosTablero | null }, ahora = new Date()): string {
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
      // La venta de campo no tiene seguimiento automático (motor.ts): lo sigue José.
      return tipoCaso(c.datos) === 'hacienda' ? 'seguimiento de la presentación' : 'presentado: lo seguís vos'
    case 'escalado':
      return 'lo llevás vos'
    default:
      return ''
  }
}

/**
 * Lo que se le dice por WhatsApp al productor/dueño del caso. Un caso de campo
 * no habla de cabezas ni de hacienda.
 */
export function guionLlamada(c: Pick<CasoFila, 'estado' | 'lado' | 'datos'>, saludo: string): string {
  const tipo = tipoCaso(c.datos)
  if (c.estado === 'presentado') return `${saludo}, te escribo de consignatarias.com. ¿Pudiste hablar con la contraparte que te presentamos? ¿Avanzaron?`
  if (tipo === 'hacienda') {
    return c.estado === 'pidiendo_datos'
      ? `${saludo}, te escribo de consignatarias.com por la hacienda que cargaste. Para ofrecerla me falta saber cuántas cabezas son, la categoría y la zona. ¿Me lo pasás por acá?`
      : `${saludo}, te escribo de consignatarias.com. Estamos ofreciendo tu ${c.lado === 'vende' ? 'hacienda' : 'pedido de compra'} (${resumenHacienda(c.datos)}). ¿Sigue en pie? ¿Tenés un precio de referencia o una fecha?`
  }
  if (tipo === 'tasacion') return `${saludo}, te escribo de consignatarias.com por la tasación de tu campo. ¿La querés para vender o para arrendar?`
  const que = tipo === 'arrendamiento' ? 'el arrendamiento que consultaste' : 'el campo que cargaste'
  return c.estado === 'pidiendo_datos'
    ? `${saludo}, te escribo de consignatarias.com por ${que}. Me falta saber cuántas hectáreas son, la aptitud (ganadera, agrícola, mixta) y la zona. ¿Me lo pasás por acá?`
    : `${saludo}, te escribo de consignatarias.com. Estamos ofreciendo tu campo a consignatarias de la zona. ¿Sigue en venta?`
}
