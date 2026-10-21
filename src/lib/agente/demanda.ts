/**
 * Las demandas de compra (`demanda_compra`, el formulario "busco hacienda" y la
 * tool `cattle_buying_request` del MCP) son compradores reales, pero el agente
 * solo miraba `producer_leads`. El 21-10-2026 había dos esperando: Tradefood
 * buscando 200 vacas gordas en Santa Fe y un comprador de 60 terneros en Entre
 * Ríos, limítrofe de un vendedor de 40 terneros que el agente ya estaba ofreciendo.
 *
 * Cada corrida copia las demandas activas a `producer_leads` como leads de
 * compra (una sola vez por demanda, la clave es `source`) y desde ahí el agente
 * las trabaja como cualquier otro comprador.
 */

export interface Demanda {
  id: number
  categoria: string | null
  cabezas: number | null
  provincia: string | null
  email: string | null
  origen: string | null
  status: string | null
  notas: string | null
  created_at: string
}

export const fuenteDemanda = (id: number) => `demanda_compra:${id}`

const CATEGORIAS: Record<string, string> = {
  vaca_gorda: 'vacas',
  vaca_conserva: 'vacas',
  vaca: 'vacas',
  vacas: 'vacas',
  novillo: 'novillos',
  novillos: 'novillos',
  novillito: 'novillitos',
  novillitos: 'novillitos',
  vaquillona: 'vaquillonas',
  vaquillonas: 'vaquillonas',
  ternero: 'terneros',
  terneros: 'terneros',
  ternera: 'terneras',
  terneras: 'terneras',
  toro: 'toros',
  toros: 'toros',
}

export function categoriaDemanda(c: string | null): string | null {
  if (!c) return null
  const k = c.trim().toLowerCase().replace(/\s+/g, '_')
  return CATEGORIAS[k] ?? c.replace(/_/g, ' ').trim()
}

const PROVINCIAS: Record<string, string> = {
  'entre rios': 'Entre Ríos',
  'cordoba': 'Córdoba',
  'neuquen': 'Neuquén',
  'rio negro': 'Río Negro',
  'tucuman': 'Tucumán',
  'caba': 'Ciudad Autónoma de Buenos Aires',
}

export function provinciaDemanda(p: string | null): string | null {
  if (!p?.trim()) return null
  const k = p.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (PROVINCIAS[k]) return PROVINCIAS[k]
  return p
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())
}

/**
 * La fila de `producer_leads` que representa a la demanda, o null si no se
 * trabaja: sin mail, sin activar, o las que cargamos nosotros de prueba.
 */
export function leadDeDemanda(d: Demanda, propios: string[]): Record<string, unknown> | null {
  const email = d.email?.trim().toLowerCase()
  if (!email || d.status !== 'active') return null
  if (propios.includes(email)) return null
  if (/\bdemo\b|prueba|test/i.test(d.notas ?? '')) return null
  const categoria = categoriaDemanda(d.categoria)
  const provincia = provinciaDemanda(d.provincia)
  const detalle = [d.cabezas ? `${d.cabezas} cabezas` : null, categoria, provincia ? `en ${provincia}` : null].filter(Boolean).join(' ')
  return {
    intent: 'comprar',
    category: categoria,
    head_count: d.cabezas,
    province: provincia,
    name: email,
    email,
    message: `Comprador: busca ${detalle || 'hacienda'}${d.notas ? ` (${d.notas})` : ''}. Demanda de compra #${d.id} (${d.origen ?? 'web'}, ${d.created_at.slice(0, 10)}).`,
    source: fuenteDemanda(d.id),
    status: 'new',
  }
}
