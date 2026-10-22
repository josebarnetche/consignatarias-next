/**
 * market_match de punta a punta por el handler JSON-RPC, con la base y el log
 * simulados: no se escribe nada en producción.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const insertados: Record<string, unknown>[] = []
const LEADS = [
  { id: 1, created_at: new Date().toISOString(), intent: 'comprar', category: 'terneros', head_count: 60, hectareas: null, province: 'Entre Ríos', zona: 'Gualeguaychú', name: 'Feedlot Secreto', phone: '1155500001', email: 'a@feedlot.com', status: 'new', fee_ars: null },
  { id: 2, created_at: new Date().toISOString(), intent: 'comprar', category: 'terneros', head_count: 45, hectareas: null, province: 'Santa Fe', zona: null, name: 'Otro Secreto', phone: '1155500002', email: 'b@feedlot.com', status: 'new', fee_ars: null },
]

function builder(table: string) {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'in', 'order', 'limit', 'eq', 'gte', 'or', 'ilike']) b[m] = self
  b.insert = (row: Record<string, unknown>) => {
    insertados.push({ table, ...row })
    return { select: () => ({ single: async () => ({ data: { id: 99 }, error: null }) }) }
  }
  b.then = (res: (v: unknown) => void) => res({ data: table === 'producer_leads' ? LEADS : [], error: null })
  return b
}

vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({ from: builder }), createServiceClient: () => ({ from: builder }) }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

async function llamar(args: Record<string, unknown>) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'market_match', arguments: args } }),
  })
  const res = await POST(req)
  const json = await res.json()
  return json.result as { content: { text: string }[]; isError?: boolean }
}

describe('market_match por el handler MCP', () => {
  beforeEach(() => { insertados.length = 0 })

  it('consulta: agrega sin identificar y no escribe', async () => {
    const r = await llamar({ quiere: 'vender', categoria: 'terneros', cabezas: 80, provincia: 'Entre Ríos' })
    const t = r.content[0].text
    expect(r.isError).toBeFalsy()
    expect(t).toMatch(/Hay compradores abiertos de terneros/)
    expect(t).toMatch(/2 a 4 en la zona núcleo/)
    expect(t).not.toMatch(/Secreto|feedlot\.com|11555|Gualeguaychú/)
    expect(t).toMatch(/utm_source=mcp/)
    expect(insertados).toHaveLength(0)
  })

  it('registrar sin consentimiento no escribe', async () => {
    const r = await llamar({ quiere: 'vender', categoria: 'terneros', cabezas: 80, registrar: true, nombre: 'Ana', email: 'ana@x.com' })
    expect(r.isError).toBe(true)
    expect(insertados).toHaveLength(0)
  })

  it('registrar con consentimiento deja el lead en la mesa', async () => {
    const r = await llamar({ quiere: 'vender', categoria: 'terneros', cabezas: 80, provincia: 'Entre Ríos', registrar: true, nombre: 'Ana Ruiz', email: 'ana@campo.com', consentimiento: true })
    expect(r.content[0].text).toMatch(/^Pedido recibido\./)
    expect(r.content[0].text).not.toMatch(/#99/)
    expect(insertados).toHaveLength(1)
    // Entra a revisión: el contacto que manda un agente no está verificado.
    expect(insertados[0]).toMatchObject({ table: 'producer_leads', intent: 'vender', source: 'mcp:market_match', head_count: 80, status: 'needs_review' })
  })
})
