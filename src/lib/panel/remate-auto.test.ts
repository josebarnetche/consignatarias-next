import { describe, expect, it } from 'vitest'
import { diasHasta, lugaresHabituales, lunesDelMail, sinProvincia, tituloSugerido } from './remate-auto'

describe('diasHasta', () => {
  it('cuenta días calendario', () => {
    expect(diasHasta('2026-10-23', '2026-10-19')).toBe(4)
    expect(diasHasta('2026-10-19', '2026-10-19')).toBe(0)
    expect(diasHasta('2026-11-02', '2026-10-30')).toBe(3)
  })
})

describe('lunesDelMail', () => {
  it('lunes antes de las 10: entra al envío de hoy', () => {
    expect(lunesDelMail('2026-10-23', '2026-10-19', 9)).toBe('2026-10-19')
  })
  it('lunes después de las 10: el de esta semana ya salió', () => {
    expect(lunesDelMail('2026-10-23', '2026-10-19', 11)).toBeNull()
  })
  it('remate de la semana que viene: el próximo lunes', () => {
    expect(lunesDelMail('2026-10-30', '2026-10-21', 12)).toBe('2026-10-26')
  })
  it('remate lejano: el lunes de su semana', () => {
    expect(lunesDelMail('2026-11-10', '2026-10-21', 12)).toBe('2026-11-09')
  })
  it('remate en lunes: el primer envío que lo incluye (ventana de 7 días)', () => {
    expect(lunesDelMail('2026-11-02', '2026-10-21', 12)).toBe('2026-10-26')
  })
})

describe('tituloSugerido', () => {
  it('arma el nombre con el tipo y el lugar', () => {
    expect(tituloSugerido({ type: 'invernada', location: 'Mercedes', date: '2026-10-23' })).toBe('Remate de invernada en Mercedes')
    expect(tituloSugerido({ type: 'general', location: ' Mercedes ', date: '' })).toBe('Remate en Mercedes')
  })
  it('sin lugar usa la fecha', () => {
    expect(tituloSugerido({ type: 'general', location: '', date: '2026-10-23' })).toBe('Remate del 23 de octubre')
  })
  it('sin nada, vacío', () => {
    expect(tituloSugerido({ type: 'general', location: '', date: '' })).toBe('')
  })
})

describe('lugaresHabituales', () => {
  it('junta por lugar, completa la provincia y ordena por uso', () => {
    const l = lugaresHabituales([
      { location: 'Curuzú Cuatiá', province: 'CORRIENTES' },
      { location: 'Mercedes', province: null },
      { location: 'mercedes', province: 'CORRIENTES' },
      { location: '', province: 'CORRIENTES' },
    ])
    expect(l).toEqual([
      { location: 'Mercedes', province: 'CORRIENTES', veces: 2 },
      { location: 'Curuzú Cuatiá', province: 'CORRIENTES', veces: 1 },
    ])
  })
})

describe('sinProvincia', () => {
  it('saca la provincia pegada al lugar', () => {
    expect(sinProvincia('EA. Aguay, CORRIENTES', 'CORRIENTES')).toBe('EA. Aguay')
    expect(sinProvincia('Mercedes, Corrientes', 'CORRIENTES')).toBe('Mercedes')
    expect(sinProvincia('Gualeguaychú, Entre Ríos', 'ENTRE RIOS')).toBe('Gualeguaychú')
  })
  it('deja el lugar si la coma no es la provincia', () => {
    expect(sinProvincia('Sociedad Rural de Mercedes, Mercedes', 'CORRIENTES')).toBe('Sociedad Rural de Mercedes, Mercedes')
    expect(sinProvincia('Mercedes, Corrientes', null)).toBe('Mercedes, Corrientes')
  })
  it('junta el mismo lugar escrito con y sin provincia', () => {
    expect(lugaresHabituales([{ location: 'Mercedes, Corrientes', province: 'CORRIENTES' }, { location: 'Mercedes', province: 'CORRIENTES' }])).toEqual([
      { location: 'Mercedes', province: 'CORRIENTES', veces: 2 },
    ])
  })
})
