import { describe, it, expect } from 'vitest'
import {
  kilosPorCategoria,
  ratiosContraInmag,
  valuarHistorico,
  recortar,
  resumir,
  type LoteItem,
} from './ganado-historial'

const LOTE: LoteItem[] = [
  { categoria: 'novillos', cabezas: 10, peso: 450 }, // 4.500 kg
  { categoria: 'terneros', cabezas: 6, peso: 180 }, //  1.080 kg
]

const INMAG = [
  { date: '2025-09-01', value: 3000 },
  { date: '2026-03-01', value: 4000 },
  { date: '2026-09-01', value: 5000 },
]

const BLUE = [
  { date: '2025-09-01', venta: 1000 },
  { date: '2026-09-01', venta: 1500 },
]

describe('el rodeo en kilos', () => {
  it('suma cabezas por peso y agrupa por categoría', () => {
    const k = kilosPorCategoria(LOTE)
    expect(k.get('novillos')).toBe(4500)
    expect(k.get('terneros')).toBe(1080)
  })

  it('suma dos lotes de la misma categoría', () => {
    const k = kilosPorCategoria([
      { categoria: 'vacas', cabezas: 5, peso: 400 },
      { categoria: 'vacas', cabezas: 3, peso: 400 },
    ])
    expect(k.get('vacas')).toBe(3200)
  })

  it('ignora filas incompletas en vez de contarlas como cero kilos', () => {
    const k = kilosPorCategoria([
      { categoria: 'novillos', cabezas: 10, peso: 0 },
      { categoria: 'toros', cabezas: 0, peso: 550 },
    ])
    expect(k.size).toBe(0)
  })
})

describe('la relación entre categorías y el índice', () => {
  it('saca el ratio de cada categoría contra el INMAG de hoy', () => {
    const r = ratiosContraInmag({ novillos: { current: 5000 }, terneros: { current: 5750 } }, 5000)
    expect(r.get('novillos')).toBe(1)
    expect(r.get('terneros')).toBe(1.15)
  })

  it('con INMAG en cero no inventa ratios', () => {
    expect(ratiosContraInmag({ novillos: { current: 5000 } }, 0).size).toBe(0)
  })
})

describe('valuar el rodeo actual hacia atrás', () => {
  const ratios = new Map([['novillos', 1], ['terneros', 1.15]])
  const serie = valuarHistorico({ lote: LOTE, inmag: INMAG, blue: BLUE, ratios })

  it('devuelve un punto por rueda', () => {
    expect(serie).toHaveLength(3)
  })

  it('el valor de cada fecha usa el precio de ESA fecha', () => {
    // kilos equivalentes = 4.500×1 + 1.080×1,15 = 5.742
    const equivalentes = 4500 + 1080 * 1.15
    expect(serie[0].ars).toBeCloseTo(equivalentes * 3000, 2)
    expect(serie[2].ars).toBeCloseTo(equivalentes * 5000, 2)
  })

  it('la curva sigue al mercado, no a los cambios de rodeo', () => {
    // El mismo lote a lo largo de toda la serie: +66,7 % es lo que subió el índice.
    const r = resumir(serie)!
    expect(r.cambioPctArs).toBeCloseTo(66.67, 1)
  })

  it('convierte a dólares con el blue de cada fecha, no con el de hoy', () => {
    // En 2025-09 el blue estaba 1.000 y en 2026-09 a 1.500: medido en dólares la suba
    // es mucho menor que en pesos, y ésa es justamente la lectura que se busca.
    const r = resumir(serie)!
    expect(r.cambioPctArs).toBeGreaterThan(60)
    expect(r.cambioPctUsd).toBeCloseTo(11.11, 1)
  })

  it('arrastra el último dólar conocido cuando falta el del día', () => {
    // 2026-03-01 no tiene blue propio: usa el de 2025-09-01.
    expect(serie[1].usd).toBeCloseTo(serie[1].ars / 1000, 2)
  })

  it('un lote vacío no produce serie', () => {
    expect(valuarHistorico({ lote: [], inmag: INMAG, blue: BLUE, ratios })).toEqual([])
  })

  it('una categoría sin ratio vale el índice, no cero', () => {
    const s = valuarHistorico({
      lote: [{ categoria: 'inventada', cabezas: 1, peso: 100 }],
      inmag: [{ date: '2026-09-01', value: 5000 }],
      blue: BLUE,
      ratios: new Map(),
    })
    expect(s[0].ars).toBe(100 * 5000)
  })
})

describe('los rangos', () => {
  const larga = Array.from({ length: 800 }, (_, i) => ({
    fecha: new Date(Date.UTC(2024, 0, 1) + i * 86_400_000).toISOString().slice(0, 10),
    ars: 1000 + i,
    usd: 1,
  }))

  it('30 días trae el último mes', () => {
    expect(recortar(larga, '30d')).toHaveLength(31)
  })

  it('1 año y 2 años traen ventanas distintas y crecientes', () => {
    const a1 = recortar(larga, '1a').length
    const a2 = recortar(larga, '2a').length
    expect(a1).toBeGreaterThan(360)
    expect(a2).toBeGreaterThan(a1)
  })

  it('"todo" no recorta', () => {
    expect(recortar(larga, 'todo')).toHaveLength(800)
  })
})

describe('el resumen del rango', () => {
  it('marca el máximo y el mínimo del período', () => {
    const r = resumir([
      { fecha: '2026-01-01', ars: 100, usd: 1 },
      { fecha: '2026-02-01', ars: 300, usd: 3 },
      { fecha: '2026-03-01', ars: 50, usd: 0.5 },
      { fecha: '2026-04-01', ars: 200, usd: 2 },
    ])!
    expect(r.max.ars).toBe(300)
    expect(r.min.ars).toBe(50)
    expect(r.desde.ars).toBe(100)
    expect(r.hasta.ars).toBe(200)
  })

  it('con un solo punto no hay variación que reportar', () => {
    expect(resumir([{ fecha: '2026-01-01', ars: 100, usd: 1 }])).toBeNull()
  })
})
