/**
 * Puente a market_match: los clientes identificados lo reciben en las tools de
 * campos y precios; la integración anónima (Misiones) recibe el texto de siempre.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

async function texto(ua: string | null, name = 'calculate_farmland_rent') {
  const { POST } = await import('./route')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (ua) headers['user-agent'] = ua
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { kg_ha: 40, hectareas: 300 } } }),
  })
  const { result } = await (await POST(req)).json()
  return result.content.map((b: { text: string }) => b.text).join('\n')
}

describe('puente a market_match en la ruta', () => {
  it('un cliente identificado recibe el puente, y la cita sigue cerrando', async () => {
    const t = await texto('claude-desktop/1.0')
    expect(t).toContain('── Si quiere operar ──')
    expect(t.indexOf('── Si quiere operar ──')).toBeLessThan(t.indexOf('── Cómo citar este dato ──'))
  })

  it('la integración anónima no lo recibe', async () => {
    expect(await texto(null)).not.toContain('Si quiere operar')
  })
})
