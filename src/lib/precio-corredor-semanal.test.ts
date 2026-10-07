import { describe, it, expect, vi } from 'vitest'

/**
 * Lo que se fija acá es la decisión de producto: el precio está anclado en
 * DÓLARES y cuesta lo mismo acá que afuera. Si alguien vuelve a anclarlo en
 * pesos, el suscriptor del exterior empieza a pagar distinto cada mes y el
 * argentino ve subir el precio en dólares sin que nadie lo haya aumentado.
 */

vi.mock('@/lib/data/market-prices.json', () => ({
  default: { usdBlue: { current: 1550 }, lastUpdate: '07/10/2026' },
}))

const {
  precioCorredorSemanal, textoPrecio,
  CORREDOR_SEMANAL_USD_ANUAL, CORREDOR_SEMANAL_USD_MENSUAL,
} = await import('./precio-corredor-semanal')

describe('precio de El Corredor Semanal', () => {
  it('es la mitad de Faxcarne, que es el ancla elegida', () => {
    // Faxcarne: US$ 680 al año, US$ 66 al mes.
    expect(CORREDOR_SEMANAL_USD_ANUAL).toBe(340)
    expect(CORREDOR_SEMANAL_USD_MENSUAL).toBe(33)
  })

  it('el dólar es el ancla y el peso se deriva, no al revés', () => {
    const anual = precioCorredorSemanal('anual')
    expect(anual.usd).toBe(340)
    // 340 × 1.550 = 527.000 → redondeado a diez mil, 530.000.
    expect(anual.ars).toBe(530_000)
    expect(anual.blue).toBe(1550)
  })

  it('redondea comercialmente: un precio no se lee como una cuenta', () => {
    const mensual = precioCorredorSemanal('mensual')
    // 33 × 1.550 = 51.150 → 51.000.
    expect(mensual.ars).toBe(51_000)
    expect(mensual.ars % 1_000).toBe(0)
    expect(precioCorredorSemanal('anual').ars % 10_000).toBe(0)
  })

  it('el anual conviene, y dice cuánto', () => {
    const anual = precioCorredorSemanal('anual')
    // 340 contra 33×12 = 396 → 14% de ahorro, el mismo que usa Faxcarne.
    expect(anual.ahorroPct).toBe(14)
    expect(precioCorredorSemanal('mensual').ahorroPct).toBeNull()
  })

  it('comunica las dos monedas, porque cuestan lo mismo', () => {
    const t = textoPrecio('anual')
    expect(t).toContain('US$ 340')
    expect(t).toContain('530.000')
    expect(t).toContain('al año')
  })
})

describe('sin cotización del dólar', () => {
  it('no inventa un precio en pesos', async () => {
    vi.resetModules()
    vi.doMock('@/lib/data/market-prices.json', () => ({ default: { usdBlue: { current: 0 } } }))
    const mod = await import('./precio-corredor-semanal')
    const p = mod.precioCorredorSemanal('anual')
    expect(p.usd).toBe(340)
    // Cobrar un importe calculado con un tipo de cambio que no existe es peor
    // que no mostrar el precio.
    expect(p.ars).toBe(0)
    expect(mod.textoPrecio('anual')).toBe('US$ 340 al año')
  })
})
