import { describe, it, expect } from 'vitest'
import {
  getReferencia,
  valuarConBanda,
  normalizarProvincia,
  MIN_LOTES_AJUSTE_ORIGEN,
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
