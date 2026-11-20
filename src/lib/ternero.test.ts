import { describe, it, expect } from 'vitest'
import { terneroDato, terneroCalificador, terneroNota, terneroFuenteFrase, mesLargo } from './ternero'

const MAGYP = { current: 6389, source: 'MAGyP · Entre Surcos y Corrales (mensual)', observado: true, observedDate: '2026-10', metodo: null }
const SINT = { current: 4486, source: 'MAG (derived from INMAG)' }

describe('terneroDato', () => {
  it('observado de MAGyP: fuente y mes, sin método', () => {
    expect(terneroDato(MAGYP)).toEqual({ precio: 6389, observado: true, mes: '2026-10', fuente: 'MAGyP (Entre Surcos y Corrales)', metodo: null })
  })
  it('el JSON viejo (sin `observado`) sigue siendo estimado', () => {
    expect(terneroDato(SINT)).toMatchObject({ precio: 4486, observado: false, mes: null, metodo: 'INMAG × 1,10' })
  })
  it('lee el dato real del repo sin romper', () => {
    const d = terneroDato()
    expect(d.precio).toBeGreaterThan(0)
    expect(d.observado ? d.mes : d.metodo).toBeTruthy()
  })
})

describe('rótulos', () => {
  it('nunca dice «estimado» de un observado ni «observado» de un ratio', () => {
    const o = terneroDato(MAGYP)
    const s = terneroDato(SINT)
    for (const t of [terneroCalificador(o), terneroNota(o), terneroFuenteFrase(o)]) {
      expect(t).not.toMatch(/estimad|INMAG ×/i)
      expect(t).toMatch(/MAGyP/)
    }
    for (const t of [terneroCalificador(s), terneroNota(s), terneroFuenteFrase(s)]) expect(t).toMatch(/estimad|estimación/i)
    expect(terneroNota(s)).toContain('INMAG × 1,10')
  })
  it('mes legible', () => {
    expect(mesLargo('2026-10')).toBe('octubre de 2026')
    expect(terneroCalificador(terneroDato(MAGYP))).toBe('(MAGyP, octubre de 2026)')
  })
})
