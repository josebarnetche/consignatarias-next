import { describe, expect, it } from 'vitest'
import { ordenarCola, prioridadCaso } from './cola'

const caso = (lead_id: number, estado: string, proximo_at: string, comision: number | null) => ({ lead_id, estado, proximo_at, comision })
const com = (c: { comision: number | null }) => c.comision

describe('prioridadCaso', () => {
  it('comisión × peso de la etapa; sin comisión, 0', () => {
    expect(prioridadCaso(1_000_000, 'presentado')).toBe(400_000)
    expect(prioridadCaso(null, 'presentado')).toBe(0)
    expect(prioridadCaso(1_000_000, 'cerrado')).toBe(0)
  })
})

describe('ordenarCola', () => {
  it('el caso que más puede dejar va primero aunque sea el más nuevo', () => {
    const cola = [caso(1, 'ofreciendo', '2026-10-01T00:00:00Z', 50_000), caso(2, 'ofreciendo', '2026-10-20T00:00:00Z', 900_000)]
    expect(ordenarCola(cola, com).map((c) => c.lead_id)).toEqual([2, 1])
  })
  it('a igual prioridad manda el más vencido', () => {
    const cola = [caso(1, 'nuevo', '2026-10-20T00:00:00Z', null), caso(2, 'nuevo', '2026-10-02T00:00:00Z', null)]
    expect(ordenarCola(cola, com).map((c) => c.lead_id)).toEqual([2, 1])
  })
  it('no pierde ni duplica casos y no muta la entrada', () => {
    const cola = [caso(3, 'nuevo', 'x', 10), caso(1, 'presentado', 'x', 10), caso(2, 'ofreciendo', 'x', null)]
    const copia = [...cola]
    const r = ordenarCola(cola, com)
    expect(r.map((c) => c.lead_id).sort()).toEqual([1, 2, 3])
    expect(cola).toEqual(copia)
    expect(r[0].lead_id).toBe(1)
  })
})
