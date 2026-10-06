import { describe, it, expect } from 'vitest'
import { puedeFaenarBovinos, motivoNoFaena, plantaSenasa, RELEVADO_EL } from './faena'
import ARCHIVO from '@/lib/data/senasa-rubros.json'

/**
 * Lo que se fija acá es el caso que nos costó una consulta perdida: Brekan pasa
 * los filtros viejos (figura en el padrón, es ciclo I) y NO puede faenar. Y el
 * otro lado del mismo cuidado: una matrícula que nunca relevamos devuelve null,
 * no false, para que nadie la descarte por falta de dato.
 */
describe('habilitación de faena bovina', () => {
  it('detecta la planta que pasa los filtros viejos y no faena', () => {
    const brekan = plantaSenasa('1974')
    expect(brekan).not.toBeNull()
    expect(brekan?.estado).toBe('TRANSFERIDO')
    expect(puedeFaenarBovinos('1974')).toBe(false)
    expect(motivoNoFaena('1974')).toContain('suspendido')
  })

  it('no confunde "sin dato" con "no habilitada"', () => {
    expect(puedeFaenarBovinos('999999')).toBeNull()
    expect(puedeFaenarBovinos(null)).toBeNull()
    expect(motivoNoFaena('999999')).toBeNull()
  })

  it('siempre explica por qué, cuando dice que no', () => {
    // No se fija una matrícula concreta: el relevamiento se vuelve a correr y
    // cambia. Lo que no puede cambiar es que un "no" venga con su motivo.
    const noFaenan = ARCHIVO.plantas.filter((p) => !p.error && !p.faenaBovinaHabilitada)
    for (const p of noFaenan) {
      expect(motivoNoFaena(p.matricula)).toBeTruthy()
    }
  })

  it('el relevamiento tiene datos y están fechados', () => {
    const ok = ARCHIVO.plantas.filter((p) => !p.error)
    expect(ok.length).toBeGreaterThan(0)
    expect(RELEVADO_EL).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('acepta la matrícula como número o como texto', () => {
    expect(puedeFaenarBovinos(1974)).toBe(puedeFaenarBovinos('1974'))
  })
})
