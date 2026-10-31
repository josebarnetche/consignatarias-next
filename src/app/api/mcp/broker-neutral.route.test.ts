/**
 * find_livestock_broker devuelve el directorio NEUTRAL (MCP 1.9.1, v1.254.10).
 *
 * Por qué existe: entre el 17-10 y el 30-10-2026 las firmas PRO salían primero en
 * esta tool, con "★ PRO · … · pro: true". Eso es contenido promocionado, y el
 * directorio de conectores de Claude pregunta si el servidor lo devuelve. La
 * respuesta tiene que ser "No" y este test la sostiene: aunque `getFeaturedSlugs`
 * diga que una firma es PRO, la tool no la adelanta ni la marca.
 *
 * La base y el log están simulados: no se lee ni se escribe nada en producción.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Datos ficticios. La firma PRO viene ÚLTIMA en el orden de la base a propósito.
const FIRMAS = [
  { display_name: 'Ganadera Uno', canonical_slug: 'ganadera-uno', province: 'Entre Ríos', location: 'Paraná', category: 'Consignataria', phone: null, whatsapp: null, website: null, cuit: null },
  { display_name: 'Ganadera Dos', canonical_slug: 'ganadera-dos', province: 'Entre Ríos', location: 'Victoria', category: 'Consignataria', phone: null, whatsapp: null, website: null, cuit: null },
  { display_name: 'Ganadera Pro', canonical_slug: 'ganadera-pro', province: 'Entre Ríos', location: 'Concordia', category: 'Consignataria', phone: null, whatsapp: null, website: null, cuit: null },
]

const limites: number[] = []
const featured = vi.fn(async () => new Set(['ganadera-pro']))

function builder() {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'in', 'order', 'eq', 'gte', 'or', 'ilike']) b[m] = self
  b.limit = (n: number) => {
    limites.push(n)
    return b
  }
  b.then = (res: (v: unknown) => void) => res({ data: FIRMAS.slice(0, limites.at(-1) ?? FIRMAS.length), error: null })
  return b
}

vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({ from: builder }), createServiceClient: () => ({ from: builder }) }))
vi.mock('@/lib/featured', () => ({ getFeaturedSlugs: featured }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

async function llamar(args: Record<string, unknown>) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'find_livestock_broker', arguments: args } }),
  })
  const res = await POST(req)
  const json = await res.json()
  return json.result as { content: { text: string }[]; isError?: boolean; structuredContent?: unknown }
}

describe('find_livestock_broker: orden neutral, sin marca PRO', () => {
  it('respeta el orden de la base: la PRO no salta adelante', async () => {
    const r = await llamar({ provincia: 'Entre Ríos', limite: 3 })
    const t = r.content[0].text
    expect(r.isError).toBeFalsy()
    const pos = ['Ganadera Uno', 'Ganadera Dos', 'Ganadera Pro'].map((n) => t.indexOf(n))
    expect(pos.every((p) => p >= 0)).toBe(true)
    expect(pos).toEqual([...pos].sort((a, b) => a - b))
  })

  it('no marca a nadie como PRO ni devuelve una clave `pro`', async () => {
    const r = await llamar({ provincia: 'Entre Ríos', limite: 3 })
    const t = r.content[0].text
    expect(t).not.toMatch(/★|\bPRO\b|pro:\s*true/)
    expect(JSON.stringify(r)).not.toMatch(/"pro"\s*:/)
  })

  it('no consulta el estado PRO ni trae filas de más para reordenar', async () => {
    limites.length = 0
    featured.mockClear()
    await llamar({ provincia: 'Entre Ríos', limite: 2 })
    expect(featured).not.toHaveBeenCalled()
    expect(limites).toEqual([2])
  })

  it('subscribe_broker_pro no promete lugar en el MCP ni en los agentes de IA', () => {
    const route = readFileSync(join(process.cwd(), 'src/app/api/mcp/route.ts'), 'utf8')
    const card = readFileSync(join(process.cwd(), 'public/.well-known/mcp/server-card.json'), 'utf8')
    for (const txt of [route, card]) {
      expect(txt).not.toMatch(/primera en el directorio que consultan/i)
      expect(txt).not.toMatch(/este MCP\)/)
    }
    expect(route).not.toMatch(/getFeaturedSlugs/)
  })
})
