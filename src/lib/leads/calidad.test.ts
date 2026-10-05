import { describe, it, expect } from 'vitest'
import { calificarLead, CABEZAS_MINIMAS, CABEZAS_PRO, proximaAccion } from './calidad'

/**
 * Los umbrales son una decisión comercial de Jose, no un detalle de
 * implementación: si alguien los mueve sin querer, el digest empieza a ofrecerle
 * a un consignatario leads que no le sirven y se quema el canal. Estos tests
 * fijan los tres casos que él dio como referencia.
 */
describe('calificación comercial de un lead', () => {
  const base = { intent: 'vender', category: 'novillos', province: 'Corrientes', status: 'new' }

  it('20 cabezas no es atractivo', () => {
    const c = calificarLead({ ...base, headCount: 20 })
    expect(c.nivel).toBe('chico')
    expect(c.derivable).toBe(false)
  })

  it('a partir de 40 sí', () => {
    expect(calificarLead({ ...base, headCount: 39 }).nivel).toBe('chico')
    expect(calificarLead({ ...base, headCount: CABEZAS_MINIMAS }).nivel).toBe('trabajable')
  })

  it('1500 es pro y se puede derivar', () => {
    const c = calificarLead({ ...base, headCount: 1500 })
    expect(c.nivel).toBe('pro')
    expect(c.derivable).toBe(true)
    expect(CABEZAS_PRO).toBeLessThanOrEqual(1500)
  })

  it('sin cabezas NO es chico: es sin_datos, y la acción es preguntar', () => {
    // La distinción es la que destrabó los leads parados: al chico no se lo
    // llama, al sin_datos se le pregunta. Si esto colapsa en 'chico', se vuelven
    // a enterrar leads que nunca se consultaron.
    const c = calificarLead({ ...base, headCount: null })
    expect(c.nivel).toBe('sin_datos')
    expect(c.faltan).toContain('cabezas')
    expect(proximaAccion(c, 'vender')).toMatch(/preguntarle/i)
  })

  it('cuenta los días sin contactar sólo mientras no se lo contactó', () => {
    const hace10 = new Date(Date.now() - 10 * 86_400_000).toISOString()
    expect(calificarLead({ ...base, headCount: 100, createdAt: hace10 }).diasSinContactar).toBe(10)
    expect(
      calificarLead({ ...base, headCount: 100, createdAt: hace10, status: 'contacted' }).diasSinContactar,
    ).toBeNull()
  })

  it('declara qué falta aunque alcance para calificar', () => {
    const c = calificarLead({ intent: 'comprar', headCount: 500, status: 'new' })
    expect(c.nivel).toBe('pro')
    expect(c.faltan).toEqual(expect.arrayContaining(['categoría', 'provincia']))
  })
})
