import { describe, expect, it } from 'vitest'
import { esOrigenSinVerificar, tomable } from './verificacion'

describe('tomable', () => {
  it('un lead del MCP en needs_review NO se toma: el email puede ser de otra persona', () => {
    expect(tomable({ status: 'needs_review', source: 'mcp:market_match' })).toBe(false)
    expect(tomable({ status: 'needs_review', source: 'MCP:otra_tool' })).toBe(false)
  })
  it('verificado por una persona (pasado a new), sí', () => {
    expect(tomable({ status: 'new', source: 'mcp:market_match' })).toBe(true)
  })
  it('los demás orígenes en needs_review siguen como antes', () => {
    expect(tomable({ status: 'needs_review', source: 'frigorifico:30718669592' })).toBe(true)
    expect(tomable({ status: 'needs_review', source: null })).toBe(true)
  })
  it('otros estados no se toman', () => {
    expect(tomable({ status: 'routed', source: null })).toBe(false)
  })
  it('esOrigenSinVerificar', () => {
    expect(esOrigenSinVerificar(' mcp:x')).toBe(true)
    expect(esOrigenSinVerificar('demanda_compra:12')).toBe(false)
  })
})
