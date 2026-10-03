import { describe, expect, it } from 'vitest'
import frigorificos from '@/lib/data/frigorificos.json'
import { getSenasaRecord } from '@/lib/data/senasa-habilitados'
import { esFrigorificoIndexable, tieneDatoEnriquecido } from './frigorificos-indexables'

const cuits = (frigorificos as { cuit: string }[]).map((f) => f.cuit)

describe('esFrigorificoIndexable', () => {
  it('indexa todo CUIT con habilitación vigente', () => {
    const vigentes = cuits.filter((c) => getSenasaRecord(c) !== null)
    expect(vigentes.length).toBeGreaterThan(0)
    expect(vigentes.every(esFrigorificoIndexable)).toBe(true)
  })

  it('un inactivo con datos enriquecidos sigue indexable', () => {
    const inactivoEnriquecido = cuits.find((c) => getSenasaRecord(c) === null && tieneDatoEnriquecido(c))
    expect(inactivoEnriquecido).toBeDefined()
    expect(esFrigorificoIndexable(inactivoEnriquecido!)).toBe(true)
  })

  it('saca del índice a los inactivos sin nada propio, y solo a esos', () => {
    const fuera = cuits.filter((c) => !esFrigorificoIndexable(c))
    expect(fuera.length).toBeGreaterThan(0)
    // Si este número se dispara, cambió el padrón o el enriquecido: revisar antes de publicar.
    expect(fuera.length).toBeLessThan(cuits.length * 0.3)
    expect(fuera.every((c) => getSenasaRecord(c) === null && !tieneDatoEnriquecido(c))).toBe(true)
  })

  it('un CUIT que no existe no es indexable', () => {
    expect(esFrigorificoIndexable('00000000000')).toBe(false)
  })
})
