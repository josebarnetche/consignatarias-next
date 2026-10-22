import { describe, expect, it } from 'vitest'
import { estadoEnvio, kgHaMesTipico, resumenPorTipo } from './por-tipo'
import type { Valuacion } from './tipos'

describe('estadoEnvio', () => {
  it('hacienda sale, arrendamiento tiene bloqueo legal, campo y tasación sin comisión', () => {
    expect(estadoEnvio('hacienda').envio).toBe('sale')
    expect(estadoEnvio('arrendamiento').envio).toBe('bloqueo_legal')
    expect(estadoEnvio('arrendamiento').motivo).toMatch(/matriculado/)
    expect(estadoEnvio('campo').envio).toBe('sin_comision')
    expect(estadoEnvio('tasacion').envio).toBe('sin_comision')
  })
})

describe('resumenPorTipo', () => {
  const valuar = (l: { id: number }): Valuacion | null =>
    l.id === 1 ? { tipo: 'hacienda', brutoArs: 100_000_000, comisionArs: 1_000_000 }
    : l.id === 2 ? { tipo: 'arrendamiento', brutoArs: 12_000_000, comisionArs: 800_000 }
    : { tipo: 'tasacion', brutoArs: null, comisionArs: null }

  it('agrupa por tipo, suma plata, cuenta los que ya tiene el agente y los sin estimar', () => {
    const filas = resumenPorTipo(
      [
        { id: 1, intent: 'vender' },
        { id: 2, intent: 'arrendar_busco' },
        { id: 3, intent: 'tasar' },
        { id: 4, intent: 'contacto_proveedor' },
      ],
      new Set([1]),
      valuar,
    )
    expect(filas.map((f) => f.tipo)).toEqual(['hacienda', 'arrendamiento', 'tasacion'])
    expect(filas[0]).toMatchObject({ leads: 1, enAgente: 1, brutoArs: 100_000_000, comisionArs: 1_000_000, envio: 'sale' })
    expect(filas[1]).toMatchObject({ enAgente: 0, comisionArs: 800_000, envio: 'bloqueo_legal' })
    expect(filas[2]).toMatchObject({ sinEstimar: 1, comisionArs: 0 })
  })
})

describe('kgHaMesTipico', () => {
  const filas = [
    { provincia: 'Buenos Aires', zona: null, kg_ha_mes_canon: 5.4 },
    { provincia: 'Buenos Aires', zona: 'Salado', kg_ha_mes_canon: 4 },
    { provincia: 'Corrientes', zona: 'Mercedes', kg_ha_mes_canon: 3 },
    { provincia: 'Chaco', zona: null, kg_ha_mes_canon: 2 },
  ]
  it('usa la fila de provincia, sin importar tildes ni mayúsculas', () => {
    expect(kgHaMesTipico('buenos aires', filas)).toBe(5.4)
    expect(kgHaMesTipico('Corrientes', filas)).toBe(3)
  })
  it('sin provincia conocida, la mediana del país', () => {
    expect(kgHaMesTipico('Tierra del Fuego', filas)).toBe(4)
    expect(kgHaMesTipico(null, filas)).toBe(4)
  })
  it('lee el relevamiento real sin romperse', () => {
    expect(kgHaMesTipico('Buenos Aires')).toBeGreaterThan(0)
  })
})

describe('resumenPorTipo sin lo que el agente ya terminó', () => {
  it('un lead descartado por el agente no suma plata ni leads', () => {
    const valuar = () => ({ tipo: 'hacienda' as const, brutoArs: 1_000, comisionArs: 10 })
    const f = resumenPorTipo([{ id: 1, intent: 'vender' }, { id: 2, intent: 'vender' }], new Set([1, 2]), valuar, new Set([2]))
    expect(f[0]).toMatchObject({ leads: 1, comisionArs: 10 })
  })
})
