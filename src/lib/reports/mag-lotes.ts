/**
 * mag-lotes.ts — la lectura de los lotes del Mercado Agroganadero.
 *
 * Todo lo que el panel le muestra a una consignataria sobre SU negocio —precio contra
 * el mercado, cartera de remitentes, participación— sale de la misma tabla. Este
 * módulo la lee una sola vez y bien, para que los demás no repitan la consulta ni el
 * error.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface Lote {
  category: string | null
  price: number | null
  head_count: number | null
  total_kgs: number | null
  date: string
  remitente: string | null
  localidad: string | null
  provincia: string | null
  mag_consignataria_id: number
}

/** Columnas que se piden. Fuera de acá no se toca la tabla. */
const COLUMNAS =
  'category, price, head_count, total_kgs, date, remitente, localidad, provincia, mag_consignataria_id'

/**
 * Trae TODOS los lotes desde una fecha, paginando.
 *
 * EL PAGINADO NO ES OPCIONAL. PostgREST corta en 1.000 filas por respuesta y
 * `.limit(50000)` no lo cambia: no falla, simplemente devuelve menos y no avisa. En
 * 60 días hay ~8.000 lotes, así que sin esto los promedios del mercado salían
 * calculados sobre el 12% del dato y presentados como si fueran el número real.
 */
export async function fetchLotesDesde(
  db: SupabaseClient,
  desdeISO: string,
  topeFilas = 60_000,
): Promise<Lote[]> {
  const out: Lote[] = []
  const PAGINA = 1000

  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await db
      .from('mag_consignataria_sales_lots')
      .select(COLUMNAS)
      .gte('date', desdeISO)
      .order('id', { ascending: true })
      .range(offset, offset + PAGINA - 1)

    if (error) throw new Error(`[mag-lotes] ${error.message}`)
    const pagina = (data ?? []) as Lote[]
    out.push(...pagina)

    if (pagina.length < PAGINA) break
    if (out.length >= topeFilas) break
  }

  return out
}

/** Fecha ISO (YYYY-MM-DD) de hace `dias` días. */
export function haceDias(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Repara la Ñ que el scrape perdió.
 *
 * El origen viene en latin-1 y se lee como UTF-8, así que la Ñ termina como el
 * carácter de reemplazo (`�`, que además suele verse escrito "ï¿½"). Afecta a
 * 208 de 12.961 lotes, y el nombre queda ilegible justo donde más importa: es la
 * letra de CABAÑA, la palabra más común del padrón.
 *
 * Reemplazar por Ñ no es adivinar: se revisaron todos los casos distintos del
 * período y **el 100% son Ñ** — ACUÑA, ARGAÑIN, CABAÑA, CAÑADA, CAÑADÓN, CASTAÑO,
 * DE LA PEÑA. No hay ninguna otra letra acentuada afectada, porque el resto sobrevive
 * la conversión.
 *
 * Es un parche de lectura: **el arreglo de fondo va en el scraper**, leyendo la
 * fuente como latin-1. Mientras tanto, mostrar "CABAÑA" es más fiel al dato original
 * que mostrar "CABAï¿½A".
 */
export function repararTexto(s: string): string {
  return s.replace(/�/g, 'Ñ').replace(/ï¿½/g, 'Ñ')
}

/**
 * Normaliza el nombre de un remitente para poder seguirlo entre lotes.
 *
 * El MAG escribe el mismo productor de formas distintas ("Estancia La Lucía",
 * "ESTANCIA LA LUCIA  "), así que sin esto un cliente parecería tres.
 */
export function claveRemitente(s: string | null | undefined): string {
  if (!s) return ''
  return repararTexto(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resuelve el id del MAG de una firma a partir de su slug canónico. */
export async function magIdDeSlug(db: SupabaseClient, slug: string): Promise<number | null> {
  const { data } = await db
    .from('mag_consignatarias')
    .select('mag_id')
    .eq('consignataria_canonical_slug', slug)
    .maybeSingle()
  return (data as { mag_id: number } | null)?.mag_id ?? null
}

/** Promedio simple. Devuelve 0 con lista vacía para no propagar NaN. */
export function media(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Mediana. Útil para ritmos (un intervalo raro no corre el valor). */
export function mediana(xs: number[]): number {
  if (xs.length === 0) return 0
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

/**
 * Error estándar de la media: desvío / √n. Es la banda de ruido de la propia serie.
 * Una diferencia que no lo supera puede ser sólo qué lotes tocaron, no cómo se vendió.
 */
export function errorEstandar(xs: number[]): number {
  if (xs.length < 2) return Infinity
  const m = media(xs)
  const varianza = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(varianza / xs.length)
}
