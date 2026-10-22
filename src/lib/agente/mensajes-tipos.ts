/**
 * Correos del agente para los tipos de operación que no son hacienda
 * (arrendamiento, venta de campo, tasación). Misma voz y misma firma que
 * `mensajes.ts`; puros, para que cada texto tenga su test.
 *
 * Solo hay correos AL LEAD QUE NOS ESCRIBIÓ (pedirle datos, calificarlo). No hay
 * plantilla de oferta a contrapartes para estos tipos: arrendamiento tiene un
 * bloqueo legal (matrícula de corredor, ver `tipos.ts`) y campo/tasación no tienen
 * comisión definida. Cuando José resuelva eso, la oferta se escribe acá.
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
