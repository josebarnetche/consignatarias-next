import { describe, it, expect, vi } from 'vitest'

// Las superficies llaman a los helpers SIN argumento: leen market-prices.json. Con un JSON
// observado (lo que deja el scraper cuando MAGyP responde), ninguno puede decir «estimado».
vi.mock('@/lib/data/market-prices.json', () => ({
  default: {
    lastUpdate: '2026-11-20',
    categories: {
      terneros: {
        current: 6389,
        prev: 6200,
        change: 3,
        source: 'MAGyP · Entre Surcos y Corrales (mensual)',
        observado: true,
        observedDate: '2026-10',
        metodo: null,
      },
    },
  },
}))

import { terneroDato, terneroCalificador, terneroNota, terneroFuenteFrase, terneroCuando, terneroValorFrase } from './ternero'

describe('superficies con el ternero observado (JSON por defecto mockeado)', () => {
  it('el dato por defecto es el observado de MAGyP', () => {
    expect(terneroDato()).toMatchObject({ precio: 6389, observado: true, mes: '2026-10', metodo: null })
  })

  it('ningún rótulo dice «estimad», «INMAG ×» ni «hoy»', () => {
    const textos = [
      terneroCalificador(),
      terneroNota(),
      terneroFuenteFrase(),
      terneroCuando('2026-11-20'),
      terneroValorFrase('$6.389/kg', '2026-11-20'),
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/estimad|INMAG ×|\bhoy\b/i)
    }
    expect(terneroCalificador()).toBe('(MAGyP, octubre de 2026)')
    expect(terneroCuando('2026-11-20')).toBe('último dato, octubre de 2026')
    expect(terneroValorFrase('$6.389/kg', '2026-11-20')).toContain('MAGyP')
  })

  it('no se lo atribuye al Mercado Agroganadero como fuente', () => {
    expect(terneroNota()).toMatch(/El Mercado Agroganadero no opera terneros/)
    expect(terneroFuenteFrase()).not.toMatch(/Mercado Agroganadero/)
  })
})
