import { describe, expect, it } from 'vitest'
import { TIPOS, comisionArrendamiento, comisionArrendamientoLegal, plazoEnAnios, comisionArrendamientoMercado, enviaAContrapartes, prioridad, tipoDeIntent, valuarLead, type Referencias } from './tipos'

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
  it('sale solo hacienda: arrendamiento tiene comisión pero bloqueo legal (matrícula de corredor)', () => {
    expect(enviaAContrapartes('hacienda')).toBe(true)
    expect(TIPOS.arrendamiento.bloqueoLegal).toMatch(/matriculado/)
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
  it('arrendamiento: 0,8 de un mes de canon (un mes con 20% off)', () => {
    const v = valuarLead({ intent: 'arrendar_busco', hectareas: 500 }, ref)
    const anual = 500 * 4 * 12 * 3000
    expect(v?.brutoArs).toBe(anual)
    expect(v?.comisionArs).toBe(Math.round((anual / 12) * 0.8))
  })
  it('el ahorro contra el mercado es exactamente el 20%', () => {
    const anual = 12_000_000
    expect(comisionArrendamientoMercado(anual)).toBe(1_000_000)
    expect(comisionArrendamiento(anual)).toBe(800_000)
  })
  it('venta de campo sigue sin comisión definida', () => {
    expect(TIPOS.campo.comisionPct).toBeNull()
    expect(TIPOS.campo.comisionMesesCanon).toBeUndefined()
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

describe('comisión de arrendamiento dentro de la escala legal', () => {
  const canon = 12_000_000 // $1M por mes
  it('Buenos Aires: tope 4% y piso 2% del valor del contrato', () => {
    expect(comisionArrendamientoLegal(canon, { provincia: 'Buenos Aires', plazoAnios: 1 })).toBe(480_000) // 0,48 meses
    expect(comisionArrendamientoLegal(canon, { provincia: 'BUENOS AIRES', plazoAnios: 3 })).toBe(800_000) // 0,8 meses
    expect(comisionArrendamientoLegal(canon, { provincia: 'buenos aires', plazoAnios: 5 })).toBe(1_200_000) // 1,2 meses
  })
  it('sin plazo vale el mínimo legal de 3 años', () => {
    expect(comisionArrendamientoLegal(canon, { provincia: 'Buenos Aires' })).toBe(800_000)
  })
  it('Córdoba (5%), Santa Fe (6%) y el resto (4%) solo tienen tope', () => {
    expect(comisionArrendamientoLegal(canon, { provincia: 'Córdoba', plazoAnios: 1 })).toBe(600_000)
    expect(comisionArrendamientoLegal(canon, { provincia: 'Santa Fe', plazoAnios: 1 })).toBe(720_000)
    expect(comisionArrendamientoLegal(canon, { provincia: 'Corrientes', plazoAnios: 1 })).toBe(480_000)
    expect(comisionArrendamientoLegal(canon, { provincia: 'Corrientes', plazoAnios: 10 })).toBe(800_000)
  })
  it('lee el plazo que contestó el lead', () => {
    expect(plazoEnAnios('3 años')).toBe(3)
    expect(plazoEnAnios('por 2 campañas desde marzo')).toBe(2)
    expect(plazoEnAnios('18 meses')).toBe(1.5)
    expect(plazoEnAnios('lo antes posible')).toBeNull()
    expect(plazoEnAnios(null)).toBeNull()
  })
})
