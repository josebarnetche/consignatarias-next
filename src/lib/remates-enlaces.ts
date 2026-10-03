/**
 * Enlaces y textos de la ficha de un remate (/remates/[slug]).
 *
 * La ficha solo existe para los estados que emite generateStaticParams
 * (dynamicParams=false): enlazar un remate sin ficha es mandar al productor a
 * un 404. Por eso todo listado pregunta `remateHref()` y, si da null, no enlaza.
 */
import { rematePath, type RemateSlugInput } from './remate-slug'
import { getCity, nombrePropio, provinciaNombre } from './ui/tokens'

/** Estados con ficha. Mantener igual al filtro de generateStaticParams de la ficha. */
export const ESTADOS_CON_FICHA = new Set(['scheduled', 'completed', 'live'])

export interface RemateEnlazable extends RemateSlugInput {
  status?: string | null
  consignatariaName?: string | null
  location?: string | null
  time?: string | null
  estimatedHeads?: number | null
}

export function tieneFicha(r: { status?: string | null; date?: string | null }): boolean {
  return !!r.date && ESTADOS_CON_FICHA.has(r.status ?? '')
}

/** Ruta de la ficha, o null si ese remate no tiene ficha. */
export function remateHref(r: RemateEnlazable): string | null {
  return tieneFicha(r) ? rematePath(r) : null
}

/** URL absoluta de la ficha (para calendarios .ics y para compartir). */
export function remateUrlAbsoluta(r: RemateSlugInput): string {
  return `https://www.consignatarias.com.ar${rematePath(r)}`
}

const TIPO_FRASE: Record<string, string> = {
  invernada: 'de invernada',
  cria: 'de cría',
  reproductores: 'de reproductores',
  especial: 'especial',
  general: 'general',
}

/** "de invernada", "de cría", "general"… para armar "Remate {tipo}". */
export function tipoFrase(type: string | null | undefined): string {
  const t = (type || '').toLowerCase()
  return TIPO_FRASE[t] ?? (t ? `de ${t}` : 'de hacienda')
}

/** "Invernada", "Cría", "General"… (rótulo del tipo de remate). */
export function tipoNombre(type: string | null | undefined): string {
  const t = (type || '').toLowerCase()
  if (t === 'cria') return 'Cría'
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'General'
}

/** "3/10/2026" a partir de "2026-10-03". */
export function fechaCorta(date: string): string {
  const [y, m, d] = date.split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

/** Ciudad legible; si no hay, la provincia; si tampoco, "Argentina". */
export function lugarDelRemate(r: { location?: string | null; province?: string | null }): string {
  const ciudad = nombrePropio(getCity(r.location || ''))
  return ciudad || provinciaNombre(r.province) || 'Argentina'
}

/**
 * Texto del enlace a la ficha: dice qué remate es, de quién, dónde y cuándo,
 * así Google y el lector de pantalla saben a dónde lleva sin abrirlo.
 */
export function remateAnchor(r: RemateEnlazable): string {
  const firma = nombrePropio(r.consignatariaName || '') || 'la consignataria'
  return `Remate ${tipoFrase(r.type)} de ${firma} en ${lugarDelRemate(r)}, ${fechaCorta(r.date)}`
}

function recortar(s: string, max: number): string {
  if (s.length <= max) return s
  const corte = s.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > max * 0.5 ? corte.slice(0, espacio) : corte).replace(/[\s,.-]+$/, '')}…`
}

/**
 * Title de la ficha: "{Firma} · Remate de {tipo} en {Ciudad}, {d/m/aaaa}".
 * Firma, ciudad y fecha lo hacen único (antes 93 titles se repetían en 456
 * fichas). Si se pasa de ~60 caracteres se recorta la firma, nunca la fecha.
 */
export function remateTitulo(r: RemateEnlazable, firmaVisible?: string | null, max = 60): string {
  const firma = nombrePropio(firmaVisible || r.consignatariaName || '') || 'Remate'
  const resto = ` · Remate ${tipoFrase(r.type)} en ${lugarDelRemate(r)}, ${fechaCorta(r.date)}`
  const lugarParaFirma = Math.max(14, max - resto.length)
  return `${recortar(firma, lugarParaFirma)}${resto}`
}

/** Días entre la fecha del remate y hoy (positivo = ya pasó). */
export function diasDesde(date: string, hoy: string = new Date().toISOString().slice(0, 10)): number {
  const a = Date.parse(`${date}T12:00:00Z`)
  const b = Date.parse(`${hoy}T12:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}
