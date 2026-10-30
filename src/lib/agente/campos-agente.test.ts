import { describe, expect, it } from 'vitest'
import { datosDeLead, esCasoDeHacienda, ladoDeIntent, planNuevo, planPendiente, trabajarCampos, type LeadCampo } from './campos-agente'

const ahora = new Date('2026-10-21T15:00:00Z') // 12:00 ART
const lead = (o: Partial<LeadCampo>): LeadCampo => ({
  id: 10, intent: 'arrendar_busco', name: 'Juan', email: 'm@x.com', province: 'Buenos Aires', zona: null, hectareas: 100, category: null, ...o,
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

/** Base falsa mínima: lo justo para las consultas de trabajarCampos. */
function dbFalsa(tablas: { producer_leads: unknown[]; agente_casos: unknown[] }) {
  const insertados: unknown[] = []
  const q = (rows: unknown[]) => {
    const b: Record<string, unknown> = {}
    const self = () => b
    for (const m of ['select', 'in', 'eq', 'order', 'lte', 'limit']) b[m] = self
    b.then = (r: (v: { data: unknown[] }) => unknown) => r({ data: rows })
    b.maybeSingle = async () => ({ data: rows[0] ?? null })
    return b
  }
  return {
    insertados,
    db: {
      from: (t: 'producer_leads' | 'agente_casos') => ({
        ...q(tablas[t]),
        insert: async (row: unknown) => { insertados.push(row); return { error: null } },
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
    },
  }
}

describe('trabajarCampos (prendido)', () => {
  it('toma los leads, le escribe solo al que consultó y avisa a José el que pasa a él', async () => {
    const leads = [
      lead({ id: 1, intent: 'arrendar_busco', category: null }), // faltan datos → correo al lead
      lead({ id: 2, intent: 'arrendar_busco', category: 'ganadero', email: 'b@x.com' }), // completo → escalado + aviso
      lead({ id: 3, intent: 'tasar', email: 'c@x.com' }), // califica
    ]
    const { db, insertados } = dbFalsa({ producer_leads: leads, agente_casos: [] })
    const enviados: string[][] = []
    const avisos: string[] = []
    await trabajarCampos(
      {
        db: db as never,
        ahora,
        dryRun: false,
        mandar: async (o) => { enviados.push(o.para); return 'id' },
        bitacora: async () => null,
        avisar: async (t) => { avisos.push(t) },
        nota: () => {},
      },
      true,
    )
    expect(insertados).toHaveLength(3)
    expect(enviados).toEqual([['m@x.com'], ['c@x.com']]) // nadie más que quien consultó
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatch(/#2/)
  })
  it('fuera de horario (3 de la mañana) no hace nada', async () => {
    const { db, insertados } = dbFalsa({ producer_leads: [lead({})], agente_casos: [] })
    await trabajarCampos(
      { db: db as never, ahora: new Date('2026-10-21T06:00:00Z'), dryRun: false, mandar: async () => 'x', bitacora: async () => null, nota: () => {} },
      true,
    )
    expect(insertados).toHaveLength(0)
  })
})

describe('un caso de campo nunca es contraparte de hacienda', () => {
  it('motor.ts filtra los casos con datos.tipo de campo al armar candidatos', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./motor.ts', import.meta.url), 'utf8')
    const bloque = src.slice(src.indexOf("from('agente_casos').select('lead_id,lado,datos')"), src.indexOf("tipo: 'lead', ref: String(o.lead_id)"))
    expect(bloque).toContain('esCasoDeHacienda(o.datos)')
  })
})
