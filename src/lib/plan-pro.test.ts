import { describe, it, expect } from 'vitest'
import { FUNCIONES_PREMIUM, PRO_ABIERTO, esFuncionPremium } from './plan-pro'

describe('qué se cobra y qué no', () => {
  /**
   * La lista negra. Estas superficies son el motor de descubrimiento del sitio: los
   * asistentes nos citan por ellas (799 sesiones de Copilot y ChatGPT en diez semanas) y
   * /mercado/spread es la página más leída y la que mejor convierte (5,7 %).
   *
   * Si alguna aparece como función premium, el test falla: cerrarlas sería cambiar
   * conversión y citabilidad por unos pesos.
   */
  const NUNCA_SE_GATEA = [
    'precio-del-dia',
    'precios-por-firma',
    'webcal',
    'guias',
    'comparador',
    'spread',
  ]

  it('no gatea nada de la superficie de descubrimiento', () => {
    for (const prohibida of NUNCA_SE_GATEA) {
      expect(esFuncionPremium(prohibida)).toBe(false)
    }
  })

  it('sólo se cobran tres cosas', () => {
    expect(FUNCIONES_PREMIUM.map((f) => f.clave).sort()).toEqual([
      'alertas',
      'exportar',
      'historico-profundo',
    ])
  })

  it('cada función declara qué sigue siendo gratis', () => {
    // El muro no esconde el límite: dice qué se ve sin pagar. Sin esto, el gate se lee
    // como "ahora todo es pago" y espanta al que ya usaba la herramienta.
    for (const f of FUNCIONES_PREMIUM) {
      expect(f.gratis.length).toBeGreaterThan(20)
      expect(f.beneficio.length).toBeGreaterThan(30)
    }
  })
})

describe('el plan', () => {
  it('el precio cobrado cae dentro del rango comunicado', () => {
    expect(PRO_ABIERTO.precio).toBeGreaterThanOrEqual(PRO_ABIERTO.precioMin)
    expect(PRO_ABIERTO.precio).toBeLessThanOrEqual(PRO_ABIERTO.precioMax)
  })

  it('nace con meta, fecha de corte y qué hacer si no llega', () => {
    expect(PRO_ABIERTO.metaArs).toBeGreaterThan(0)
    expect(PRO_ABIERTO.fechaCorte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(PRO_ABIERTO.siNoLlega.length).toBeGreaterThan(40)
  })

  it('está muy por debajo del piso profesional del mercado', () => {
    // Informe Ganadero son ARS 200.000 de suscripción anual; el día de campo de un
    // agrónomo, ARS 450.000. PRO tiene que leerse como otra categoría, no como competencia.
    expect(PRO_ABIERTO.precio * 12).toBeLessThan(200_000)
  })
})
