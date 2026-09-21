import { describe, it, expect } from 'vitest'
import { armarResumenSemanal, cambioUltimaSemana } from './mi-ganado-semanal'
import type { RodeoValuado } from './rodeo-vr'

const RODEO = (total: RodeoValuado['total'], sinValuar = 0): RodeoValuado => ({
  lotes: [],
  valuado: { cabezas: 10, kilos: 4500 },
  sinValuar: { cabezas: sinValuar, kilos: sinValuar * 180, categorias: sinValuar ? ['terneros'] : [] },
  total,
  fecha_dato: '2026-09-18',
  ventana: { desde: '2026-08-25', hasta: '2026-09-18' },
  metodologia: 'VR v1.0',
})

describe('cambioUltimaSemana', () => {
  it('compara el último punto con el último de hace 7 días o más', () => {
    const serie = [
      { fecha: '2026-09-08', ars: 100, usd: null },
      { fecha: '2026-09-11', ars: 110, usd: null }, // hace 7 días exactos del 18
      { fecha: '2026-09-16', ars: 115, usd: null },
      { fecha: '2026-09-18', ars: 121, usd: null },
    ]
    expect(cambioUltimaSemana(serie)).toBeCloseTo(10, 6)
  })

  it('sin un punto de hace una semana no inventa la variación', () => {
    expect(cambioUltimaSemana([
      { fecha: '2026-09-16', ars: 100, usd: null },
      { fecha: '2026-09-18', ars: 110, usd: null },
    ])).toBeNull()
    expect(cambioUltimaSemana([])).toBeNull()
  })
})

describe('armarResumenSemanal', () => {
  it('sin valor observado no hay mail', () => {
    expect(armarResumenSemanal(RODEO(null, 40), [])).toBeNull()
  })

  it('el asunto lleva el valor central y la variación de la semana', () => {
    const serie = [
      { fecha: '2026-09-10', ars: 100, usd: null },
      { fecha: '2026-09-18', ars: 102, usd: null },
    ]
    const r = armarResumenSemanal(RODEO({ conservador: 10_000_000, central: 13_050_000, optimista: 16_000_000 }), serie)!
    expect(r.asunto).toBe('Tu rodeo vale $13.050.000 · +2,0 % en la semana')
    expect(r.cambioSemanaPct).toBeCloseTo(2, 6)
  })

  it('sin serie, el asunto no promete una variación', () => {
    const r = armarResumenSemanal(RODEO({ conservador: 1, central: 2, optimista: 3 }), [])!
    expect(r.asunto).toBe('Tu rodeo vale $2')
    expect(r.cambioSemanaPct).toBeNull()
  })

  it('declara las cabezas sin valuar', () => {
    const r = armarResumenSemanal(RODEO({ conservador: 1, central: 2, optimista: 3 }, 40), [])!
    expect(r.sinValuarCabezas).toBe(40)
  })
})
