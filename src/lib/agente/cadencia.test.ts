import { describe, expect, it } from 'vitest'
import { CADENCIA_CONTRAPARTE_DIAS, DIAS_ESPERA_CONTRAPARTE, DIAS_OFERTA_VIVA, RECORDATORIO_CONTRAPARTE_DIAS, tocaRecordatorio } from './reglas'

describe('cadencia a contrapartes 0/7', () => {
  it('un correo inicial y un solo recordatorio, el día 7', () => {
    expect(CADENCIA_CONTRAPARTE_DIAS).toEqual([0, 7])
    expect(RECORDATORIO_CONTRAPARTE_DIAS).toBe(7)
  })
  it('con 0 recordatorios enviados: nada antes del día 7, sí desde el día 7', () => {
    expect(tocaRecordatorio(0, 0)).toBe(false)
    expect(tocaRecordatorio(0, 3)).toBe(false)
    expect(tocaRecordatorio(0, 6.9)).toBe(false)
    expect(tocaRecordatorio(0, 7)).toBe(true)
    expect(tocaRecordatorio(0, 12)).toBe(true)
  })
  it('con 1 recordatorio enviado: nunca otro, ni a los 14 ni después', () => {
    expect(tocaRecordatorio(1, 7)).toBe(false)
    expect(tocaRecordatorio(1, 14)).toBe(false)
    expect(tocaRecordatorio(1, 100)).toBe(false)
    expect(tocaRecordatorio(2, 100)).toBe(false)
  })
  it('la oferta vive después del recordatorio, y la tanda no espera a eso', () => {
    expect(DIAS_OFERTA_VIVA).toBe(17)
    expect(DIAS_OFERTA_VIVA).toBeGreaterThan(CADENCIA_CONTRAPARTE_DIAS[CADENCIA_CONTRAPARTE_DIAS.length - 1])
    expect(DIAS_ESPERA_CONTRAPARTE).toBeLessThan(CADENCIA_CONTRAPARTE_DIAS[1])
  })
})
