/**
 * Fecha de la última actualización de los datos del sitio, para mostrarla en
 * las páginas. El scrape diario escribe remates.json y market-prices.json en el
 * mismo commit, así que `lastUpdate` sirve de fecha para los dos.
 */
import marketPrices from '@/lib/data/market-prices.json'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-10-03" (o null si el archivo no la trae). */
export const FECHA_DATOS: string | null = (marketPrices as { lastUpdate?: string }).lastUpdate ?? null

/** "3 de octubre de 2026". Vacío si no hay fecha. */
export function fechaLarga(iso: string | null | undefined = FECHA_DATOS): string {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`
}
