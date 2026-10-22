/**
 * Contexto de la página para el formulario corto de hacienda (21-10-2026).
 *
 * El agente (`src/lib/agente/`) trabaja solo cada lead de 40 cabezas o más, pero
 * para OFRECER necesita tres datos: cabezas, categoría y zona (`DATOS_MINIMOS`). De
 * los 31 leads de compra/venta que había al 21-10, sólo 13 traían los tres más un
 * email: el resto obligaba al agente a pedirlos por correo y esperar respuesta. Este
 * archivo hace que la página llene lo que ya sabe (la provincia de la firma, del
 * remate o de la planta) y que el `source` diga de qué página vino el lead, para
 * poder medir conversión por plantilla.
 *
 * Puro, sin red ni base: cada regla tiene su test.
 */

/** Las provincias que ofrece el selector, con su grafía de pantalla. */
export const PROVINCIAS_FORM = [
  'Buenos Aires', 'Córdoba', 'Santa Fe', 'Entre Ríos', 'La Pampa', 'Corrientes',
  'Chaco', 'Formosa', 'Santiago del Estero', 'Salta', 'Tucumán', 'San Luis',
  'Misiones', 'Mendoza', 'Río Negro', 'La Rioja', 'Catamarca', 'Jujuy',
  'Neuquén', 'Chubut', 'Santa Cruz', 'San Juan', 'Tierra del Fuego',
] as const

/** Las categorías que el agente sabe rutear (ver `vaAFaena` en agente/reglas.ts). */
export const CATEGORIAS_FORM: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'novillos', label: 'Novillos' },
  { value: 'novillitos', label: 'Novillitos' },
  { value: 'vaquillonas', label: 'Vaquillonas' },
  { value: 'vacas', label: 'Vacas' },
  { value: 'terneros', label: 'Terneros / terneras' },
  { value: 'toros', label: 'Toros' },
]

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * "BUENOS AIRES", "entre-rios", "Córdoba" → la opción del selector. Vacío si no
 * corresponde a ninguna. La Capital Federal devuelve vacío A PROPÓSITO: hay firmas
 * con sede en CABA que rematan en Tornquist; la hacienda nunca está en CABA, así que
 * precargarla sería un dato falso que el agente usaría para buscar contraparte.
 */
export function provinciaParaFormulario(raw: string | null | undefined): string {
  if (!raw) return ''
  const k = norm(raw)
  if (!k) return ''
  return PROVINCIAS_FORM.find((p) => norm(p) === k) ?? ''
}

/**
 * "Mercedes, Corrientes" → "Mercedes". La localidad sola: la provincia va en su
 * propio campo. Vacío si no hay o si es "Capital"/"CABA" (no es zona ganadera).
 */
export function zonaParaFormulario(raw: string | null | undefined): string {
  const z = (raw ?? '').split(',')[0].trim()
  if (!z) return ''
  if (/^(caba|capital federal|ciudad aut[oó]noma)/i.test(z)) return ''
  return z.length > 120 ? z.slice(0, 120) : z
}

/** Categoría del selector si la página la conoce ("novillo" → "novillos"). */
export function categoriaParaFormulario(raw: string | null | undefined): string {
  const k = norm(raw ?? '')
  if (!k) return ''
  const exacta = CATEGORIAS_FORM.find((c) => c.value === k)
  if (exacta) return exacta.value
  const sing = CATEGORIAS_FORM.find((c) => c.value.replace(/s$/, '') === k.replace(/s$/, ''))
  if (sing) return sing.value
  if (/ternera|ternero/.test(k)) return 'terneros'
  return ''
}

/** Tipos de página que capturan leads con el formulario corto. */
export type TipoPaginaLead = 'consignataria' | 'remate' | 'precios' | 'frigorificos-provincia'

/**
 * El `source` que se guarda en `producer_leads`: `<tipo>:<clave>`. La clave es la de
 * la URL (slug de la firma, del remate, categoría o provincia), así un GROUP BY por
 * el prefijo da la conversión por plantilla y la clave entera, por página. Tope de
 * 80 caracteres porque es el límite del endpoint.
 */
export function sourceDePagina(tipo: TipoPaginaLead, clave: string): string {
  const limpia = clave.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${tipo}:${limpia}`.slice(0, 80)
}
