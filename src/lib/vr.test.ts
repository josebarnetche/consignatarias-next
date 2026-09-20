import { describe, it, expect } from 'vitest'
import {
  getReferencia,
  valuarConBanda,
  normalizarProvincia,
  getSlugsConBanda,
  getBandaPorSlug,
  getOrigenPorSlug,
  getBandasPublicas,
  vrCobertura,
  SLUGS_CONOCIDOS,
  MIN_LOTES_AJUSTE_ORIGEN,
  MIN_LOTES_BANDA_COMPLETA,
  VR_METODOLOGIA,
} from './vr'

describe('getReferencia — banda', () => {
  it('devuelve banda completa para una categoría con base gruesa', () => {
    const r = getReferencia('vacas')
    expect(r.confianza).toBe('alta')
    expect(r.banda).not.toBeNull()
    expect(r.banda!.p10).toBeLessThan(r.banda!.mediana)
    expect(r.banda!.mediana).toBeLessThan(r.banda!.p90)
    expect(r.banda!.lotes).toBeGreaterThanOrEqual(100)
  })

  it('mapea el plural de market-prices a la categoría del dato de lote', () => {
    expect(getReferencia('novillos').banda).not.toBeNull()
    expect(getReferencia('novillitos').banda).not.toBeNull()
    expect(getReferencia('vaquillonas').banda).not.toBeNull()
    expect(getReferencia('toros').banda).not.toBeNull()
  })

  it('siempre expone metodología y límites, incluso sin base', () => {
    for (const cat of ['vacas', 'terneros', 'inventada']) {
      const r = getReferencia(cat)
      expect(r.metodologia).toBe(VR_METODOLOGIA)
      expect(r.limites.length).toBeGreaterThan(0)
      expect(r.limites[0]).toContain('no es una tasación')
    }
  })
})

describe('getReferencia — regla de degradación (nunca inventar precisión)', () => {
  it('terneros no existe en el dato de lote del MAG: cae a sin_base y lo declara', () => {
    const r = getReferencia('terneros')
    expect(r.confianza).toBe('sin_base')
    expect(r.banda).toBeNull()
    expect(r.limites.join(' ')).toMatch(/no tiene equivalente|base suficiente/)
  })

  it('una categoría inexistente no tira error: devuelve sin_base', () => {
    expect(() => getReferencia('unicornios')).not.toThrow()
    expect(getReferencia('unicornios').confianza).toBe('sin_base')
  })

  it('no aplica ajuste de origen cuando la provincia no llega al mínimo', () => {
    const r = getReferencia('vacas', 'Formosa')
    expect(r.origen).toBeNull()
    expect(r.limites.join(' ')).toContain('no llega')
  })

  it('aplica ajuste de origen cuando hay base, y lo declara con el n', () => {
    const r = getReferencia('vacas', 'La Pampa')
    expect(r.origen).not.toBeNull()
    expect(r.origen!.provincia).toBe('LPA')
    expect(r.origen!.lotes).toBeGreaterThanOrEqual(MIN_LOTES_AJUSTE_ORIGEN)
    expect(r.limites.join(' ')).toContain('Ajuste por origen')
  })

  it('el ajuste de origen mueve la banda en la dirección del factor', () => {
    const nac = getReferencia('vacas')
    const lpa = getReferencia('vacas', 'La Pampa') // factor > 1
    const slu = getReferencia('vacas', 'San Luis') // factor < 1
    expect(lpa.banda!.mediana).toBeGreaterThan(nac.banda!.mediana)
    expect(slu.banda!.mediana).toBeLessThan(nac.banda!.mediana)
  })
})

describe('normalizarProvincia', () => {
  it('resuelve nombre completo, con y sin acento, y código', () => {
    expect(normalizarProvincia('Buenos Aires')).toBe('BUE')
    expect(normalizarProvincia('córdoba')).toBe('CBA')
    expect(normalizarProvincia('cordoba')).toBe('CBA')
    expect(normalizarProvincia('Entre Ríos')).toBe('ERI')
    expect(normalizarProvincia('bue')).toBe('BUE')
  })
})

describe('valuarConBanda', () => {
  it('con banda devuelve tres puntas ordenadas', () => {
    const r = getReferencia('vacas')
    const v = valuarConBanda(r, 470, 350, 2900)
    expect(v.usó_banda).toBe(true)
    expect(v.conservador).toBeLessThan(v.central)
    expect(v.central).toBeLessThan(v.optimista)
    expect(v.central).toBe(Math.round(r.banda!.mediana * 470 * 350))
  })

  it('la amplitud sobre una tropa real es material — el punto entero del producto', () => {
    const r = getReferencia('vacas')
    const v = valuarConBanda(r, 470, 350, 2900)
    // P10→P90 sobre 350 vacas: cientos de millones de pesos de diferencia.
    expect(v.optimista - v.conservador).toBeGreaterThan(100_000_000)
  })

  it('sin banda colapsa las tres puntas en el fallback MAG', () => {
    const r = getReferencia('terneros')
    const v = valuarConBanda(r, 220, 100, 5000)
    expect(v.usó_banda).toBe(false)
    expect(v.conservador).toBe(v.central)
    expect(v.optimista).toBe(v.central)
    expect(v.central).toBe(5000 * 220 * 100)
  })
})

describe('superficie pública (páginas /vr y /mercado)', () => {
  it('solo publica slugs que pasan el mínimo de la regla de degradación', () => {
    const slugs = getSlugsConBanda()
    expect(slugs.length).toBeGreaterThan(0)
    for (const s of slugs) {
      const b = getBandaPorSlug(s)
      expect(b).not.toBeNull()
      expect(b!.lotes).toBeGreaterThanOrEqual(MIN_LOTES_BANDA_COMPLETA)
    }
  })

  it('ternero no tiene página: no hay banda que publicar', () => {
    expect(getSlugsConBanda()).not.toContain('ternero')
    expect(getBandaPorSlug('ternero')).toBeNull()
  })

  it('un slug inventado no explota ni fabrica una página', () => {
    expect(getBandaPorSlug('unicornio')).toBeNull()
    expect(getOrigenPorSlug('unicornio')).toEqual([])
  })

  it('getBandasPublicas ordena por cabezas y coincide con los slugs', () => {
    const pub = getBandasPublicas()
    const cabezas = pub.map((b) => b.cabezas)
    expect([...cabezas].sort((a, b) => b - a)).toEqual(cabezas)
    expect(pub.length).toBe(getSlugsConBanda().length)
  })

  it('los ajustes de origen publicados superan el mínimo', () => {
    for (const s of getSlugsConBanda()) {
      for (const o of getOrigenPorSlug(s)) {
        expect(o.lotes).toBeGreaterThanOrEqual(MIN_LOTES_AJUSTE_ORIGEN)
        // Un factor fuera de ±50% sería un bug de cálculo, no un dato de mercado.
        expect(o.factor).toBeGreaterThan(0.5)
        expect(o.factor).toBeLessThan(1.5)
      }
    }
  })

  it('la cobertura declara fechas coherentes y totales positivos', () => {
    const c = vrCobertura()
    expect(c.desde <= c.hasta).toBe(true)
    expect(c.lotes).toBeGreaterThan(0)
    expect(c.cabezas).toBeGreaterThan(0)
  })
})

describe('regresiones de la auditoría', () => {
  it('SLUGS_CONOCIDOS es superset de los que hoy tienen banda', () => {
    // Si se invirtiera, una URL indexada pasaría a 404 al caer la base.
    for (const s of getSlugsConBanda()) expect(SLUGS_CONOCIDOS).toContain(s)
    expect(SLUGS_CONOCIDOS.length).toBeGreaterThanOrEqual(getSlugsConBanda().length)
  })

  it('una banda colapsada no puede declarar amplitud', () => {
    for (const cat of ['vacas', 'novillos', 'terneros', 'toros', 'vaquillonas']) {
      const r = getReferencia(cat)
      if (r.banda && r.banda.p10 === r.banda.p90) {
        expect(r.banda.amplitud_pct).toBe(0)
      }
    }
  })
})

describe('valuarTropa — coherencia interna de la respuesta', () => {
  it('precio_kg_ars × kg × cabezas === total_ars, con y sin banda', async () => {
    const { valuarTropa } = await import('./valuaciones')
    for (const [cat, cabezas] of [['vacas', 350], ['novillos', 120], ['terneros', 100]] as const) {
      const d = valuarTropa({ categoria: cat, cabezas }).data as Record<string, number>
      expect(d.total_ars).toBe(Math.round(d.precio_kg_ars * d.kg_promedio * cabezas))
    }
  })

  it('conserva el precio MAG y declara la brecha cuando difiere', async () => {
    const { valuarTropa } = await import('./valuaciones')
    const d = valuarTropa({ categoria: 'vaquillonas', cabezas: 10 }).data as Record<string, number>
    // vaquillona es el caso donde mediana de lote y precio MAG más se separan.
    expect(d.precio_kg_mag).toBeGreaterThan(0)
    expect(Math.abs(d.brecha_vs_mag_pct)).toBeGreaterThan(5)
    expect(d.precio_kg_ars).not.toBe(d.precio_kg_mag)
  })

  it('sin banda no hay brecha que declarar', async () => {
    const { valuarTropa } = await import('./valuaciones')
    const d = valuarTropa({ categoria: 'terneros', cabezas: 10 }).data as Record<string, number>
    expect(d.brecha_vs_mag_pct).toBe(0)
    expect(d.precio_kg_ars).toBe(d.precio_kg_mag)
  })
})
