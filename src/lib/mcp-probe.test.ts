import { describe, it, expect } from 'vitest'
import { esProbe, esValorVacio, esFirmaEscaner } from './mcp-probe'

describe('esProbe — escáneres por UA / clientInfo', () => {
  it.each([
    'python-requests/2.32.3',
    'agentstatus-gate/1.0 (+https://agentstatus.dev)',
    'BrickBlue/0.4',
    'honestas-mcp-scanner/1.2',
    'Mozilla/5.0 (compatible; fixter/1.0)',
    'mcp-scanner',
  ])('UA %s es probe aunque la llamada salga bien', (ua) => {
    expect(esProbe({ ua, args: { provincia: 'Corrientes' }, isError: false })).toBe(true)
  })

  it.each(['glimind-probe', 'glama', 'mcpbeat', 'Siglume MCP Router'])('clientInfo %s es probe', (clientName) => {
    expect(esProbe({ ua: null, clientName, args: {} })).toBe(true)
  })

  it('un cliente legítimo no es probe', () => {
    expect(esProbe({ ua: 'claude-code/2.1.0', clientName: 'claude-ai', args: { categoria: 'novillos' } })).toBe(false)
    expect(esFirmaEscaner('Cursor/1.4')).toBe(false)
  })
})

describe('esProbe — argumentos vacíos', () => {
  it('la integración de Misiones (UA vacía, provincia) NO es probe', () => {
    expect(esProbe({ ua: '', args: { provincia: 'Misiones' }, isError: false })).toBe(false)
    expect(esProbe({ ua: null, clientName: null, args: { provincia: 'Misiones' }, isError: true, required: ['provincia'] })).toBe(false)
  })

  it('tool con obligatorios, todos vacíos o en cero → probe', () => {
    expect(esProbe({ ua: '', args: { categoria: '', cabezas: 0 }, isError: true, required: ['categoria'] })).toBe(true)
    expect(esProbe({ ua: '', args: {}, required: ['slug'] })).toBe(true)
    expect(esProbe({ ua: '', args: { renspa: '0' }, required: ['renspa'] })).toBe(true)
  })

  it('con al menos un obligatorio cargado no es probe', () => {
    expect(esProbe({ ua: '', args: { categoria: 'terneros', cabezas: 0 }, isError: false, required: ['categoria'] })).toBe(false)
  })

  it('sin schema: error + todo vacío → probe; sin error → no', () => {
    expect(esProbe({ ua: '', args: { a: '', b: 0, c: false, d: [], e: {} }, isError: true })).toBe(true)
    expect(esProbe({ ua: '', args: undefined, isError: true })).toBe(true)
    // macro_context no tiene parámetros: llamarla sin args y que responda es uso real.
    expect(esProbe({ ua: '', args: {}, isError: false })).toBe(false)
  })

  it('un error real con argumentos cargados no es probe', () => {
    expect(esProbe({ ua: '', args: { categoria: 'jirafas' }, isError: true })).toBe(false)
  })
})

describe('esValorVacio', () => {
  it('reconoce los ceros de un escáner', () => {
    for (const v of [undefined, null, '', '  ', '0', 0, Number.NaN, false, [], {}]) expect(esValorVacio(v)).toBe(true)
    for (const v of ['Misiones', 1, true, [1], { a: 1 }]) expect(esValorVacio(v)).toBe(false)
  })
})
