import { describe, it, expect } from 'vitest'
import { conPuente, lineaPuente } from './puente'

describe('puente del dato a la operación', () => {
  it('hacienda invita a vender o comprar; campos, a arrendar', () => {
    expect(lineaPuente('value_cattle_lot')).toMatch(/quiere: vender \| comprar/)
    expect(lineaPuente('value_farmland_rent')).toMatch(/arrendar_busco \| arrendar_ofrezco/)
  })

  it('las tools que no son de precio, lote, remates o campos no llevan puente', () => {
    for (const t of ['market_match', 'renspa_lookup', 'find_meat_plant', 'inmag_history', 'tool_inexistente']) {
      expect(lineaPuente(t)).toBeNull()
    }
  })

  it('pide permiso explícito y no promete datos de la contraparte', () => {
    const l = lineaPuente('livestock_prices') ?? ''
    expect(l).toMatch(/permiso explícito/)
    expect(l).toMatch(/sin identificar a nadie/)
  })

  it('se agrega al último bloque de texto y no toca los errores', () => {
    const r = conPuente({ content: [{ type: 'text', text: 'Novillo 4.250' }] }, 'livestock_prices')
    expect(r.content[0].text).toMatch(/^Novillo 4\.250\n\n── Si quiere operar ──/)
    const e = { content: [{ type: 'text', text: 'falló' }], isError: true }
    expect(conPuente(e, 'livestock_prices')).toBe(e)
  })
})
