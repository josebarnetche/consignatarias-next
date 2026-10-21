import { describe, expect, it } from 'vitest'
import { TIPOS, enviaAContrapartes, prioridad, tipoDeIntent, valuarLead, type Referencias } from './tipos'

const ref: Referencias = { precioNovilloKg: 3000, pesoKg: () => 400, kgHaMesTipico: 4 }

describe('tipoDeIntent', () => {
  it('mapea cada intent del sitio a su tipo', () => {
    expect(tipoDeIntent('vender')).toBe('hacienda')
    expect(tipoDeIntent('comprar')).toBe('hacienda')
    expect(tipoDeIntent('arrendar_busco')).toBe('arrendamiento')
    expect(tipoDeIntent('arrendar_ofrezco')).toBe('arrendamiento')
    expect(tipoDeIntent('busca-campo')).toBe('campo')
    expect(tipoDeIntent('tasar')).toBe('tasacion')
  })
  it('no toma lo que no es una operación', () => {
    expect(tipoDeIntent('contactar_frigorifico')).toBeNull()
    expect(tipoDeIntent('contacto_proveedor')).toBeNull()
    expect(tipoDeIntent(null)).toBeNull()
  })
})

describe('enviaAContrapartes', () => {
  it('solo hacienda sale: es el único tipo con comisión definida por José', () => {
    expect(enviaAContrapartes('hacienda')).toBe(true)
    expect(enviaAContrapartes('arrendamiento')).toBe(false)
    expect(enviaAContrapartes('campo')).toBe(false)
    expect(enviaAContrapartes('tasacion')).toBe(false)
  })
  it('la comisión de hacienda sigue siendo 1%', () => {
    expect(TIPOS.hacienda.comisionPct).toBe(1)
  })
})

describe('valuarLead', () => {
  it('hacienda: cabezas × peso × precio, 1%', () => {
    const v = valuarLead({ intent: 'vender', head_count: 100, category: 'novillos' }, ref)
    expect(v).toEqual({ tipo: 'hacienda', brutoArs: 120_000_000, comisionArs: 1_200_000 })
  })
  it('hacienda sin cabezas: sin número y dice por qué', () => {
    const v = valuarLead({ intent: 'comprar' }, ref)
    expect(v?.brutoArs).toBeNull()
    expect(v?.motivo).toBe('faltan las cabezas')
  })
  it('arrendamiento: calcula el canon anual pero no inventa la comisión', () => {
    const v = valuarLead({ intent: 'arrendar_busco', hectareas: 500 }, ref)
    expect(v?.brutoArs).toBe(500 * 4 * 12 * 3000)
    expect(v?.comisionArs).toBeNull()
    expect(v?.motivo).toMatch(/sin definir por José/)
  })
  it('arrendamiento usa el canon del lead si lo trae', () => {
    const v = valuarLead({ intent: 'arrendar_ofrezco', hectareas: 100, kg_ha_mes: 6 }, ref)
    expect(v?.brutoArs).toBe(100 * 6 * 12 * 3000)
  })
  it('tasación no genera comisión', () => {
    expect(valuarLead({ intent: 'tasar', hectareas: 50 }, ref)?.comisionArs).toBeNull()
  })
  it('intent desconocido: null', () => {
    expect(valuarLead({ intent: 'contacto_proveedor' }, ref)).toBeNull()
  })
})

describe('prioridad', () => {
  it('un caso presentado pesa más que uno nuevo con la misma comisión', () => {
    const v = valuarLead({ intent: 'vender', head_count: 100 }, ref)
    expect(prioridad(v, 'presentado')).toBeGreaterThan(prioridad(v, 'nuevo'))
  })
  it('sin comisión calculable o estado cerrado: 0', () => {
    expect(prioridad(valuarLead({ intent: 'tasar' }, ref), 'nuevo')).toBe(0)
    expect(prioridad(valuarLead({ intent: 'vender', head_count: 10 }, ref), 'cerrado')).toBe(0)
  })
})
