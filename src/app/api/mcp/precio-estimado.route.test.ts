/**
 * livestock_prices marca las categorías que NO son observadas: market-prices.json trae
 * `source` por categoría y terneros es "MAG (derived from INMAG)" (el MAG no la opera).
 * La integración anónima de Misiones recibe el texto y el JSON de siempre.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import marketPrices from '@/lib/data/market-prices.json'

vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({}), createServiceClient: () => ({}) }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

type Resultado = { content: { type: string; text: string }[]; structuredContent?: { prices: Record<string, { estimado?: boolean; metodo?: string | null; head?: number | null }> } }

async function llamar(name: string, args: Record<string, unknown>, headers: Record<string, string>) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  })
  return (await (await POST(req)).json()).result as Resultado
}

const CLIENTE = { 'user-agent': 'test-client/1.0', 'mcp-protocol-version': '2025-06-18' }
const cats = (marketPrices as { categories: Record<string, { source?: string }> }).categories
const derivadas = Object.keys(cats).filter((k) => cats[k].source !== 'mercadoagroganadero.com.ar (observed)')
const observadas = Object.keys(cats).filter((k) => !derivadas.includes(k))

describe('livestock_prices: precio estimado vs observado', () => {
  it('el dato de hoy tiene al menos una categoría derivada (terneros) y una observada', () => {
    expect(derivadas).toContain('terneros')
    expect(observadas.length).toBeGreaterThan(0)
  })

  it('la categoría derivada dice ESTIMADO en el texto y observado:false en lo estructurado', async () => {
    const r = await llamar('livestock_prices', {}, CLIENTE)
    const texto = r.content[0].text
    for (const k of derivadas) {
      expect(texto).toMatch(new RegExp(`^${k}: .*· ESTIMADO: INMAG × [0-9,]+ \\(el MAG no opera ${k}`, 'm'))
      expect(r.structuredContent?.prices[k].estimado).toBe(true)
      expect(r.structuredContent?.prices[k].head).toBeNull()
    }
    for (const k of observadas) {
      expect(texto).not.toMatch(new RegExp(`^${k}: .*ESTIMADO`, 'm'))
      expect(r.structuredContent?.prices[k].estimado).toBe(false)
      expect(r.structuredContent?.prices[k].metodo).toBeNull()
    }
  })

  it('filtrando una categoría observada no aparece el aviso', async () => {
    const r = await llamar('livestock_prices', { categoria: observadas[0] }, CLIENTE)
    expect(r.content[0].text).not.toContain('ESTIMADO')
  })

  it('a la integración anónima (sin UA ni key, por alias) también le llega el aviso en el texto', async () => {
    const r = await llamar('get_precios_hacienda', {}, {})
    const texto = r.content.map((c) => c.text).join('\n')
    expect(texto).toMatch(/^terneros: .*· ESTIMADO: INMAG × /m)
    expect(r.structuredContent).toBeUndefined() // sigue sin structuredContent (no negoció 2025-06-18)
    for (const k of observadas) expect(texto).not.toMatch(new RegExp(`^${k}: .*ESTIMADO`, 'm'))
  })
})
