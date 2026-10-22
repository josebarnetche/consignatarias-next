import { describe, it, expect } from 'vitest'
import { provinciaParaFormulario, zonaParaFormulario, categoriaParaFormulario, sourceDePagina } from './contexto-pagina'

describe('provinciaParaFormulario', () => {
  it('lleva la grafía del padrón a la opción del selector', () => {
    expect(provinciaParaFormulario('BUENOS AIRES')).toBe('Buenos Aires')
    expect(provinciaParaFormulario('ENTRE RIOS')).toBe('Entre Ríos')
    expect(provinciaParaFormulario('entre-rios')).toBe('Entre Ríos')
    expect(provinciaParaFormulario('Córdoba')).toBe('Córdoba')
  })
  it('no precarga la Capital Federal: la hacienda no está ahí', () => {
    expect(provinciaParaFormulario('CAPITAL FEDERAL')).toBe('')
    expect(provinciaParaFormulario('CABA')).toBe('')
  })
  it('vacío si no hay o no se reconoce', () => {
    expect(provinciaParaFormulario(null)).toBe('')
    expect(provinciaParaFormulario('Uruguay')).toBe('')
  })
})

describe('zonaParaFormulario', () => {
  it('se queda con la localidad', () => {
    expect(zonaParaFormulario('Mercedes, Corrientes')).toBe('Mercedes')
    expect(zonaParaFormulario('Villaguay')).toBe('Villaguay')
  })
  it('descarta la capital y lo vacío', () => {
    expect(zonaParaFormulario('CABA')).toBe('')
    expect(zonaParaFormulario('')).toBe('')
    expect(zonaParaFormulario(undefined)).toBe('')
  })
})

describe('categoriaParaFormulario', () => {
  it('reconoce el slug, el singular y las terneras', () => {
    expect(categoriaParaFormulario('novillos')).toBe('novillos')
    expect(categoriaParaFormulario('vaca')).toBe('vacas')
    expect(categoriaParaFormulario('terneras')).toBe('terneros')
    expect(categoriaParaFormulario('hacienda-en-pie')).toBe('')
  })
})

describe('sourceDePagina', () => {
  it('arma <tipo>:<clave> limpio y con tope de 80', () => {
    expect(sourceDePagina('consignataria', 'rosgan')).toBe('consignataria:rosgan')
    expect(sourceDePagina('frigorificos-provincia', 'Entre Rios')).toBe('frigorificos-provincia:entre-rios')
    expect(sourceDePagina('remate', 'x'.repeat(200)).length).toBe(80)
  })
})
