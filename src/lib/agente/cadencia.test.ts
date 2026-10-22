import { describe, expect, it } from 'vitest'
import { CADENCIA_CONTRAPARTE_DIAS, DIAS_ESPERA_CONTRAPARTE, DIAS_OFERTA_VIVA, tocaRecordatorio } from './reglas'

describe('cadencia a contrapartes 0/3/7/14', () => {
  it('tres recordatorios: a los 3, 7 y 14 días', () => {
    expect(CADENCIA_CONTRAPARTE_DIAS).toEqual([0, 3, 7, 14])
    expect(tocaRecordatorio(0, 2.9)).toBe(false)
    expect(tocaRecordatorio(0, 3)).toBe(true)
    expect(tocaRecordatorio(1, 6)).toBe(false)
    expect(tocaRecordatorio(1, 7)).toBe(true)
    expect(tocaRecordatorio(2, 14)).toBe(true)
  })
  it('nunca un cuarto recordatorio', () => {
    expect(tocaRecordatorio(3, 100)).toBe(false)
  })
  it('la oferta vive hasta 3 días después del último recordatorio, y la tanda no espera a eso', () => {
    expect(DIAS_OFERTA_VIVA).toBe(17)
    expect(DIAS_ESPERA_CONTRAPARTE).toBeLessThan(CADENCIA_CONTRAPARTE_DIAS[2])
  })
})
