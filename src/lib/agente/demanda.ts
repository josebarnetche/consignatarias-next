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
  /** Aceptó que lo contactemos para armar la operación. Sin esto, solo avisos de remates. */
  consiente_contacto?: boolean | null
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
 * trabaja: sin consentimiento para operar, sin mail, sin activar, o de prueba. Las del MCP entran sin verificar (needs_review).
 */
export function leadDeDemanda(d: Demanda, propios: string[]): Record<string, unknown> | null {
  const email = d.email?.trim().toLowerCase()
  if (!email || d.status !== 'active') return null
  if (propios.includes(email)) return null
  // Quien solo pidió avisos de remates no aceptó que le escribamos para operar (José, 22-10).
  if (d.consiente_contacto !== true) return null
  // Las que carga un agente externo por el MCP (cattle_buying_request) pueden traer el
  // mail de OTRA persona: entran en needs_review y el agente no las toma (tomable() en
  // verificacion.ts) hasta que una persona las verifique y las pase a `new`.
  const sinVerificar = (d.origen ?? '').trim().toLowerCase() === 'mcp'
  if (/\bdemo\b|prueba|test/i.test(d.notas ?? '')) return null
  // Dominios reservados (RFC 2606): las demandas de prueba del MCP vienen con example.com/.org/.net.
  if (/@(.+\.)?(example\.(com|org|net)|[^@]+\.(test|example|invalid|localhost))$/.test(email)) return null
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
    status: sinVerificar ? 'needs_review' : 'new',
  }
}
