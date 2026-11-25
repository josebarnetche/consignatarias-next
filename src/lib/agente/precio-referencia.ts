/**
 * El dato nuevo del recordatorio a la contraparte: el precio de referencia de la
 * categoría esta semana, del mismo archivo que sirve la tool MCP `livestock_prices`
 * (`market-prices.json → categories`, observación semanal del Mercado Agroganadero).
 *
 * Solo se usa un precio OBSERVADO: el archivo completa las categorías sin rueda con un
 * ratio sobre el INMAG (los terneros lo son siempre, ver rodeo-vr.ts), y un ratio no es
 * un dato para mandarle a una firma. Sin precio observado, el recordatorio usa otro dato.
 *
 * Es una referencia de mercado, nunca una propuesta de precio: el precio lo acuerdan
 * las partes.
 */
import marketPrices from '@/lib/data/market-prices.json'
import { categoriaDemanda } from './demanda'

export interface CategoriaPrecio {
  current: number
  source?: string
  observedDate?: string
}

export interface PrecioReferencia {
  /** Categoría tal como figura en el archivo (novillos, vacas...). */
  categoria: string
  /** ARS por kg vivo. */
  precioKg: number
  /** dd/mm/aaaa de la observación, si el archivo la trae. */
  fecha: string | null
}

const CATEGORIAS = (marketPrices as unknown as { categories: Record<string, CategoriaPrecio> }).categories

/** Precio de referencia observado para la categoría de la hacienda, o null. Puro con `fuente` inyectada. */
export function precioReferencia(
  categoria: string | null | undefined,
  fuente: Record<string, CategoriaPrecio> = CATEGORIAS,
): PrecioReferencia | null {
  const k = categoriaDemanda(categoria ?? null)?.toLowerCase()
  if (!k) return null
  const c = fuente[k]
  if (!c || !Number.isFinite(c.current) || c.current <= 0) return null
  if (!/observed/i.test(c.source ?? '')) return null
  return { categoria: k, precioKg: c.current, fecha: c.observedDate ?? null }
}
