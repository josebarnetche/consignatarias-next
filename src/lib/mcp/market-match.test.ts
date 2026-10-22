import { describe, it, expect } from 'vitest'
import { panoramaContraparte, textoPanorama, K_MIN, type ConsultaMercado } from './market-match'
import type { LeadFila } from '@/lib/mercado/leads-mesa'

const AHORA = Date.parse('2026-10-21T04:00:00Z')
let seq = 0
const lead = (p: Partial<LeadFila>): LeadFila => {
  seq += 1
  return {
    id: seq, created_at: '2026-10-20T12:00:00Z', intent: 'comprar', category: 'terneros', head_count: 60,
    hectareas: null, province: 'Entre Ríos', zona: 'Gualeguaychú', name: `Comprador Secreto ${seq}`,
    phone: `11555${String(seq).padStart(5, '0')}`, email: `c${seq}@feedlot.com`, status: 'new', fee_ars: null, source: null, ...p,
  }
}

describe('market_match', () => {
  const base = [
    lead({ province: 'Entre Ríos' }),
    lead({ province: 'Santa Fe', head_count: 45 }),
    lead({ province: 'Corrientes', head_count: 300 }), // solo en el NEA: no se ve
    lead({ intent: 'vender', province: 'Entre Ríos' }), // misma punta: no cuenta
    lead({ status: 'discarded' }), // cerrado
    lead({ category: 'vacas' }), // otra categoría
  ]
  const vender: ConsultaMercado = { quiere: 'vender', categoria: 'terneros', cabezas: 80, provincia: 'Entre Ríos' }

  it('cuenta los compradores visibles para quien vende', () => {
    const p = panoramaContraparte(base, vender, AHORA)
    expect(p).toMatchObject({ vertical: 'hacienda', ladoBuscado: 'compradores', hay: true })
    expect(p.grupos).toEqual([{ zona: 'la zona núcleo', rango: '2 a 4' }])
  })

  it(`un lead suelto no se ve (grupos de ${K_MIN} o más)`, () => {
    const p = panoramaContraparte([lead({ province: 'Corrientes' })], vender, AHORA)
    expect(p.hay).toBe(false)
  })

  describe('regresión: no se puede aislar a un lead variando la consulta (revisión 21-10-2026)', () => {
    const victima = lead({ province: 'Misiones', head_count: 137 })
    const mesa = [victima, lead({ province: 'Buenos Aires' }), lead({ province: 'Santa Fe' })]

    it('cambiar provincia o cabezas no cambia nada de la respuesta', () => {
      const salidas = [
        { provincia: 'Misiones', cabezas: 137 }, { provincia: 'Corrientes', cabezas: 100 },
        { provincia: 'Chaco', cabezas: 140 }, { provincia: null, cabezas: null },
      ].map((v) => JSON.stringify(panoramaContraparte(mesa, { quiere: 'vender', categoria: 'terneros', ...v }, AHORA)))
      expect(new Set(salidas).size).toBe(1)
    })

    it('las hectáreas de la consulta no mueven el total de campos', () => {
      const campos = [lead({ intent: 'arrendar_ofrezco', category: null, head_count: null, hectareas: 300, province: 'Buenos Aires' })]
      const hay = [74, 75, 1200, 1201].map((ha) => panoramaContraparte(campos, { quiere: 'arrendar_busco', hectareas: ha }, AHORA).hay)
      expect(hay).toEqual([false, false, false, false])
    })

    it('no publica probabilidad ni nada por lead', () => {
      const p = panoramaContraparte(mesa, { quiere: 'vender', categoria: 'terneros' }, AHORA)
      expect(Object.keys(p).sort()).toEqual(['grupos', 'hay', 'ladoBuscado', 'vertical'])
    })

    it('un pedido falso cargado por el MCP no completa el grupo de la víctima', () => {
      const falso = lead({ province: 'Misiones', source: 'mcp:market_match' })
      const p = panoramaContraparte([victima, falso], { quiere: 'vender', categoria: 'terneros' }, AHORA)
      expect(p.hay).toBe(false)
    })

    it('nunca publica volumen ni el número exacto: entrar o salir un pedido no se nota dentro del tramo', () => {
      const tres = panoramaContraparte([1, 2, 3].map(() => lead({ province: 'Santa Fe', head_count: 50 })), vender, AHORA)
      const cuatro = panoramaContraparte([1, 2, 3, 4].map(() => lead({ province: 'Santa Fe', head_count: 90 })), vender, AHORA)
      expect(JSON.stringify(tres)).toBe(JSON.stringify(cuatro))
      expect(JSON.stringify(tres)).not.toMatch(/150|360|volumen|cantidad/)
    })
  })

  it('el texto nunca contiene datos de un lead', () => {
    const t = textoPanorama(panoramaContraparte(base, vender, AHORA), vender)
    expect(t).not.toMatch(/Secreto|feedlot\.com|11555|Gualeguaychú|Corrientes|Santa Fe/)
    expect(t).toMatch(/consentimiento: true/)
  })

  it('quien busca campo para arrendar mira a quienes ofrecen', () => {
    const campos = [1, 2].map(() => lead({ intent: 'arrendar_ofrezco', category: null, head_count: null, hectareas: 120, province: 'Buenos Aires' }))
    const p = panoramaContraparte(campos, { quiere: 'arrendar_busco', hectareas: 100 }, AHORA)
    expect(p).toMatchObject({ vertical: 'campos', ladoBuscado: 'quienes ofrecen campo', hay: true })
  })

  it('sin contraparte visible invita a dejar el pedido', () => {
    const q: ConsultaMercado = { quiere: 'comprar', categoria: 'vacas', provincia: 'Salta' }
    const p = panoramaContraparte([], q, AHORA)
    expect(p.hay).toBe(false)
    expect(textoPanorama(p, q)).toMatch(/registrar: true/)
  })
})
