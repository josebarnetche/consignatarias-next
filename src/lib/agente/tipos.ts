/**
 * Tipos de operación que el agente cerrador puede trabajar (noche del 21-10-2026).
 *
 * El agente nació para hacienda bovina (v1.235.0). Los leads que entran por el
 * sitio son de más tipos: arrendamientos (busco/ofrezco campo), venta de campos y
 * tasaciones. Este registro es la única fuente de qué se puede hacer con cada uno,
 * y es puro (sin red ni base) para que cada regla tenga su test.
 *
 * REGLA DURA: solo sale a contrapartes un tipo cuya comisión definió José.
 *  · HACIENDA (19-10-2026): 1% del bruto, a cargo de quien recibe el contacto.
 *  · ARRENDAMIENTO (21-10-2026): un mes de canon completo es la referencia de
 *    mercado; se ofrece con 20% off → 0,8 de un mes de canon. Se presenta como
 *    servicio cerrado ("llave en mano"), con el software trabajando atrás.
 *  · CAMPO (venta) y TASACIÓN: sin comisión definida → se calculan, no salen.
 * Inventar una comisión y mandarla por mail sería comprometer a la empresa con
 * una condición que nadie aprobó.
 */

export type TipoOperacion = 'hacienda' | 'arrendamiento' | 'campo' | 'tasacion'

export interface ConfigTipo {
  tipo: TipoOperacion
  label: string
  /** Lo mínimo para poder ofrecer. Sin esto nadie contesta. */
  datosMinimos: readonly string[]
  /** A quién se le ofrece del otro lado. */
  contrapartes: readonly string[]
  /** % sobre el bruto de referencia. null = no se cobra por % del bruto. */
  comisionPct: number | null
  /** Comisión en meses de canon (arrendamiento), ya con el descuento aplicado. */
  comisionMesesCanon?: number
  /** Sobre qué se calcula la comisión, en palabras. */
  baseComision: string
  /** El primer paso del agente con un lead nuevo de este tipo. */
  primerPaso: 'pedir_datos' | 'calificar'
  /** Bloqueo legal: mientras exista, el tipo NO sale a contrapartes aunque tenga comisión. */
  bloqueoLegal?: string
}

/** Lo que cobra el mercado por un arrendamiento: un mes de canon (José, 21-10-2026). */
export const MESES_CANON_REFERENCIA = 1
/** Descuento contra esa referencia: es el argumento de venta del servicio cerrado. */
export const DESCUENTO_ARRENDAMIENTO = 0.2

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
    comisionMesesCanon: MESES_CANON_REFERENCIA * (1 - DESCUENTO_ARRENDAMIENTO),
    baseComision: 'un mes de canon con 20% off (0,8 meses; canon = ha × kg de novillo/ha/mes × precio)',
    primerPaso: 'pedir_datos',
    // Investigación del 21-10-2026 (docs/agente/investigacion-inmobiliaria-rural.md):
    // CCyC art. 1351 — en locaciones de inmuebles la intermediación solo la puede
    // hacer un profesional matriculado; art. 1346 — sin habilitación no hay derecho
    // a comisión. Hasta que José defina el circuito (corredor matriculado que cobra
    // y factura, o cobro por software/publicación), esto no sale.
    bloqueoLegal:
      'cobrar comisión por un arrendamiento exige corredor matriculado en la provincia del campo (CCyC arts. 1346 y 1351)',
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

/** ¿Tiene este tipo una comisión definida por José? */
export function tieneComision(tipo: TipoOperacion): boolean {
  const c = TIPOS[tipo]
  return c.comisionPct != null || (c.comisionMesesCanon ?? 0) > 0
}

/** ¿Puede este tipo salir a contrapartes? Solo con una comisión definida por José. */
export function enviaAContrapartes(tipo: TipoOperacion): boolean {
  return tieneComision(tipo) && !TIPOS[tipo].bloqueoLegal && TIPOS[tipo].contrapartes.length > 0
}

/** Comisión de un arrendamiento sobre el canon anual: 0,8 de un mes. */
export function comisionArrendamiento(canonAnualArs: number): number {
  return Math.round((canonAnualArs / 12) * (TIPOS.arrendamiento.comisionMesesCanon ?? 0))
}

/** Lo que cobraría el mercado (un mes completo): para mostrar el ahorro, nunca para cobrar. */
export function comisionArrendamientoMercado(canonAnualArs: number): number {
  return Math.round((canonAnualArs / 12) * MESES_CANON_REFERENCIA)
}

/**
 * Escala legal de la comisión de un arrendamiento rural, como fracción del VALOR
 * TOTAL del contrato (canon anual × años), sumando las dos partes. Investigación
 * del 22-10-2026 (docs/agente/decisiones-2026-10-22-siocal-arrendamiento-campos.md):
 *  · Buenos Aires, Ley 10.973 art. 54: 1%–2% por parte, mínimo y máximo obligatorios.
 *  · Córdoba, Ley 9445 art. 25: escala supletoria del 5%.
 *  · Santa Fe: libre pacto; tabla del colegio de Rosario 3% + 3%.
 *  · El resto, sin escala rural verificada: tope interno del 4% hasta confirmarla.
 * Solo para VALUAR en el tablero: los 0,8 meses siguen siendo la referencia
 * comercial y quién cobra (corredor matriculado) sigue siendo decisión de José.
 */
export const ESCALA_ARRENDAMIENTO: Record<string, { piso: number; tope: number }> = {
  'buenos aires': { piso: 0.02, tope: 0.04 },
  cordoba: { piso: 0, tope: 0.05 },
  'santa fe': { piso: 0, tope: 0.06 },
}
export const ESCALA_ARRENDAMIENTO_DEFAULT = { piso: 0, tope: 0.04 }
/** Plazo mínimo legal del arrendamiento rural (Ley 13.246, art. 4): se usa si el lead no trae el suyo. */
export const PLAZO_ARRENDAMIENTO_DEFAULT_ANIOS = 3

function sinAcentos(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function escalaArrendamiento(provincia: string | null | undefined) {
  return ESCALA_ARRENDAMIENTO[sinAcentos(provincia ?? '')] ?? ESCALA_ARRENDAMIENTO_DEFAULT
}

/**
 * Años del contrato a partir del texto libre que contestó el lead ("3 años", "2 campañas",
 * "18 meses"). null si no se entiende: entonces vale el mínimo legal.
 */
export function plazoEnAnios(texto: string | null | undefined): number | null {
  const t = sinAcentos(texto ?? '')
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(anos?|campanas?|meses?)/)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  if (!(n > 0)) return null
  const anios = m[2].startsWith('mes') ? n / 12 : n
  return anios > 0 && anios <= 20 ? anios : null
}

/**
 * Comisión de un arrendamiento que la ley deja cobrar: los 0,8 meses de canon,
 * llevados dentro del piso y el tope de la provincia sobre el valor del contrato.
 * Ej. Buenos Aires: 1 año → 0,48 meses (tope 4%); 3 años → 0,8; 5 años → 1,2 (piso 2%).
 */
export function comisionArrendamientoLegal(canonAnualArs: number, o: { provincia?: string | null; plazoAnios?: number | null } = {}): number {
  const anios = o.plazoAnios && o.plazoAnios > 0 ? o.plazoAnios : PLAZO_ARRENDAMIENTO_DEFAULT_ANIOS
  const valor = canonAnualArs * anios
  const { piso, tope } = escalaArrendamiento(o.provincia)
  const base = comisionArrendamiento(canonAnualArs)
  return Math.round(Math.min(Math.max(base, piso * valor), tope * valor))
}

export interface LeadParaValuar {
  intent: string
  head_count?: number | null
  category?: string | null
  hectareas?: number | null
  /** kg de novillo por ha por mes, si el lead o el campo lo traen. */
  kg_ha_mes?: number | null
  /** Para el tope legal del arrendamiento. */
  provincia?: string | null
  /** Plazo del contrato en años, si se sabe (`plazoEnAnios`). */
  plazoAnios?: number | null
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

  let comision: number | null = null
  if (bruto != null) {
    if (tipo === 'arrendamiento') comision = comisionArrendamientoLegal(bruto, { provincia: l.provincia, plazoAnios: l.plazoAnios })
    else if (pct != null) comision = Math.round((bruto * pct) / 100)
    else motivo = 'comisión de este tipo sin definir por José'
  }
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
