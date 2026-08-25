/**
 * triage.ts — decide si un lead entrante se trabaja, se revisa a mano o es un duplicado.
 *
 * Nació el 2026-08-21 leyendo los 12 `producer_leads` acumulados: cuatro filas de
 * doce no eran leads. Dos eran el mismo proveedor de etiquetas para frigoríficos
 * cargando el formulario dos veces ("ETIQUETAS PARA LA INDUSTRIA FRIGORIFICA"), una
 * decía sólo "CONTACTO" sin provincia ni cabezas, y el par 13/14 era el mismo
 * productor mandando dos veces el mismo pedido el mismo día.
 *
 * Importa porque el plan es dejar de rutear a mano: el día que el ruteo salga solo,
 * la primera impresión que una consignataria tenga del producto no puede ser un lead
 * de etiquetas.
 *
 * DOS REGLAS QUE NO HAY QUE ROMPER:
 *  · **Nunca se descarta solo.** El peor resultado posible es tirar un lead bueno,
 *    así que lo dudoso va a `needs_review` y lo mira una persona. `discarded` es
 *    siempre una decisión humana desde /admin/leads.
 *  · **Esto no es un clasificador de spam.** Son reglas deterministas sobre señales
 *    que ya vimos. No intenta generalizar a spam que todavía no apareció; cuando el
 *    volumen justifique juzgar texto libre, acá entra un modelo — no antes.
 */

/** Estado con el que nace un lead recién capturado. */
export type TriageStatus = 'new' | 'needs_review'

export interface TriageResult {
  status: TriageStatus
  /** Motivo legible, se guarda en `notes` para que la revisión no adivine. */
  motivo: string | null
}

/**
 * Rubros que venden A la industria en vez de comprar o vender hacienda. Se usan
 * sólo para MARCAR, nunca para descartar: un productor puede nombrar "seguro" o
 * "transporte" en un mensaje legítimo, y en ese caso la revisión lo devuelve a `new`.
 */
const RUBROS_PROVEEDOR = [
  'etiqueta', 'imprenta', 'impresion', 'packaging', 'embalaje',
  'publicidad', 'marketing', 'diseño web', 'pagina web', 'sitio web',
  'software', 'sistema de gestion', 'crm',
  'prestamo', 'credito personal', 'inversion', 'criptomoneda',
  'curriculum', 'busco empleo', 'cv adjunto',
]

/** Normaliza para comparar: sin acentos, minúsculas, espacios colapsados. */
function norm(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface TriageInput {
  intent: string
  province?: string | null
  zona?: string | null
  headCount?: number | null
  hectareas?: number | null
  message?: string | null
  name?: string | null
}

/**
 * ¿Este lead se puede trabajar tal como vino?
 *
 * Va a `needs_review` si:
 *  1. No tiene NADA operable — ni provincia, ni zona, ni cabezas, ni hectáreas.
 *     Sin eso ninguna firma sabe de dónde le hablan (es el mismo criterio que el
 *     Ovejero ya aplica en `leadConsultable()` para no salir a preguntar al vacío).
 *  2. El mensaje nombra un rubro de proveedor.
 */
export function triageLead(input: TriageInput): TriageResult {
  const texto = `${norm(input.message)} ${norm(input.name)}`

  const rubro = RUBROS_PROVEEDOR.find((r) => texto.includes(r))
  if (rubro) {
    return { status: 'needs_review', motivo: `posible oferta de proveedor (menciona "${rubro}")` }
  }

  const sinGeo = !input.province && !input.zona
  const sinVolumen = !input.headCount && !input.hectareas
  if (sinGeo && sinVolumen) {
    return {
      status: 'needs_review',
      motivo: 'sin provincia, zona, cabezas ni hectáreas: no hay con qué rutearlo',
    }
  }

  return { status: 'new', motivo: null }
}

/**
 * Clave de deduplicación de un lead.
 *
 * Misma persona + misma intención + mismo día = un solo lead. Es lo que pasó con
 * el par 13/14 (mismo email, mismo pedido, mismo día, cargado dos veces) y con el
 * 11/12. Preferimos el email; si no hay, el teléfono en dígitos —así `2914222452`
 * y `+5492914222452` no cuentan como dos personas—. Sin ninguno de los dos no hay
 * dedup posible y el lead pasa (la captura ya exige teléfono o email, así que este
 * caso no debería darse).
 */
export function dedupeKey(input: {
  email?: string | null
  phone?: string | null
  intent: string
}): string | null {
  const email = norm(input.email)
  if (email) return `email:${email}|${input.intent}`

  const digits = (input.phone || '').replace(/\D/g, '')
  if (digits.length >= 8) {
    // Los últimos 8 dígitos identifican la línea sin importar el prefijo de país
    // o el 9 de celular: 2914222452 y +5492914222452 caen en la misma clave.
    return `phone:${digits.slice(-8)}|${input.intent}`
  }

  return null
}

/** Ventana de deduplicación: dos cargas del mismo pedido dentro del día son una. */
export const DEDUPE_WINDOW_HOURS = 24
