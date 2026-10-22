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
    // Toda demanda cuenta como sin verificar, pero solo frena en needs_review: las de la web entran en new.
    expect(esOrigenSinVerificar('demanda_compra:12')).toBe(true)
    expect(esOrigenSinVerificar('frigorifico:1')).toBe(false)
  })
})

describe('demandas de compra en needs_review (las del MCP, ver PR de demanda.ts)', () => {
  it('una demanda en needs_review no se toma; en new (web o verificada) sí', () => {
    expect(tomable({ status: 'needs_review', source: 'demanda_compra:9' })).toBe(false)
    expect(tomable({ status: 'new', source: 'demanda_compra:9' })).toBe(true)
  })
})

describe('cola de verificación', async () => {
  const { pendienteVerificacion, transicionBloqueada } = await import('./verificacion')
  const mcp = { status: 'needs_review', source: 'mcp:market_match' }
  it('detecta los pendientes de verificar', () => {
    expect(pendienteVerificacion(mcp)).toBe(true)
    expect(pendienteVerificacion({ status: 'needs_review', source: 'demanda_compra:3' })).toBe(true)
    expect(pendienteVerificacion({ status: 'needs_review', source: 'frigorifico:1' })).toBe(false)
    expect(pendienteVerificacion({ status: 'new', source: 'mcp:market_match' })).toBe(false)
  })
  it('verificar (→ new) lo deja tomable por el agente', () => {
    expect(transicionBloqueada(mcp, { status: 'new' })).toBeNull()
    expect(tomable({ ...mcp, status: 'new' })).toBe(true)
  })
  it('avanzar nunca lo deja en routed, contacted ni won', () => {
    for (const s of ['routed', 'contacted', 'won']) expect(transicionBloqueada(mcp, { status: s })).toMatch(/no está verificado/)
    expect(transicionBloqueada(mcp, { rutea: true })).toMatch(/no está verificado/)
  })
  it('descartar o perder sí se puede; los leads normales no cambian', () => {
    expect(transicionBloqueada(mcp, { status: 'discarded' })).toBeNull()
    expect(transicionBloqueada(mcp, { status: 'lost' })).toBeNull()
    expect(transicionBloqueada({ status: 'needs_review', source: null }, { status: 'routed' })).toBeNull()
  })
})
