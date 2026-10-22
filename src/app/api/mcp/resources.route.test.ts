/**
 * Resources y completions del server MCP, de punta a punta por el handler
 * JSON-RPC, con la base y el log simulados: no se lee ni se escribe producción.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

function builder() {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'in', 'order', 'limit', 'eq', 'gte', 'lte', 'or', 'ilike', 'range']) b[m] = self
  b.then = (res: (v: unknown) => void) => res({ data: [], error: null })
  return b
}

vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({ from: builder }), createServiceClient: () => ({ from: builder }) }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

type Rpc = { result?: Record<string, unknown>; error?: { code: number; message: string } }

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<Rpc> {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const res = await POST(req)
  return (await res.json()) as Rpc
}

async function leer(uri: string) {
  const r = await rpc('resources/read', { uri })
  const contents = (r.result?.contents ?? []) as { uri: string; mimeType: string; text: string }[]
  return { r, contents, json: contents[0] ? (JSON.parse(contents[0].text) as Record<string, unknown>) : null }
}

describe('MCP resources', () => {
  it('initialize declara resources y completions', async () => {
    const r = await rpc('initialize', { protocolVersion: '2025-06-18', clientInfo: { name: 'test', version: '0' } })
    const caps = r.result?.capabilities as Record<string, unknown>
    expect(caps.resources).toEqual({})
    expect(caps.completions).toEqual({})
    expect(caps.tools).toBeDefined()
    expect(caps.prompts).toBeDefined()
  })

  it('resources/list devuelve al menos 4 recursos con mimeType JSON', async () => {
    const r = await rpc('resources/list')
    const lista = r.result?.resources as { uri: string; name: string; title: string; description: string; mimeType: string }[]
    expect(lista.length).toBeGreaterThanOrEqual(4)
    for (const x of lista) {
      expect(x.uri).toMatch(/^consignatarias:\/\//)
      expect(x.name && x.title && x.description).toBeTruthy()
      expect(x.mimeType).toBe('application/json')
    }
  })

  it('resources/templates/list devuelve al menos 2 templates', async () => {
    const r = await rpc('resources/templates/list')
    const lista = r.result?.resourceTemplates as { uriTemplate: string }[]
    expect(lista.length).toBeGreaterThanOrEqual(2)
    expect(lista.map((t) => t.uriTemplate)).toEqual(
      expect.arrayContaining(['consignatarias://remates/provincia/{provincia}', 'consignatarias://tierra/{provincia}']),
    )
  })

  it('cada URI se lee como JSON parseable con fuente citada', async () => {
    const { result } = await rpc('resources/list')
    const uris = (result?.resources as { uri: string }[]).map((x) => x.uri)
    uris.push('consignatarias://remates/provincia/Buenos%20Aires', 'consignatarias://tierra/Corrientes')
    for (const uri of uris) {
      const { r, contents, json } = await leer(uri)
      expect(r.error, uri).toBeUndefined()
      expect(contents[0].uri).toBe(uri)
      expect(contents[0].mimeType).toBe('application/json')
      expect(json?.fuente, uri).toMatch(/utm_source=mcp/)
      expect(json?.fuente, uri).toMatch(/utm_campaign=resource/)
    }
  })

  it('el INMAG va acotado a 90 días, no la serie completa', async () => {
    const { json } = await leer('consignatarias://inmag/ultimos-90-dias')
    const serie = json?.serie as { fecha: string }[]
    expect(serie.length).toBeGreaterThan(0)
    const desde = Date.parse(serie[0].fecha)
    const hasta = Date.parse(serie[serie.length - 1].fecha)
    expect((hasta - desde) / 86_400_000).toBeLessThanOrEqual(90)
  })

  it('provincias sin zonas; tierra/{provincia} trae el detalle de zonas', async () => {
    const { json } = await leer('consignatarias://catalogo/provincias')
    const provs = json?.provincias as Record<string, unknown>[]
    expect(provs.length).toBeGreaterThan(0)
    expect(provs.every((p) => !('zona' in p))).toBe(true)
    const t = await leer('consignatarias://tierra/cordoba')
    expect(t.json?.provincia).toBe('Córdoba')
    expect((t.json?.zonas as unknown[]).length).toBeGreaterThan(0)
  })

  it('el template de remates filtra por provincia', async () => {
    const todos = (await leer('consignatarias://remates/proximos')).json?.remates as { provincia: string | null }[]
    const prov = todos.find((r) => r.provincia)?.provincia ?? 'Buenos Aires'
    const { json } = await leer(`consignatarias://remates/provincia/${encodeURIComponent(prov)}`)
    const lista = json?.remates as { provincia: string | null }[]
    expect(json?.provincia).toBe(prov)
    expect(lista.length).toBeLessThanOrEqual(50)
    for (const r of lista) expect(r.provincia).toBe(prov)
    const ninguna = (await leer('consignatarias://remates/provincia/Atlantida')).json?.remates as unknown[]
    expect(ninguna).toEqual([])
  })

  it('una URI desconocida devuelve -32002', async () => {
    for (const uri of ['consignatarias://no/existe', 'consignatarias://tierra/Narnia', 'https://evil.example/']) {
      const r = await rpc('resources/read', { uri })
      expect(r.error?.code, uri).toBe(-32002)
      expect(r.result).toBeUndefined()
    }
  })
})

describe('MCP completion/complete', () => {
  async function completar(ref: Record<string, unknown>, name: string, value: string, context?: Record<string, unknown>) {
    const r = await rpc('completion/complete', { ref, argument: { name, value }, ...(context ? { context } : {}) })
    return r.result?.completion as { values: string[]; total: number; hasMore: boolean }
  }

  it('provincia "cor" en un prompt → Córdoba y Corrientes', async () => {
    const c = await completar({ type: 'ref/prompt', name: 'remates_provincia' }, 'provincia', 'cor')
    expect(c.values).toEqual(expect.arrayContaining(['Córdoba', 'Corrientes']))
    expect(c.values.every((v) => /^c[oó]r/i.test(v))).toBe(true)
    expect(c.total).toBe(c.values.length)
    expect(c.hasMore).toBe(false)
  })

  it('sin distinguir acentos ni mayúsculas, y en el template de tierra', async () => {
    const c = await completar({ type: 'ref/resource', uri: 'consignatarias://tierra/{provincia}' }, 'provincia', 'CÓR')
    expect(c.values).toEqual(expect.arrayContaining(['Córdoba', 'Corrientes']))
  })

  it('categoria y zona (filtrada por la provincia del contexto)', async () => {
    const cat = await completar({ type: 'ref/prompt', name: 'value_cattle_lot' }, 'categoria', 'nov')
    expect(cat.values).toEqual(expect.arrayContaining(['novillos', 'novillitos']))
    const zona = await completar({ type: 'ref/prompt', name: 'tasar_campo' }, 'zona', '', { arguments: { provincia: 'Córdoba' } })
    expect(zona.values.length).toBeGreaterThan(0)
    expect(zona.values.length).toBeLessThanOrEqual(100)
  })

  it('prompt desconocido → -32602', async () => {
    const r = await rpc('completion/complete', { ref: { type: 'ref/prompt', name: 'no_existe' }, argument: { name: 'provincia', value: '' } })
    expect(r.error?.code).toBe(-32602)
  })
})
