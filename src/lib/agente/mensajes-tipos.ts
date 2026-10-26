/**
 * Correos del agente para los tipos de operación que no son hacienda
 * (arrendamiento, venta de campo, tasación). Misma voz y misma firma que
 * `mensajes.ts`; puros, para que cada texto tenga su test.
 *
 * Correos al lead que nos escribió (pedirle datos, calificarlo) y, desde el
 * 26-10-2026, la oferta de una VENTA DE CAMPO a consignatarias de la zona
 * (`ofertaCampo`) y la presentación cuando una responde ACEPTO
 * (`presentacionCampo`). Decisión de José: las consignatarias tienen la matrícula
 * y saben cómo manejarse; el sitio es un portal que no intermedia y solo ofrece el
 * contacto. Arrendamiento sigue sin oferta (bloqueo legal, `tipos.ts`).
 */
import { referencia } from './reglas'
import type { Correo } from './mensajes'
import type { TipoOperacion } from './tipos'

const FIRMA = ['', 'Saludos,', 'Equipo de consignatarias.com', 'www.consignatarias.com.ar'].join('\n')

export interface DatosCampo {
  hectareas?: number | null
  /** Ganadera, agrícola, mixta, tambo... */
  aptitud?: string | null
  zona?: string | null
  provincia?: string | null
  /** Desde cuándo y por cuánto tiempo (arrendamiento). */
  plazo?: string | null
  /**
   * Mejoras y estado del campo, en una o dos líneas. Lo escribe una persona a
   * partir de lo que contó el dueño: nunca se copia su texto tal cual, porque va
   * a terceros y no puede llevar su nombre ni su contacto.
   */
  detalle?: string | null
}

/** Lo mínimo para trabajar un pedido de campo. Vacío = alcanza. */
export function faltantesCampo(d: DatosCampo): string[] {
  const f: string[] = []
  if (!d.hectareas || d.hectareas <= 0) f.push('hectareas')
  if (!d.aptitud?.trim()) f.push('aptitud')
  if (!d.zona?.trim() && !d.provincia?.trim()) f.push('zona')
  return f
}

const ETIQUETA: Record<string, string> = {
  hectareas: 'cuántas hectáreas',
  aptitud: 'la aptitud del campo (ganadero, agrícola, mixto)',
  zona: 'en qué partido o localidad y provincia',
  plazo: 'desde cuándo y por cuánto tiempo',
}

function nombrePila(nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim().split(/\s+/)[0] ?? ''
  if (n.length < 2 || /@|\d/.test(n)) return ''
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
}
const saludo = (nombre?: string | null) => (nombrePila(nombre) ? `Hola ${nombrePila(nombre)},` : 'Hola,')

/** Qué busca o qué ofrece, en palabras, según el intent del formulario. */
function queQuiere(intent: string): string {
  if (intent === 'arrendar_busco') return 'el campo que estás buscando para arrendar'
  if (intent === 'arrendar_ofrezco' || intent === 'arrendar') return 'el campo que querés dar en arrendamiento'
  if (intent === 'busca-campo' || intent === 'comprar_campo') return 'el campo que estás buscando'
  return 'tu campo'
}

/** Al lead de arrendamiento o campo, cuando falta algo para poder buscarle contraparte. */
export function pedirDatosCampo(o: {
  leadId: number
  nombre: string | null
  intent: string
  faltan: string[]
  recordatorio?: boolean
}): Correo {
  const pedidos = [...o.faltan, ...(o.intent.startsWith('arrendar') && !o.faltan.includes('plazo') ? ['plazo'] : [])]
  const lista = pedidos.map((k) => `· ${ETIQUETA[k] ?? k}`).join('\n')
  return {
    asunto: `${o.recordatorio ? 'Recordatorio: ' : ''}Para avanzar con ${queQuiere(o.intent)} [${referencia(o.leadId)}]`,
    texto: [
      saludo(o.nombre),
      '',
      `Recibimos tu consulta en consignatarias.com.ar por ${queQuiere(o.intent)}. Para empezar a trabajarla necesitamos:`,
      '',
      lista,
      '',
      'Respondé este correo con eso y seguimos.',
      FIRMA,
    ].join('\n'),
  }
}

/**
 * A quien pidió una tasación. Una tasación no deja comisión: lo que interesa es
 * saber si detrás hay una venta o un arrendamiento. Una pregunta, sin presión, y
 * la herramienta gratis para que tenga su número igual.
 */
export function calificarTasacion(o: { leadId: number; nombre: string | null; zona?: string | null }): Correo {
  return {
    asunto: `Sobre la tasación de tu campo [${referencia(o.leadId)}]`,
    texto: [
      saludo(o.nombre),
      '',
      `Recibimos tu pedido de tasación${o.zona ? ` (${o.zona})` : ''}. Mientras tanto, la referencia de valor por zona está en www.consignatarias.com.ar/campos/valor-hectarea`,
      '',
      'Para orientarte mejor: ¿la tasación es porque pensás venderlo, darlo en arrendamiento, o solo querés saber cuánto vale? Con una palabra alcanza.',
      FIRMA,
    ].join('\n'),
  }
}

export type IntencionCampo = 'vender' | 'arrendar' | 'solo_valor' | null

/** Respaldo determinista de la respuesta a `calificarTasacion`. */
export function leerIntencionCampo(texto: string): IntencionCampo {
  const t = texto.trim().toLowerCase().slice(0, 300)
  if (/arrend|alquil/.test(t)) return 'arrendar'
  if (/vend|venta/.test(t)) return 'vender'
  if (/solo|saber|curiosidad|nada m[aá]s|valor/.test(t)) return 'solo_valor'
  return null
}

/** El primer correo que le corresponde a un lead nuevo, por tipo. null = no se le escribe. */
export function primerCorreo(
  tipo: TipoOperacion,
  lead: { id: number; name: string | null; intent: string; zona?: string | null; datos: DatosCampo },
): Correo | null {
  if (tipo === 'tasacion') return calificarTasacion({ leadId: lead.id, nombre: lead.name, zona: lead.zona })
  if (tipo === 'arrendamiento' || tipo === 'campo') {
    const faltan = faltantesCampo(lead.datos)
    return faltan.length ? pedirDatosCampo({ leadId: lead.id, nombre: lead.name, intent: lead.intent, faltan }) : null
  }
  return null // hacienda la sigue manejando mensajes.ts
}

/** "300 ha ganadero en Villaguay, Entre Ríos". */
export function resumenCampo(d: DatosCampo): string {
  const lugar = [d.zona, d.provincia].filter((x) => x?.trim()).join(', ')
  const ha = d.hectareas ? `${Math.round(d.hectareas).toLocaleString('es-AR')} ha` : 'campo'
  return [ha, d.aptitud?.trim().toLowerCase(), lugar ? `en ${lugar}` : null].filter(Boolean).join(' ')
}

function fichaCampo(d: DatosCampo): string {
  return [
    `· Superficie: ${d.hectareas ? `${Math.round(d.hectareas).toLocaleString('es-AR')} ha` : 'a confirmar'}`,
    `· Aptitud: ${d.aptitud?.trim() || 'a confirmar'}`,
    `· Zona: ${[d.zona, d.provincia].filter((x) => x?.trim()).join(', ') || 'a confirmar'}`,
    ...(d.detalle?.trim() ? [`· ${d.detalle.trim()}`] : []),
  ].join('\n')
}

/**
 * A una consignataria de la zona: un dueño quiere vender su campo. El sitio es un
 * portal: no intermedia ni cobra al dueño, solo ofrece el contacto (José, 26-10-2026).
 * Sin nombre ni contacto del dueño: eso sale solo después de un ACEPTO escrito.
 */
export function ofertaCampo(o: { leadId: number; ofertaId: number; datos: DatosCampo }): Correo {
  return conPieComercial({
    asunto: `Campo en venta: ${resumenCampo(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Buenas,',
      '',
      'Les escribimos desde consignatarias.com. El dueño de un campo nos consultó porque lo quiere vender:',
      '',
      fichaCampo(o.datos),
      '',
      'consignatarias.com es un portal: no intermediamos en la operación ni le cobramos al dueño. Si les interesa, respondan ACEPTO y les pasamos su contacto directo para que avancen con él. Si no es para ustedes, con un "no" alcanza y no insistimos.',
      FIRMA,
    ].join('\n'),
  })
}

/** Cuando la consignataria respondió ACEPTO: los presentamos, a los dos en el mismo correo. */
export function presentacionCampo(o: {
  leadId: number
  ofertaId: number
  datos: DatosCampo
  duenio: { nombre: string | null; email: string | null; phone: string | null }
  firma: { nombre: string; email: string }
}): Correo {
  const d = o.duenio
  return {
    asunto: `Les presentamos: ${resumenCampo(o.datos)} · Ref. ${referencia(o.leadId, o.ofertaId)}`,
    texto: [
      'Hola a los dos,',
      '',
      `${o.firma.nombre} confirmó que le interesa el campo:`,
      '',
      fichaCampo(o.datos),
      '',
      `· Dueño: ${[d.nombre, d.email, d.phone].filter(Boolean).join(' · ')}`,
      `· ${o.firma.nombre}: ${o.firma.email}`,
      '',
      'A partir de acá siguen directamente entre ustedes; consignatarias.com no intermedia en la operación.',
      FIRMA,
    ].join('\n'),
  }
}

/** La cadencia vive en reglas.ts (la usa el motor); se reexporta para los tests y el tablero. */
export { CADENCIA_CONTRAPARTE_DIAS } from './reglas'
import { CADENCIA_CONTRAPARTE_DIAS as CADENCIA } from './reglas'

/** ¿Toca otro seguimiento? `enviados` cuenta el inicial. */
export function tocaSeguimiento(enviados: number, diasDesdePrimero: number): boolean {
  if (enviados >= CADENCIA.length) return false
  return diasDesdePrimero >= CADENCIA[enviados]
}

/**
 * Pie para un correo comercial que la contraparte no pidió (Ley 25.326 art. 27 y
 * Disp. DNPDP 4/2009): baja visible y aviso de que es una comunicación comercial.
 */
export const PIE_COMERCIAL = [
  '',
  '—',
  'Este correo es una comunicación comercial de consignatarias.com.ar. Si no querés recibir más, respondé BAJA y no te escribimos nunca más.',
].join('\n')

export function conPieComercial(c: Correo): Correo {
  return c.texto.includes('respondé BAJA') ? c : { ...c, texto: c.texto + '\n' + PIE_COMERCIAL }
}
