/**
 * Un precio que el scraper marca `observado: true` desde otra fuente (el ternero mensual de
 * MAGyP · Entre Surcos y Corrales) NO sale como ESTIMADO: sale observado y con su fuente y fecha.
 * Dato simulado: no depende de lo que traiga hoy market-prices.json.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/data/market-prices.json', async (orig) => {
  const real = (await orig()) as { default: { categories: Record<string, unknown> } }
  const base = real.default
  return {
    default: {
      ...base,
      categories: {
        ...base.categories,
        terneros: { current: 6389, change: 0, source: 'MAGyP · Entre Surcos y Corrales (mensual)', observedDate: '2026-10', observado: true },
        toros: { current: 2000, change: 0, source: 'MAG (derived from INMAG)', observedDate: null },
      },
    },
  }
})
vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({}), createServiceClient: () => ({}) }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

async function llamar(headers: Record<string, string>) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'livestock_prices', arguments: {} } }),
  })
  return (await (await POST(req)).json()).result as {
    content: { text: string }[]
    structuredContent?: { prices: Record<string, { estimado: boolean; metodo: string | null }> }
  }
}

describe('livestock_prices: observado por otra fuente', () => {
  it('el ternero de MAGyP sale observado, con fuente y fecha, y sin ESTIMADO', async () => {
    const r = await llamar({ 'user-agent': 'test-client/1.0', 'mcp-protocol-version': '2025-06-18' })
    const texto = r.content[0].text
    expect(texto).toMatch(/^terneros: .*· fuente: MAGyP · Entre Surcos y Corrales \(mensual\) \(2026-10\)$/m)
    expect(texto).not.toMatch(/^terneros: .*ESTIMADO/m)
    expect(r.structuredContent?.prices.terneros).toMatchObject({ estimado: false, metodo: null })
  })

  it('una categoría derivada sin `observado` sigue saliendo ESTIMADO (control)', async () => {
    const r = await llamar({ 'user-agent': 'test-client/1.0', 'mcp-protocol-version': '2025-06-18' })
    expect(r.content[0].text).toMatch(/^toros: .*· ESTIMADO: INMAG × 0,65/m)
    expect(r.structuredContent?.prices.toros.estimado).toBe(true)
  })
})
