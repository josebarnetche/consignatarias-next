import { describe, it, expect, vi } from 'vitest'

/**
 * Bandas fijas para que los números del test no cambien con cada corrida del workflow
 * (el JSON real se regenera tres veces por semana). La forma es la del archivo real.
 */
vi.mock('@/lib/data/vr-bandas.json', () => ({
  default: {
    generado: '2026-09-21T00:00:00.000Z',
    ventana_dias: 30,
    ventana_origen_dias: 90,
    rango_peso_kg: 50,
    fecha_dato_desde: '2026-08-25',
    fecha_dato_hasta: '2026-09-18',
    categorias: {
      VACA: { p10: 2500, mediana: 2900, p90: 3600, amplitud_pct: 44, lotes: 1800, cabezas: 9000 },
      NOVILLO: { p10: 3600, mediana: 4300, p90: 4600, amplitud_pct: 27.8, lotes: 380, cabezas: 3700 },
      MEJ: { p10: 3000, mediana: 4000, p90: 4700, amplitud_pct: 56.7, lotes: 20, cabezas: 100 },
    },
    por_peso: {
      VACA: [
        { desde_kg: 300, hasta_kg: 349, p10: 2200, mediana: 2600, p90: 2800, amplitud_pct: 27.3, lotes: 112, cabezas: 600 },
        { desde_kg: 500, hasta_kg: 549, p10: 2600, mediana: 3200, p90: 3600, amplitud_pct: 38.5, lotes: 287, cabezas: 1500 },
        // Rango con base fina: no debe usarse aunque esté en el archivo.
        { desde_kg: 800, hasta_kg: 849, p10: 2900, mediana: 3200, p90: 3400, amplitud_pct: 17.2, lotes: 12, cabezas: 40 },
      ],
    },
    origen: {},
  },
}))

const { getReferenciaPorPeso } = await import('./vr')
const { valuarRodeo, ratiosDesdeRodeo, inmagPromedio } = await import('./rodeo-vr')

describe('getReferenciaPorPeso — el peso manda cuando hay base', () => {
  it('usa el rango de peso del lote si tiene 30+ lotes', () => {
    const r = getReferenciaPorPeso('vacas', 320)
    expect(r.base).toBe('rango_peso')
    expect(r.rango).toEqual({ desde_kg: 300, hasta_kg: 349 })
    expect(r.banda!.mediana).toBe(2600)
    expect(r.limites.join(' ')).toContain('300–349 kg')
  })

  it('una vaca pesada y una liviana no valen lo mismo por kilo', () => {
    expect(getReferenciaPorPeso('vacas', 520).banda!.mediana).toBeGreaterThan(
      getReferenciaPorPeso('vacas', 320).banda!.mediana,
    )
  })

  it('sin rango con base cae a la banda de toda la categoría, y lo dice', () => {
    const r = getReferenciaPorPeso('vacas', 420) // no hay rango 400-449 en el fixture
    expect(r.base).toBe('categoria')
    expect(r.banda!.mediana).toBe(2900)
    expect(r.limites.join(' ')).toMatch(/toda la categoría/)
  })

  it('un rango con menos de 30 lotes no se usa aunque exista', () => {
    const r = getReferenciaPorPeso('vacas', 820)
    expect(r.base).toBe('categoria')
  })

  it('el ternero no tiene referencia: banda null, nunca un ratio', () => {
    const r = getReferenciaPorPeso('terneros', 180)
    expect(r.banda).toBeNull()
    expect(r.base).toBeNull()
    expect(r.confianza).toBe('sin_base')
  })

  it('categoría con base fina (10-29 lotes): mediana sin banda, como en getReferencia', () => {
    const r = getReferenciaPorPeso('mej', 400)
    expect(r.base).toBe('categoria')
    expect(r.banda!.p10).toBe(r.banda!.mediana)
    expect(r.banda!.p90).toBe(r.banda!.mediana)
  })
})

describe('valuarRodeo', () => {
  it('valúa cada lote con su banda y suma las tres puntas', () => {
    const r = valuarRodeo([
      { categoria: 'vacas', cabezas: 10, peso: 320 }, // 3.200 kg · rango 300-349
      { categoria: 'novillos', cabezas: 5, peso: 450 }, // 2.250 kg · categoría
    ])
    expect(r.total).toEqual({
      conservador: 3200 * 2200 + 2250 * 3600,
      central: 3200 * 2600 + 2250 * 4300,
      optimista: 3200 * 2800 + 2250 * 4600,
    })
    expect(r.valuado).toEqual({ cabezas: 15, kilos: 5450 })
    expect(r.sinValuar.cabezas).toBe(0)
  })

  it('el ternero queda afuera del total y se cuenta como sin valuar', () => {
    const r = valuarRodeo([
      { categoria: 'vacas', cabezas: 10, peso: 320 },
      { categoria: 'terneros', cabezas: 40, peso: 180 },
    ])
    expect(r.total!.central).toBe(3200 * 2600)
    expect(r.sinValuar).toEqual({ cabezas: 40, kilos: 7200, categorias: ['terneros'] })
    const ternero = r.lotes.find((l) => l.categoria === 'terneros')!
    expect(ternero.central).toBeNull()
  })

  it('un rodeo sólo de terneros no tiene total: null, no cero', () => {
    const r = valuarRodeo([{ categoria: 'terneros', cabezas: 40, peso: 180 }])
    expect(r.total).toBeNull()
  })

  it('ignora filas con cabezas o peso en cero', () => {
    const r = valuarRodeo([
      { categoria: 'vacas', cabezas: 0, peso: 320 },
      { categoria: 'vacas', cabezas: 10, peso: 0 },
    ])
    expect(r.lotes).toHaveLength(0)
    expect(r.total).toBeNull()
  })

  it('declara la ventana y la metodología del dato', () => {
    const r = valuarRodeo([{ categoria: 'vacas', cabezas: 1, peso: 320 }])
    expect(r.ventana).toEqual({ desde: '2026-08-25', hasta: '2026-09-18' })
    expect(r.metodologia).toMatch(/^VR v/)
  })
})

describe('el ancla del histórico', () => {
  it('el ratio de cada categoría es su precio central por kilo sobre el INMAG de la ventana', () => {
    const r = valuarRodeo([
      { categoria: 'vacas', cabezas: 10, peso: 320 },
      { categoria: 'terneros', cabezas: 40, peso: 180 },
    ])
    const ratios = ratiosDesdeRodeo(r, 4000)
    expect(ratios.get('vacas')).toBeCloseTo(2600 / 4000, 6)
    expect(ratios.has('terneros')).toBe(false)
  })

  it('dos lotes de la misma categoría y distinto peso se ponderan por kilos', () => {
    const r = valuarRodeo([
      { categoria: 'vacas', cabezas: 10, peso: 320 }, // 3.200 kg a 2.600
      { categoria: 'vacas', cabezas: 10, peso: 520 }, // 5.200 kg a 3.200
    ])
    const esperado = (3200 * 2600 + 5200 * 3200) / 8400 / 4000
    expect(ratiosDesdeRodeo(r, 4000).get('vacas')).toBeCloseTo(esperado, 6)
  })

  it('sin INMAG de ancla no hay ratios', () => {
    const r = valuarRodeo([{ categoria: 'vacas', cabezas: 10, peso: 320 }])
    expect(ratiosDesdeRodeo(r, 0).size).toBe(0)
  })

  it('el promedio del INMAG usa sólo las ruedas de la ventana', () => {
    const serie = [
      { date: '2026-08-20', value: 1000 },
      { date: '2026-08-26', value: 4000 },
      { date: '2026-09-18', value: 5000 },
      { date: '2026-09-20', value: 9000 },
    ]
    expect(inmagPromedio(serie, '2026-08-25', '2026-09-18')).toBe(4500)
    expect(inmagPromedio(serie, '2027-01-01', '2027-02-01')).toBeNull()
  })
})
