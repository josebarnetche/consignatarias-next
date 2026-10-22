import { describe, expect, it } from 'vitest'
import { armarEmbudoMcp, rango, type LlamadaMcp } from './embudo-mcp'

const llamada = (o: Partial<LlamadaMcp> = {}): LlamadaMcp => ({
  ip: '1.1.1.1', ua: 'python-requests', has_auth: false, probe: null, tool: 'get_indice_novillo', canonico: 'cattle_price_index', ...o,
})

describe('rango', () => {
  it('nunca da el número exacto salvo el cero', () => {
    expect([0, 1, 2, 3, 9, 10, 49, 50, 300].map(rango)).toEqual(['0', '1–2', '1–2', '3–9', '3–9', '10–49', '10–49', '50+', '50+'])
  })
})

describe('armarEmbudoMcp', () => {
  it('descarta escáneres y cuenta orígenes por ip', () => {
    const e = armarEmbudoMcp(
      [llamada(), llamada({ ip: '2.2.2.2' }), llamada({ ip: '3.3.3.3', probe: 'true' }), llamada({ probe: true })],
      [],
    )
    expect(e.toolsCall).toBe(2)
    expect(e.origenes).toBe(2)
  })

  it('separa la integración anónima (sin auth y sin UA)', () => {
    const e = armarEmbudoMcp([llamada({ ua: null }), llamada({ ua: '' }), llamada({ ua: null, has_auth: true }), llamada()], [])
    expect(e.anonimas).toBe(2)
  })

  it('cuenta el puente por nombre canónico o pedido', () => {
    const e = armarEmbudoMcp(
      [llamada({ tool: 'market_match', canonico: null }), llamada({ tool: 'pedir_hacienda', canonico: 'cattle_buying_request' }), llamada()],
      [],
    )
    expect(e.puente).toBe(2)
  })

  it('pedidos, verificados y en operación van en rangos', () => {
    const e = armarEmbudoMcp([], [
      { status: 'needs_review', caso: null },
      { status: 'new', caso: 'ofreciendo' },
      { status: 'routed', caso: null },
      { status: 'discarded', caso: 'descartado' },
    ])
    expect(e).toMatchObject({ pedidos: '3–9', verificados: '1–2', enOperacion: '1–2' })
  })

  it('separa la confirmación enviada y la que hizo la persona', () => {
    const e = armarEmbudoMcp([], [
      { status: 'needs_review', caso: null, confirmacionEnviada: true },
      { status: 'new', caso: 'ofreciendo', confirmacionEnviada: true, confirmado: true },
      { status: 'new', caso: null },
    ])
    expect(e).toMatchObject({ confirmacionEnviada: '1–2', confirmados: '1–2', verificados: '1–2' })
  })
})
