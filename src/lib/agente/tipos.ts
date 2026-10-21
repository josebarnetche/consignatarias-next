/**
 * Tipos de operación que el agente cerrador puede trabajar (noche del 21-10-2026).
 *
 * El agente nació para hacienda bovina (v1.235.0). Los leads que entran por el
 * sitio son de más tipos: arrendamientos (busco/ofrezco campo), venta de campos y
 * tasaciones. Este registro es la única fuente de qué se puede hacer con cada uno,
 * y es puro (sin red ni base) para que cada regla tenga su test.
 *
 * REGLA DURA: solo un tipo con `comisionPct` definido por José puede salir a
 * contrapartes. La comisión del 1% se definió para HACIENDA (19-10-2026). Para
 * arrendamiento y campos José todavía no fijó cuánto ni quién la paga, así que
 * esos tipos se calculan y se muestran, pero `enviaAContrapartes` es false hasta
 * que él lo decida. Inventar una comisión y mandarla por mail sería comprometer
 * a la empresa con una condición que nadie aprobó.
 */

export type TipoOperacion = 'hacienda' | 'arrendamiento' | 'campo' | 'tasacion'

export interface ConfigTipo {
  tipo: TipoOperacion
  label: string
  /** Lo mínimo para poder ofrecer. Sin esto nadie contesta. */
  datosMinimos: readonly string[]
  /** A quién se le ofrece del otro lado. */
  contrapartes: readonly string[]
  /** % sobre el bruto de referencia. null = José no lo definió todavía. */
  comisionPct: number | null
  /** Sobre qué se calcula la comisión, en palabras. */
  baseComision: string
  /** El primer paso del agente con un lead nuevo de este tipo. */
  primerPaso: 'pedir_datos' | 'calificar'
}

export const TIPOS: Record<TipoOperacion, ConfigTipo> = {
  hacienda: {
    tipo: 'hacienda',
    label: 'Hacienda',
    datosMinimos: ['cabezas', 'categoria', 'zona'],
    contrapartes: ['leads que compran', 'frigoríficos (solo faena)', 'firmas PRO'],
    comisionPct: 1,
    baseComision: 'bruto de la operación',
    primerPaso: 'pedir_datos',
  },
  arrendamiento: {
    tipo: 'arrendamiento',
    label: 'Arrendamiento',
    datosMinimos: ['hectareas', 'zona', 'aptitud'],
    contrapartes: ['campos publicados en /campos', 'leads que ofrecen campo', 'leads que buscan campo'],
    comisionPct: null,
    baseComision: 'canon del primer año (ha × kg de novillo/ha/mes × 12)',
    primerPaso: 'pedir_datos',
  },
  campo: {
    tipo: 'campo',
    label: 'Venta de campo',
    datosMinimos: ['hectareas', 'zona', 'aptitud'],
    contrapartes: ['leads que buscan campo', 'campos publicados en venta'],
    comisionPct: null,
    baseComision: 'precio de venta del campo',
    primerPaso: 'pedir_datos',
  },
  tasacion: {
    tipo: 'tasacion',
    label: 'Tasación',
    datosMinimos: ['hectareas', 'zona'],
    contrapartes: [],
    comisionPct: null,
    baseComision: 'no genera comisión: se califica si quiere vender o arrendar',
    primerPaso: 'calificar',
  },
}

/** Intent del formulario → tipo de operación. null = el agente no lo toma. */
export function tipoDeIntent(intent: string | null | undefined): TipoOperacion | null {
  switch ((intent ?? '').trim().toLowerCase()) {
    case 'vender':
    case 'comprar':
      return 'hacienda'
    case 'arrendar':
    case 'arrendar_busco':
    case 'arrendar_ofrezco':
      return 'arrendamiento'
    case 'busca-campo':
    case 'vender_campo':
    case 'comprar_campo':
      return 'campo'
    case 'tasar':
      return 'tasacion'
    default:
      return null
  }
}

/** ¿Puede este tipo salir a contrapartes? Solo con una comisión definida por José. */
export function enviaAContrapartes(tipo: TipoOperacion): boolean {
  const c = TIPOS[tipo]
  return c.comisionPct != null && c.contrapartes.length > 0
}

export interface LeadParaValuar {
  intent: string
  head_count?: number | null
  category?: string | null
  hectareas?: number | null
  /** kg de novillo por ha por mes, si el lead o el campo lo traen. */
  kg_ha_mes?: number | null
}

export interface Referencias {
  /** $/kg vivo del novillo de referencia (INMAG o promedio del mes anterior). */
  precioNovilloKg: number
  /** Peso de referencia por categoría para hacienda, en kg. */
  pesoKg: (categoria: string | null | undefined) => number
  /** Canon típico de la zona si el lead no trae el suyo, en kg/ha/mes. */
  kgHaMesTipico: number
}

export interface Valuacion {
  tipo: TipoOperacion
  /** Monto bruto de referencia sobre el que se calcularía la comisión. */
  brutoArs: number | null
  /** null si falta el dato o si José no definió la comisión de este tipo. */
  comisionArs: number | null
  /** Por qué no hay número, si no lo hay. */
  motivo?: string
}

/**
 * Bruto de referencia y comisión esperada de un lead, por tipo. Sirve para
 * priorizar (qué caso mover primero) y para el tablero; nunca se manda en un
 * mail como precio.
 */
export function valuarLead(l: LeadParaValuar, ref: Referencias): Valuacion | null {
  const tipo = tipoDeIntent(l.intent)
  if (!tipo) return null
  const pct = TIPOS[tipo].comisionPct
  let bruto: number | null = null
  let motivo: string | undefined

  if (tipo === 'hacienda') {
    const cab = l.head_count && l.head_count > 0 ? l.head_count : null
    if (cab) bruto = Math.round(cab * ref.pesoKg(l.category) * ref.precioNovilloKg)
    else motivo = 'faltan las cabezas'
  } else if (tipo === 'arrendamiento') {
    const ha = l.hectareas && l.hectareas > 0 ? l.hectareas : null
    const kg = l.kg_ha_mes && l.kg_ha_mes > 0 ? l.kg_ha_mes : ref.kgHaMesTipico
    if (ha) bruto = Math.round(ha * kg * 12 * ref.precioNovilloKg)
    else motivo = 'faltan las hectáreas'
  } else if (tipo === 'campo') {
    motivo = 'el valor del campo sale de la tasación por zona'
  } else {
    motivo = 'una tasación no genera comisión'
  }

  if (bruto != null && pct == null) motivo = 'comisión de este tipo sin definir por José'
  const comision = bruto != null && pct != null ? Math.round((bruto * pct) / 100) : null
  return { tipo, brutoArs: bruto, comisionArs: comision, ...(motivo ? { motivo } : {}) }
}

/**
 * Probabilidad de cierre por estado del caso, para ordenar por plata esperada.
 * No es una predicción: es un orden. Un caso presentado vale más que uno nuevo
 * con el mismo bruto porque ya hay dos partes hablando.
 */
export const PESO_ESTADO: Record<string, number> = {
  nuevo: 0.05,
  pidiendo_datos: 0.05,
  ofreciendo: 0.15,
  presentado: 0.4,
  escalado: 0.3,
}

/** Comisión × peso del estado. 0 si no hay comisión calculable. */
export function prioridad(v: Valuacion | null, estado: string): number {
  if (!v?.comisionArs) return 0
  return Math.round(v.comisionArs * (PESO_ESTADO[estado] ?? 0))
}
