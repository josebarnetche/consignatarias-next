/**
 * Las reglas del agente que trabaja los leads de hacienda hasta el cierre.
 *
 * Nació el 19-10-2026, cuando José pidió «que puedas cerrar operaciones por tu
 * cuenta, no puedo supervisarlas»: el digest diario decía qué lead llevaba más
 * días esperando, pero nadie lo trabajaba. Este archivo es puro (sin red ni base)
 * para que cada límite tenga su test.
 *
 * LO QUE JOSÉ DEFINIÓ (19-10-2026):
 *  · Comisión: 1% del bruto de la operación concretada, a cargo de quien recibe
 *    el contacto (el comprador, o la firma que toma la hacienda o al comprador).
 *    El contacto del productor se entrega recién cuando la contraparte ACEPTA
 *    por escrito. Ese texto queda guardado como constancia.
 *  · El agente hace todo menos acordar precio y firmar: pregunta datos, busca
 *    contraparte, ofrece, presenta y hace seguimiento hasta el cierre. No somos
 *    consignatarios con matrícula RUCA: si negociáramos el precio estaríamos
 *    intermediando sin registro.
 *  · Contrapartes: leads que compran, frigoríficos de la base relevada y firmas PRO.
 *
 * A José se le escribe solo en dos casos: una operación cerrada (hay que facturar
 * la comisión) o algo que el agente no debe resolver solo (ver `debeEscalar`).
 */

export const COMISION_PCT = 1

/** Lo mínimo para poder ofrecer una hacienda: sin esto nadie contesta. */
export const DATOS_MINIMOS = ['cabezas', 'categoria', 'zona'] as const

/** Contrapartes nuevas por tanda. Pocas: es goteo, no un envío masivo. */
export const OFERTAS_POR_TANDA = 3
/** Tandas antes de decirle al productor que no apareció comprador. */
export const MAX_TANDAS = 3
/** Días que se espera a una contraparte antes de pasar a la siguiente tanda. */
export const DIAS_ESPERA_CONTRAPARTE = 4
/** Recordatorios al productor que no completó los datos antes de dormir el caso. */
export const MAX_RECORDATORIOS = 2
/** Seguimiento de una presentación: días después de presentar en que se pregunta. */
export const SEGUIMIENTO_DIAS = [4, 10, 21, 35] as const
/** Tope de correos a contactos NUEVOS (contrapartes que no escribieron) por día. */
export const MAX_CONTACTOS_NUEVOS_DIA = 20

export type Lado = 'vende' | 'compra'
export type EstadoCaso =
  | 'nuevo'
  | 'pidiendo_datos'
  | 'ofreciendo'
  | 'presentado'
  | 'cerrado'
  | 'sin_contraparte'
  | 'dormido'
  | 'retirado'
  | 'descartado'
  | 'escalado'

export type EstadoOferta = 'enviada' | 'acepto' | 'rechazo' | 'sin_respuesta' | 'presentada' | 'cerrada' | 'caida'
export type TipoContraparte = 'frigorifico' | 'firma' | 'lead'

export interface DatosHacienda {
  cabezas?: number | null
  categoria?: string | null
  zona?: string | null
  provincia?: string | null
  peso_kg?: number | null
  disponible?: string | null
  precio_pedido_kg?: number | null
}

/** Qué dato falta para poder ofrecer. Vacío = se puede ofrecer. */
export function faltantes(d: DatosHacienda): string[] {
  const f: string[] = []
  if (!d.cabezas || d.cabezas <= 0) f.push('cabezas')
  if (!d.categoria?.trim()) f.push('categoria')
  if (!d.zona?.trim() && !d.provincia?.trim()) f.push('zona')
  return f
}

/** Une lo que ya se sabía con lo que contestó: lo nuevo pisa solo si trae valor. */
export function unirDatos(previos: DatosHacienda, nuevos: DatosHacienda): DatosHacienda {
  const r: DatosHacienda = { ...previos }
  for (const [k, v] of Object.entries(nuevos) as [keyof DatosHacienda, unknown][]) {
    if (v === null || v === undefined || v === '') continue
    ;(r as Record<string, unknown>)[k] = v
  }
  return r
}

/**
 * La categoría manda a quién se le ofrece. Un frigorífico compra hacienda
 * terminada para faena; la invernada (terneros, novillitos livianos) la compra
 * un invernador o la mueve una consignataria, no una planta.
 */
export function vaAFaena(categoria: string | null | undefined): boolean {
  const c = (categoria ?? '').toLowerCase()
  if (/terner|invernada|destete|cria|cría|reproduct|toro/.test(c)) return false
  return /novill|vaca|vaquillona|gordo|conserva|manufactura/.test(c)
}

/** Comisión en pesos sobre el bruto, redondeada. */
export function comisionArs(brutoArs: number): number {
  return Math.round((brutoArs * COMISION_PCT) / 100)
}

/** Bruto de un cierre: lo que digan, o cabezas × kg × precio si dieron las partes. */
export function brutoDeCierre(c: { bruto_ars?: number | null; cabezas?: number | null; peso_kg?: number | null; precio_kg?: number | null }): number | null {
  if (c.bruto_ars && c.bruto_ars > 0) return Math.round(c.bruto_ars)
  if (c.cabezas && c.peso_kg && c.precio_kg) return Math.round(c.cabezas * c.peso_kg * c.precio_kg)
  return null
}

export interface Intencion {
  tipo:
    | 'acepta'
    | 'rechaza'
    | 'pregunta'
    | 'datos'
    | 'cerrada'
    | 'caida'
    | 'avanzando'
    | 'retira'
    | 'baja'
    | 'automatica'
    | 'otro'
  /** El modelo marca lo que no corresponde resolver solo. */
  escalar?: boolean
  motivo?: string
}

/**
 * Lo que el agente NO resuelve solo. Escalar es caro (José no puede mirar), así
 * que la lista es corta y concreta:
 *  · el modelo dudó o marcó algo raro (enojo, reclamo, tema legal);
 *  · alguien pide negociar precio o condiciones de la comisión;
 *  · un "otro" que no es un mensaje automático.
 */
export function debeEscalar(i: Intencion, texto: string): boolean {
  if (i.escalar) return true
  if (i.tipo === 'otro') return true
  const t = texto.toLowerCase()
  if (/abogad|denuncia|carta documento|estafa|fraude|demanda judicial/.test(t)) return true
  if (i.tipo === 'pregunta' && /(comisi[oó]n|el 1 ?%|uno por ciento)/.test(t)) return true
  return false
}

/** ¿Dice ACEPTO? Respaldo determinista por si el modelo no está. */
export function pareceAceptacion(texto: string): boolean {
  const primera = texto.trim().split(/\n/)[0]?.toLowerCase() ?? ''
  return /^\s*(acepto|aceptamos|ok,? acepto|s[ií],? acepto|de acuerdo,? acepto)\b/.test(primera)
}

/** ¿Pide la baja? Respaldo determinista: siempre se respeta, con o sin modelo. */
export function pareceBaja(texto: string): boolean {
  const t = texto.trim().toLowerCase().slice(0, 300)
  return /^(baja|no me escriban|no (me )?escriban m[aá]s|no nos interesa,? no escriban|desuscrib|unsubscribe|remove me)/.test(t)
}

/** Respuesta automática de vacaciones, fuera de oficina, etc. No es una respuesta. */
export function esAutomatica(asunto: string, texto: string, headers: Record<string, string | undefined> = {}): boolean {
  const auto = (headers['auto-submitted'] ?? '').toLowerCase()
  if (auto && auto !== 'no') return true
  if (headers['x-autoreply'] || headers['x-autorespond']) return true
  const s = `${asunto}\n${texto.slice(0, 300)}`.toLowerCase()
  return /(respuesta autom[aá]tica|fuera de (la )?oficina|out of office|automatic reply|auto(-| )?reply|vacaciones hasta|delivery status notification|undeliverable|no se pudo entregar|mail delivery failed)/.test(s)
}

/** Remitentes de sistemas (bienvenidas, notificaciones, rebotes): no son personas, no se escalan. */
export function esRemitenteSistema(de: string): boolean {
  const [local = '', dominio = ''] = de.toLowerCase().split('@')
  if (/^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|notificaciones|news(letter)?|marketing|bounce[s]?)([.+_-].*)?$/.test(local)) return true
  return /(^|\.)(hostinger\.com|email\.hostinger\.com|resend\.(com|dev)|amazonses\.com|google\.com|vercel\.com|github\.com)$/.test(dominio)
}

/** Lo que el productor escribió encima, sin la cita del correo anterior. */
export function sinCita(texto: string): string {
  const lineas = texto.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const l of lineas) {
    if (/^\s*>/.test(l)) break
    if (/^\s*(El|On) .{4,120}(escribió|wrote):?\s*$/i.test(l)) break
    if (/^-{2,}\s*(Mensaje original|Original Message)/i.test(l)) break
    if (/^\s*(De|From):\s.+/i.test(l) && out.length > 0) break
    out.push(l)
  }
  return out.join('\n').trim()
}

/**
 * Un borrador que sale a una contraparte no puede llevar datos del productor
 * antes de la aceptación. Es la regla que más plata cuesta romper: el contacto
 * es lo único que vendemos. Devuelve el motivo del bloqueo, o null si pasa.
 */
export function filtraContacto(texto: string, productor: { email?: string | null; phone?: string | null; name?: string | null }): string | null {
  const t = texto.toLowerCase()
  if (productor.email && t.includes(productor.email.toLowerCase())) return 'lleva el mail del productor'
  const dig = (productor.phone ?? '').replace(/\D/g, '')
  if (dig.length >= 6 && texto.replace(/\D/g, '').includes(dig.slice(-6))) return 'lleva el teléfono del productor'
  const nombre = (productor.name ?? '').trim()
  if (nombre.length >= 4) {
    const apellido = nombre.split(/\s+/).filter((p) => p.length >= 4).pop()
    if (apellido && new RegExp(`\\b${apellido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(texto)) return 'lleva el nombre del productor'
  }
  return null
}

/** Un borrador nunca compromete precio: no promete, no ofrece, no acepta montos. */
export function comprometePrecio(texto: string): boolean {
  const t = texto.toLowerCase()
  return /(te (lo )?(pagamos|ofrecemos|vendemos)|aceptamos (el|tu) precio|cerramos (en|a) \$|precio (final|acordado|cerrado))/.test(t)
}

/** Horario de envío de contactos nuevos: días hábiles de 8 a 19 en Argentina. */
export function horarioHabil(ahora: Date): boolean {
  const ar = new Date(ahora.getTime() - 3 * 3_600_000)
  const dia = ar.getUTCDay()
  const hora = ar.getUTCHours()
  return dia >= 1 && dia <= 5 && hora >= 8 && hora < 19
}

/** Respuestas a quien escribió: todos los días de 7 a 22. Nadie quiere un mail a las 3. */
export function horarioRespuesta(ahora: Date): boolean {
  const hora = new Date(ahora.getTime() - 3 * 3_600_000).getUTCHours()
  return hora >= 7 && hora < 22
}

export const DIA_MS = 86_400_000
export const enDias = (desde: Date, dias: number) => new Date(desde.getTime() + dias * DIA_MS)

/** Referencia que va en el asunto: así se reconoce el hilo aunque el cliente de correo pierda los encabezados. */
export function referencia(leadId: number, ofertaId?: number | null): string {
  return ofertaId ? `C-${leadId}-${ofertaId}` : `C-${leadId}`
}

export function leerReferencia(asunto: string): { leadId: number; ofertaId: number | null } | null {
  const m = /\bC-(\d{1,7})(?:-(\d{1,9}))?\b/.exec(asunto)
  if (!m) return null
  return { leadId: Number(m[1]), ofertaId: m[2] ? Number(m[2]) : null }
}
