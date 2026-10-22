import { beforeAll, describe, expect, it } from 'vitest'
import {
  DIAS_VIGENCIA,
  MAX_CONFIRMACIONES_DIA,
  elegirParaConfirmar,
  pedirConfirmacion,
  pedirConfirmaciones,
  tokenConfirmacion,
  tokenConfirmacionValido,
  urlConfirmacion,
  vigente,
  type LeadConfirmable,
} from './confirmacion'

beforeAll(() => {
  process.env.AGENTE_CONFIRM_SECRET = 'secreto-de-prueba'
})

// Martes 22-10-2026, 11:00 ART (14:00 UTC): día hábil, en horario.
const HABIL = new Date('2026-10-22T14:00:00Z')
// Domingo.
const DOMINGO = new Date('2026-10-25T14:00:00Z')

function lead(o: Partial<LeadConfirmable> = {}): LeadConfirmable {
  return {
    id: 60,
    intent: 'comprar',
    category: 'terneros',
    head_count: 80,
    province: 'Entre Ríos',
    zona: null,
    name: 'Juan Pérez',
    email: 'juan@example.com',
    status: 'needs_review',
    source: 'mcp:market_match',
    created_at: '2026-10-21T10:00:00Z',
    ...o,
  }
}

const base = { ahora: HABIL, yaPedidos: new Set<number>(), escritosHoy: new Set<string>(), bajas: new Set<string>(), enviadosHoy: 0 }

describe('token', () => {
  it('vale solo para el mismo lead y el mismo mail', () => {
    const t = tokenConfirmacion(60, 'Juan@Example.com ')
    expect(t).toHaveLength(22)
    expect(tokenConfirmacionValido(60, 'juan@example.com', t)).toBe(true)
    expect(tokenConfirmacionValido(61, 'juan@example.com', t)).toBe(false)
    expect(tokenConfirmacionValido(60, 'otro@example.com', t)).toBe(false)
    expect(tokenConfirmacionValido(60, 'juan@example.com', null)).toBe(false)
    expect(tokenConfirmacionValido(60, 'juan@example.com', 'x')).toBe(false)
  })
  it('el link lleva el lead y el token, sin el mail', () => {
    const u = urlConfirmacion(60, 'juan@example.com', 'https://x.test')
    expect(u).toMatch(/^https:\/\/x\.test\/confirmar-pedido\?lead=60&t=[\w-]{22}$/)
    expect(u).not.toContain('juan')
  })
  it(`vence a los ${DIAS_VIGENCIA} días`, () => {
    expect(vigente('2026-10-21T10:00:00Z', HABIL)).toBe(true)
    expect(vigente('2026-10-01T10:00:00Z', HABIL)).toBe(false)
  })
})

describe('elegirParaConfirmar', () => {
  it('pide al lead de tercero sin verificar', () => {
    expect(elegirParaConfirmar([lead()], base).map((l) => l.id)).toEqual([60])
    expect(elegirParaConfirmar([lead({ source: 'demanda_compra:7' })], base)).toHaveLength(1)
  })
  it('no fuera de días hábiles', () => {
    expect(elegirParaConfirmar([lead()], { ...base, ahora: DOMINGO })).toEqual([])
  })
  it('una sola vez por lead', () => {
    expect(elegirParaConfirmar([lead()], { ...base, yaPedidos: new Set([60]) })).toEqual([])
  })
  it('BAJA para siempre y nadie dos veces el mismo día', () => {
    expect(elegirParaConfirmar([lead()], { ...base, bajas: new Set(['juan@example.com']) })).toEqual([])
    expect(elegirParaConfirmar([lead()], { ...base, escritosHoy: new Set(['juan@example.com']) })).toEqual([])
    expect(elegirParaConfirmar([lead({ id: 1 }), lead({ id: 2, email: 'JUAN@example.com' })], base).map((l) => l.id)).toEqual([1])
  })
  it('no a leads ya verificados, de la web, sin mail o vencidos', () => {
    expect(elegirParaConfirmar([lead({ status: 'new' })], base)).toEqual([])
    expect(elegirParaConfirmar([lead({ source: 'web' })], base)).toEqual([])
    expect(elegirParaConfirmar([lead({ email: null })], base)).toEqual([])
    expect(elegirParaConfirmar([lead({ created_at: '2026-09-01T00:00:00Z' })], base)).toEqual([])
  })
  it('respeta el tope diario', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => lead({ id: i + 1, email: `p${i}@example.com` }))
    expect(elegirParaConfirmar(muchos, base)).toHaveLength(MAX_CONFIRMACIONES_DIA)
    expect(elegirParaConfirmar(muchos, { ...base, enviadosHoy: MAX_CONFIRMACIONES_DIA - 2 })).toHaveLength(2)
  })
})

describe('pedirConfirmacion', () => {
  it('dice qué se pidió, trae el link y no promete nada si no confirma', () => {
    const c = pedirConfirmacion(lead())
    expect(c.asunto).toContain('comprar 80 terneros en Entre Ríos')
    expect(c.texto).toContain('/confirmar-pedido?lead=60&t=')
    expect(c.texto).toContain('no te vamos a volver a escribir')
    expect(c.texto).toMatch(/^Hola Juan,/)
  })
})

describe('pedirConfirmaciones', () => {
  it('apagado no toca la base', async () => {
    const db = new Proxy({}, { get: () => { throw new Error('no debería consultar') } })
    await expect(pedirConfirmaciones({ db: db as never, ahora: HABIL, dryRun: false, bajas: new Set(), mandar: async () => null, bitacora: async () => null, nota: () => {} }, false)).resolves.toBeUndefined()
  })
})
