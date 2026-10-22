import { describe, expect, it } from 'vitest'
import {
  CADENCIA_CONTRAPARTE_DIAS,
  calificarTasacion,
  conPieComercial,
  faltantesCampo,
  leerIntencionCampo,
  pedirDatosCampo,
  primerCorreo,
  tocaSeguimiento,
} from './mensajes-tipos'
import { comprometePrecio } from './reglas'

describe('faltantesCampo', () => {
  it('pide hectáreas, aptitud y zona', () => {
    expect(faltantesCampo({})).toEqual(['hectareas', 'aptitud', 'zona'])
    expect(faltantesCampo({ hectareas: 300, aptitud: 'ganadero', provincia: 'Corrientes' })).toEqual([])
  })
})

describe('pedirDatosCampo', () => {
  it('lleva la referencia del caso y pide el plazo en arrendamiento', () => {
    const c = pedirDatosCampo({ leadId: 41, nombre: 'mirko', intent: 'arrendar_busco', faltan: ['aptitud'] })
    expect(c.asunto).toContain('[C-41]')
    expect(c.texto).toContain('Hola Mirko,')
    expect(c.texto).toContain('aptitud')
    expect(c.texto).toContain('desde cuándo')
  })
  it('no promete precio ni comisión', () => {
    const c = pedirDatosCampo({ leadId: 1, nombre: null, intent: 'arrendar_ofrezco', faltan: ['hectareas'] })
    expect(comprometePrecio(c.texto)).toBe(false)
    expect(c.texto).not.toMatch(/comisi[oó]n|%/)
  })
})

describe('calificarTasacion', () => {
  it('pregunta para qué es la tasación y da la herramienta gratis', () => {
    const c = calificarTasacion({ leadId: 7, nombre: 'Ana', zona: 'Santa Fe' })
    expect(c.texto).toMatch(/vender[\s\S]*arrendamiento[\s\S]*cu[aá]nto vale/)
    expect(c.texto).toContain('/campos/valor-hectarea')
  })
})

describe('leerIntencionCampo', () => {
  it('lee la respuesta corta', () => {
    expect(leerIntencionCampo('Arrendarlo')).toBe('arrendar')
    expect(leerIntencionCampo('lo quiero vender')).toBe('vender')
    expect(leerIntencionCampo('solo saber cuánto vale')).toBe('solo_valor')
    expect(leerIntencionCampo('llamame')).toBeNull()
  })
})

describe('primerCorreo', () => {
  it('tasación siempre califica; campo con datos completos no escribe; hacienda no es de acá', () => {
    expect(primerCorreo('tasacion', { id: 1, name: null, intent: 'tasar', datos: {} })).not.toBeNull()
    expect(
      primerCorreo('arrendamiento', { id: 2, name: null, intent: 'arrendar_busco', datos: { hectareas: 50, aptitud: 'mixto', zona: 'Azul' } }),
    ).toBeNull()
    expect(primerCorreo('hacienda', { id: 3, name: null, intent: 'vender', datos: {} })).toBeNull()
  })
})

describe('cadencia a contrapartes', () => {
  it('es 1 inicial + 3 seguimientos en 14 días', () => {
    expect(CADENCIA_CONTRAPARTE_DIAS).toEqual([0, 3, 7, 14])
  })
  it('respeta los días y corta después del cuarto correo', () => {
    expect(tocaSeguimiento(1, 2)).toBe(false)
    expect(tocaSeguimiento(1, 3)).toBe(true)
    expect(tocaSeguimiento(3, 14)).toBe(true)
    expect(tocaSeguimiento(4, 60)).toBe(false)
  })
})

describe('pie comercial', () => {
  it('agrega baja visible y aviso comercial una sola vez', () => {
    const c = conPieComercial({ asunto: 'x', texto: 'hola' })
    expect(c.texto).toContain('comunicación comercial')
    expect(c.texto).toContain('respondé BAJA')
    expect(conPieComercial(c).texto).toBe(c.texto)
  })
})
