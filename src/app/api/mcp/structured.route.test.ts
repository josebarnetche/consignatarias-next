/**
 * structuredContent + outputSchema (MCP 2025-06-18) en las tools principales.
 *
 * Regla de compatibilidad: lo estructurado se SUMA al texto de `content`, no lo
 * reemplaza. La integración anónima de Misiones recibe el JSON idéntico a main
 * (lo prueba integracion.test.ts). Sin snapshots del texto: dependen de
 * remates.json y de las bandas VR, que cambian todos los días.
 *
 * Base y log simulados: no se escribe nada en producción.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

const LEADS = [
  { id: 1, created_at: '2026-10-15T12:00:00.000Z', intent: 'comprar', category: 'terneros', head_count: 60, hectareas: null, province: 'Entre Ríos', zona: 'Gualeguaychú', name: 'Feedlot Secreto', phone: '1155500001', email: 'a@feedlot.com', status: 'new', fee_ars: null },
  { id: 2, created_at: '2026-10-16T12:00:00.000Z', intent: 'comprar', category: 'terneros', head_count: 45, hectareas: null, province: 'Santa Fe', zona: null, name: 'Otro Secreto', phone: '1155500002', email: 'b@feedlot.com', status: 'new', fee_ars: null },
]

function builder(table: string) {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'in', 'order', 'limit', 'eq', 'gte', 'or', 'ilike', 'range']) b[m] = self
  b.insert = () => ({ select: () => ({ single: async () => ({ data: { id: 99 }, error: null }) }) })
  b.then = (res: (v: unknown) => void) => res({ data: table === 'producer_leads' ? LEADS : [], error: null })
  return b
}

vi.mock('@/lib/supabase', () => ({ requireServiceClient: () => ({ from: builder }), createServiceClient: () => ({ from: builder }) }))
vi.mock('@/lib/ops', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/rate-limit-db', () => ({ enforceRateLimit: async () => ({ ok: true }), clientIp: () => '1.2.3.4' }))

// Fecha fija: los snapshots dependen de "hoy" (remates próximos y la línea de cita).
const AHORA = new Date('2026-10-21T15:00:00.000Z')
beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'], now: AHORA }) })
afterAll(() => { vi.useRealTimers() })

type Resultado = {
  content: { type: string; text: string }[]
  isError?: boolean
  structuredContent?: Record<string, unknown>
}

// Por defecto un cliente que se identifica (UA). Las integraciones anónimas tienen
// su propio contrato (texto idéntico a main) y se prueban aparte.
async function rpc(method: string, params?: Record<string, unknown>, headers: Record<string, string> = { 'user-agent': 'test-client/1.0', 'mcp-protocol-version': '2025-06-18' }) {
  const { POST } = await import('./route')
  const req = new NextRequest('https://x/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const res = await POST(req)
  return (await res.json()).result
}

const llamar = (name: string, args: Record<string, unknown> = {}) =>
  rpc('tools/call', { name, arguments: args }) as Promise<Resultado>

// Las llamadas que hace la integración real de Misiones (por alias o canónico).
const CASOS_MISIONES: [string, string, Record<string, unknown>][] = [
  ['cattle_price_index', 'cattle_price_index', {}],
  ['livestock_prices', 'livestock_prices', {}],
  ['livestock_prices categoria', 'livestock_prices', { categoria: 'novillos' }],
  ['macro_context', 'macro_context', {}],
  ['upcoming_auctions', 'upcoming_auctions', { limite: 5 }],
  ['upcoming_auctions Misiones', 'upcoming_auctions', { provincia: 'Misiones' }],
  ['upcoming_auctions Buenos Aires', 'upcoming_auctions', { provincia: 'Buenos Aires', limite: 3 }],
  ['alias get_indice_novillo', 'get_indice_novillo', {}],
  ['alias list_remates Misiones', 'list_remates', { provincia: 'Misiones' }],
  // No son de Misiones, pero el texto tampoco puede cambiar.
  ['value_cattle_lot', 'value_cattle_lot', { categoria: 'novillos', cabezas: 350, provincia: 'Formosa' }],
  ['market_match', 'market_match', { quiere: 'vender', categoria: 'terneros', cabezas: 80, provincia: 'Entre Ríos' }],
  ['market_match registro', 'market_match', { quiere: 'vender', categoria: 'terneros', cabezas: 80, registrar: true, nombre: 'Ana Ruiz', email: 'ana@campo.com', consentimiento: true }],
]


// ── Validador mínimo de JSON Schema (type / required / properties / items /
// enum / additionalProperties). Sin dependencias nuevas: alcanza para los
// outputSchema de este server.
type Schema = {
  type?: string | string[]
  required?: string[]
  properties?: Record<string, Schema>
  additionalProperties?: Schema | boolean
  items?: Schema
  enum?: unknown[]
}
function tipoDe(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}
function validar(v: unknown, s: Schema, ruta = '$'): string[] {
  const errores: string[] = []
  if (s.type) {
    const tipos = Array.isArray(s.type) ? s.type : [s.type]
    const t = tipoDe(v)
    const okTipo = tipos.some((x) => x === t || (x === 'integer' && t === 'number' && Number.isInteger(v)))
    if (!okTipo) return [`${ruta}: se esperaba ${tipos.join('|')}, vino ${t}`]
  }
  if (s.enum && !s.enum.includes(v)) errores.push(`${ruta}: ${JSON.stringify(v)} fuera del enum`)
  if (tipoDe(v) === 'object') {
    const o = v as Record<string, unknown>
    for (const k of s.required ?? []) if (!(k in o)) errores.push(`${ruta}.${k}: falta (required)`)
    for (const [k, val] of Object.entries(o)) {
      const sub = s.properties?.[k]
      if (sub) errores.push(...validar(val, sub, `${ruta}.${k}`))
      else if (s.additionalProperties === false) errores.push(`${ruta}.${k}: propiedad no declarada`)
      else if (s.additionalProperties && typeof s.additionalProperties === 'object') errores.push(...validar(val, s.additionalProperties, `${ruta}.${k}`))
    }
  }
  if (tipoDe(v) === 'array' && s.items) (v as unknown[]).forEach((x, i) => errores.push(...validar(x, s.items!, `${ruta}[${i}]`)))
  return errores
}

const ESTRUCTURADAS = ['cattle_price_index', 'livestock_prices', 'macro_context', 'upcoming_auctions', 'value_cattle_lot', 'market_match']
const ALIAS: Record<string, string> = { get_indice_novillo: 'cattle_price_index', list_remates: 'upcoming_auctions' }

async function schemas() {
  const { tools } = (await rpc('tools/list')) as { tools: { name: string; outputSchema?: Schema }[] }
  return tools
}

describe('structuredContent + outputSchema', () => {
  it('el validador del test detecta errores (control)', () => {
    expect(validar({ a: 1 }, { type: 'object', required: ['a', 'b'], properties: { a: { type: 'string' } } })).toHaveLength(2)
    expect(validar({ a: [1, 'x'] }, { type: 'object', properties: { a: { type: 'array', items: { type: 'number' } } } })).toHaveLength(1)
  })

  it('tools/list anuncia outputSchema en las 6 y en ninguna otra', async () => {
    const tools = await schemas()
    for (const n of ESTRUCTURADAS) {
      const t = tools.find((x) => x.name === n)
      expect(t?.outputSchema, n).toBeTruthy()
      expect(t!.outputSchema!.type).toBe('object')
      expect(t!.outputSchema!.required).toContain('fuente')
    }
    const conSchema = tools.filter((t) => 'outputSchema' in t).map((t) => t.name).sort()
    expect(conSchema).toEqual([...ESTRUCTURADAS].sort())
  })

  const CASOS: [string, string, Record<string, unknown>][] = [
    ...CASOS_MISIONES,
    ['value_cattle_lot sin banda', 'value_cattle_lot', { categoria: 'terneros', cabezas: 100 }],
  ]

  for (const [titulo, name, args] of CASOS) {
    it(`${titulo}: structuredContent valida contra su outputSchema`, async () => {
      const canonico = ALIAS[name] ?? name
      const schema = (await schemas()).find((t) => t.name === canonico)!.outputSchema!
      const r = await llamar(name, args)
      expect(r.isError).toBeFalsy()
      expect(r.structuredContent, titulo).toBeTruthy()
      expect(validar(r.structuredContent, schema)).toEqual([])
      const f = r.structuredContent!.fuente as { url: string; consultado: string }
      expect(f.url).toContain('utm_source=mcp')
      expect(f.url).toContain(`utm_campaign=${canonico}`)
      expect(f.consultado).toBe('2026-10-21')
      // La URL de la cita estructurada es la misma que la de la línea de texto.
      expect(r.content.at(-1)!.text).toContain(f.url)
    })
  }

  it('los números del objeto son los mismos del JSON del texto', async () => {
    for (const n of ['cattle_price_index', 'macro_context', 'livestock_prices']) {
      const r = await llamar(n)
      const json = r.content[0].text.split('\n').find((l) => l.startsWith('{'))!
      const resto = { ...r.structuredContent }
      delete resto.fuente
      expect(resto, n).toEqual(JSON.parse(json))
    }
  })

  it('value_cattle_lot: el total del objeto es el del texto', async () => {
    const r = await llamar('value_cattle_lot', { categoria: 'novillos', cabezas: 350, provincia: 'Formosa' })
    const sc = r.structuredContent as { valuacion: { central_ars: number }; origen: string }
    expect(r.content[0].text).toContain(`CENTRAL: $${Math.round(sc.valuacion.central_ars).toLocaleString('es-AR')}`)
    expect(sc.origen).toMatch(/MAG/)
  })

  it('upcoming_auctions en una provincia sin remates: remates vacío, región y sugerencia', async () => {
    const r = await llamar('upcoming_auctions', { provincia: 'Misiones' })
    const sc = r.structuredContent as { remates: unknown[]; region: { nombre: string; remates: { consignataria: string; date: string }[] }; sugerencia: string }
    expect(sc.remates).toEqual([])
    expect(sc.region.nombre).toBe('el NEA')
    expect(sc.region.remates.length).toBeGreaterThan(0)
    for (const x of sc.region.remates) expect(r.content[0].text).toContain(`${x.date}`)
    expect(r.content[0].text).toContain(sc.sugerencia)
  })

  it('market_match: solo el panorama agregado, nunca datos de un lead', async () => {
    const r = await llamar('market_match', { quiere: 'vender', categoria: 'terneros', cabezas: 80, provincia: 'Entre Ríos' })
    const sc = r.structuredContent!
    // Sin probabilidad: su pico aislaba a un lead suelto (revisión del 21-10-2026).
    expect(Object.keys(sc).sort()).toEqual(['fuente', 'grupos', 'hay', 'ladoBuscado', 'vertical'])
    expect(sc.grupos).toEqual([{ zona: 'la zona núcleo', rango: '2 a 4' }])
    expect(JSON.stringify(sc)).not.toMatch(/Secreto|feedlot\.com|11555|Gualeguaychú|Santa Fe/)
  })

  it('market_match registro: siempre { registrado: true }, sin número ni duplicado', async () => {
    // Distinguir nuevo de duplicado decía si un email ajeno tenía un pedido abierto.
    const r = await llamar('market_match', { quiere: 'vender', categoria: 'terneros', cabezas: 80, registrar: true, nombre: 'Ana Ruiz', email: 'ana@campo.com', consentimiento: true })
    const resto = { ...r.structuredContent }
    delete resto.fuente
    expect(resto).toEqual({ registrado: true })
    expect(r.content[0].text).not.toMatch(/#\d|ya estaba/)
  })

  describe('integración anónima (sin UA ni key): el resultado es el de main', () => {
    const anonimo = (name: string, args: Record<string, unknown> = {}) =>
      rpc('tools/call', { name, arguments: args }, {}) as Promise<Resultado & { _meta?: Record<string, unknown> }>

    it('por alias: solo content, sin cita, aviso, structuredContent ni _meta', async () => {
      const r = await anonimo('get_indice_novillo')
      expect(Object.keys(r)).toEqual(['content'])
      expect(r.content.map((b) => b.text).join('')).not.toMatch(/Cómo citar|Integraste/)
    })

    it('list_remates de Misiones: el vacío de siempre y nada más', async () => {
      const r = await anonimo('list_remates', { provincia: 'Misiones' })
      expect(r).toEqual({ content: [{ type: 'text', text: 'No hay remates próximos con esos filtros.' }] })
    })

    it('por nombre canónico: la cita en el texto como en main, el aviso no', async () => {
      const r = await anonimo('cattle_price_index')
      const texto = r.content.map((b) => b.text).join('')
      expect(texto).toMatch(/Cómo citar/)
      expect(texto).not.toMatch(/Integraste/)
      expect(Object.keys(r)).toEqual(['content'])
    })
  })

  describe('cliente que no negoció 2025-06-18', () => {
    it('no recibe structuredContent ni outputSchema', async () => {
      const viejo = { 'user-agent': 'cliente-viejo/1.0', 'mcp-protocol-version': '2025-03-26' }
      const r = (await rpc('tools/call', { name: 'cattle_price_index', arguments: {} }, viejo)) as Resultado
      expect(r.structuredContent).toBeUndefined()
      const lista = (await rpc('tools/list', {}, viejo)) as { tools: { outputSchema?: unknown }[] }
      expect(lista.tools.some((t) => t.outputSchema)).toBe(false)
    })
  })


  it('por alias get_indice_novillo trae structuredContent con la fuente canónica', async () => {
    const r = await llamar('get_indice_novillo')
    expect(r.structuredContent).toBeTruthy()
    expect(r.structuredContent!.fuente).toEqual({
      url: 'https://www.consignatarias.com.ar/mercado/inmag?utm_source=mcp&utm_medium=agente&utm_campaign=cattle_price_index',
      consultado: '2026-10-21',
    })
  })

  it('un error no trae structuredContent', async () => {
    const malos: [string, Record<string, unknown>][] = [
      ['livestock_prices', { categoria: 'jirafas' }],
      ['value_cattle_lot', { categoria: 'jirafas', cabezas: 10 }],
      ['market_match', { quiere: 'robar' }],
      ['market_match', { quiere: 'vender', categoria: 'terneros', registrar: true, nombre: 'Ana', email: 'ana@x.com' }],
    ]
    for (const [n, a] of malos) {
      const r = await llamar(n, a)
      expect(r.isError, n).toBe(true)
      expect(r, n).not.toHaveProperty('structuredContent')
    }
  })

  it('una tool sin outputSchema no devuelve structuredContent', async () => {
    const r = await llamar('good_farming_practices', { tema: 'agua' })
    expect(r).not.toHaveProperty('structuredContent')
  })
})
