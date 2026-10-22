/**
 * cattle_buying_request: el pedido solo pasa al agente si la persona aceptó que
 * la contacten para operar (v1.244.0). Sin contacto_para_operar === true, el
 * pedido genera avisos de remates y nada más.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const crearDemanda = vi.fn(async () => ({ id: 7, matches: [] }))
vi.mock('@/lib/demanda', async (orig) => ({ ...(await orig<typeof import('@/lib/demanda')>()), crearDemanda }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

async function pedir(args: Record<string, unknown>) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'test/1.0' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'cattle_buying_request', arguments: args } }),
  })
  return (await (await POST(req)).json()).result
}

describe('cattle_buying_request y el consentimiento para operar', () => {
  beforeEach(() => crearDemanda.mockClear())

  it('sin contacto_para_operar no consiente', async () => {
    await pedir({ categoria: 'novillos', email: 'a@b.com' })
    expect(crearDemanda).toHaveBeenCalledWith(expect.objectContaining({ consienteContacto: false }))
  })

  it('solo true literal consiente', async () => {
    await pedir({ categoria: 'novillos', email: 'a@b.com', contacto_para_operar: 'true' })
    expect(crearDemanda).toHaveBeenLastCalledWith(expect.objectContaining({ consienteContacto: false }))
    await pedir({ categoria: 'novillos', email: 'a@b.com', contacto_para_operar: true })
    expect(crearDemanda).toHaveBeenLastCalledWith(expect.objectContaining({ consienteContacto: true }))
  })

  it('el parámetro está anunciado en tools/list', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('https://x/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'test/1.0' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
    const { tools } = (await (await POST(req)).json()).result
    const t = tools.find((x: { name: string }) => x.name === 'cattle_buying_request')
    expect(t.inputSchema.properties.contacto_para_operar.type).toBe('boolean')
  })
})
