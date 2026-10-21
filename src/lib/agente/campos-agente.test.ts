import { describe, expect, it } from 'vitest'
import { datosDeLead, esCasoDeHacienda, ladoDeIntent, planNuevo, planPendiente, trabajarCampos, type LeadCampo } from './campos-agente'

const ahora = new Date('2026-10-21T15:00:00Z') // 12:00 ART
const lead = (o: Partial<LeadCampo>): LeadCampo => ({
  id: 10, intent: 'arrendar_busco', name: 'Mirko', email: 'm@x.com', province: 'Buenos Aires', zona: null, hectareas: 100, category: null, ...o,
})

describe('esCasoDeHacienda', () => {
  it('los casos viejos sin tipo son de hacienda', () => {
    expect(esCasoDeHacienda({ cabezas: 40 })).toBe(true)
    expect(esCasoDeHacienda({ tipo: 'hacienda' })).toBe(true)
    expect(esCasoDeHacienda({ tipo: 'arrendamiento' })).toBe(false)
    expect(esCasoDeHacienda(null)).toBe(true)
  })
})

describe('datos y lado', () => {
  it('busco/busca = compra, ofrezco/tasar = vende', () => {
    expect(ladoDeIntent('arrendar_busco')).toBe('compra')
    expect(ladoDeIntent('busca-campo')).toBe('compra')
    expect(ladoDeIntent('arrendar_ofrezco')).toBe('vende')
    expect(ladoDeIntent('tasar')).toBe('vende')
  })
  it('toma la aptitud de category solo si parece aptitud', () => {
    expect(datosDeLead(lead({ category: 'ganadero' })).aptitud).toBe('ganadero')
    expect(datosDeLead(lead({ category: 'novillos' })).aptitud).toBeNull()
  })
})

describe('planNuevo', () => {
  it('arrendamiento sin aptitud: pide datos al lead, nunca a contrapartes', () => {
    const a = planNuevo(lead({}), ahora)
    expect(a.tipo).toBe('tomar')
    if (a.tipo !== 'tomar') return
    expect(a.estado).toBe('pidiendo_datos')
    expect(a.correo?.asunto).toContain('[C-10]')
    expect(a.datos.tipo).toBe('arrendamiento')
  })
  it('arrendamiento con datos completos: escalado a José, sin correo', () => {
    const a = planNuevo(lead({ category: 'ganadero' }), ahora)
    expect(a).toMatchObject({ tipo: 'tomar', estado: 'escalado', correo: null })
  })
  it('tasación: califica', () => {
    const a = planNuevo(lead({ intent: 'tasar' }), ahora)
    expect(a.tipo === 'tomar' && a.correo?.texto).toMatch(/vender/)
  })
  it('sin email no se toma', () => {
    expect(planNuevo(lead({ email: null }), ahora).tipo).toBe('nada')
  })
})

describe('planPendiente', () => {
  const caso = { estado: 'pidiendo_datos', recordatorios: 0, proximo_at: '2026-10-20T00:00:00Z', datos: { tipo: 'arrendamiento' as const, hectareas: 100 } }
  it('vencido: recuerda', () => {
    expect(planPendiente(caso, lead({}), ahora).tipo).toBe('recordar')
  })
  it('no vencido: nada', () => {
    expect(planPendiente({ ...caso, proximo_at: '2026-10-30T00:00:00Z' }, lead({}), ahora).tipo).toBe('nada')
  })
  it('agotó los recordatorios: duerme', () => {
    expect(planPendiente({ ...caso, recordatorios: 2 }, lead({}), ahora).tipo).toBe('dormir')
  })
})

describe('trabajarCampos', () => {
  it('apagado (default): no toca la base ni manda nada', async () => {
    let tocado = false
    const db = new Proxy({}, { get: () => { tocado = true; throw new Error('no debería tocar la base') } })
    await trabajarCampos(
      { db: db as never, ahora, dryRun: false, mandar: async () => { tocado = true; return null }, bitacora: async () => null, nota: () => {} },
      false,
    )
    expect(tocado).toBe(false)
  })
})
