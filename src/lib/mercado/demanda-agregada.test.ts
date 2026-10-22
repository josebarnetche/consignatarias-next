import { describe, it, expect } from 'vitest'
import type { LeadFila } from '@/lib/mercado/leads-mesa'
import { agregarDemanda, categoriaPublica, VENTANA_DIAS } from './demanda-agregada'

const AHORA = Date.parse('2026-10-21T12:00:00Z')
const haceDias = (d: number) => new Date(AHORA - d * 86_400_000).toISOString()

let seq = 1
function lead(p: Partial<LeadFila>): LeadFila {
  const id = seq++
  return {
    id,
    created_at: haceDias(5),
    intent: 'comprar',
    category: null,
    head_count: null,
    hectareas: null,
    province: null,
    zona: null,
    name: `Productor Secreto ${id}`,
    phone: `+54 9 11 5555-${String(1000 + id)}`,
    email: `secreto${id}@ejemplo.com`,
    status: 'new',
    fee_ars: 987654,
    ...p,
  }
}

/** Mesa FICTICIA, con forma de la real. Ningún dato sale de la base. */
function mesaFicticia(): LeadFila[] {
  return [
    // 3 compradores de terneros en la zona núcleo
    lead({ intent: 'comprar', category: 'Terneros', head_count: 120, province: 'Buenos Aires', zona: 'Ayacucho' }),
    lead({ intent: 'comprar', category: 'terneros', head_count: 80, province: 'Santa Fe', zona: 'Rafaela' }),
    lead({ intent: 'comprar', category: 'ternero', head_count: 47, province: 'Córdoba', zona: 'Río Cuarto', status: 'contacted' }),
    // 2 compradores de novillos, uno en NEA y otro en Cuyo → "otras zonas"
    lead({ intent: 'comprar', category: 'novillos', head_count: 200, province: 'Corrientes', zona: 'Mercedes' }),
    lead({ intent: 'comprar', category: 'novillos', head_count: 60, province: 'Mendoza', zona: 'San Rafael' }),
    // 4 vendedores de vacas en el NEA (el needs_review no cuenta en la página pública)
    lead({ intent: 'vender', category: 'Vacas', head_count: 150, province: 'Corrientes', zona: 'Curuzú Cuatiá' }),
    lead({ intent: 'vender', category: 'vacas', head_count: 90, province: 'Chaco', zona: 'Charata' }),
    lead({ intent: 'consignar', category: 'vaca', head_count: 35, province: 'Formosa', zona: 'Pirané' }),
    lead({ intent: 'vender', category: 'vacas', head_count: null, province: 'Misiones', zona: 'Oberá', status: 'needs_review' }),
    // 1 vendedor de toros y 1 con categoría de texto libre → solo en el total
    lead({ intent: 'vender', category: 'toros', head_count: 12, province: 'Salta', zona: 'Rosario de la Frontera' }),
    lead({ intent: 'vender', category: 'lote de Juan Pérez', head_count: 30, province: 'La Pampa', zona: 'General Pico' }),
    // 3 buscan campo para arrendar en la zona núcleo
    lead({ intent: 'arrendar_busco', hectareas: 300, province: 'Buenos Aires', zona: 'Tandil' }),
    lead({ intent: 'arrendar_busco', hectareas: 500, province: 'Buenos Aires', zona: 'Azul' }),
    lead({ intent: 'arrendar_busco', hectareas: 120, province: 'Entre Ríos', zona: 'Gualeguay' }),
    // 1 ofrece campo en arrendamiento → solo en el total
    lead({ intent: 'arrendar_ofrezco', hectareas: 800, province: 'Corrientes', zona: 'Esquina' }),
    // fuera de la cuenta: cerrado, viejo, tasación
    lead({ intent: 'comprar', category: 'terneros', head_count: 999, province: 'Buenos Aires', status: 'closed' }),
    lead({ intent: 'comprar', category: 'terneros', head_count: 999, province: 'Buenos Aires', created_at: haceDias(VENTANA_DIAS + 1) }),
    lead({ intent: 'tasar', hectareas: 1000, province: 'Buenos Aires' }),
  ]
}

describe('agregarDemanda', () => {
  it('lo que mostraría la página hoy (mesa ficticia)', () => {
    const r = agregarDemanda(mesaFicticia(), AHORA)
    expect(r.grupos.map((g) => g.frase)).toEqual([
      'Entre 2 y 4 compradores buscando terneros en la zona núcleo',
      'Entre 2 y 4 compradores buscando novillos en otras zonas',
      'Entre 2 y 4 vendedores de vacas en el NEA',
      'Entre 2 y 4 vendedores de hacienda de otras categorías en otras zonas',
      'Entre 2 y 4 personas buscando campo para arrendar en la zona núcleo',
    ])
    expect(r.rangoTotal).toBe('10 o más') // el needs_review no cuenta en la página pública
  })

  it('anonimato: la salida no contiene nombre, email, teléfono, zona, provincia, id ni precio de ningún lead', () => {
    const leads = mesaFicticia()
    const salida = JSON.stringify(agregarDemanda(leads, AHORA))
    for (const l of leads) {
      for (const v of [l.name, l.email, l.phone, l.zona, l.province]) {
        if (v) expect(salida).not.toContain(v)
      }
      expect(salida).not.toContain(String(l.fee_ars))
    }
    for (const prov of ['Buenos Aires', 'Santa Fe', 'Córdoba', 'Corrientes', 'Mendoza', 'Chaco', 'Formosa', 'Misiones', 'Salta', 'La Pampa', 'Entre Ríos']) {
      expect(salida).not.toContain(prov)
    }
    expect(salida).not.toContain('Juan Pérez')
    expect(salida).not.toMatch(/"id":\d/)
  })

  it('no publica conteos exactos ni volumen: solo rangos', () => {
    const r = agregarDemanda(mesaFicticia(), AHORA)
    for (const g of r.grupos) expect(['2 a 4', '5 a 9', '10 o más']).toContain(g.rango)
    expect(JSON.stringify(r)).not.toMatch(/cantidad|volumen|sinDetalle|"total"/)
  })

  it('umbral k: un lead solo no se muestra en ningún lado, ni en los totales', () => {
    const r = agregarDemanda([lead({ intent: 'comprar', category: 'novillos', head_count: 300, province: 'Mendoza' })], AHORA)
    expect(r).toMatchObject({ hay: false, rangoTotal: null, grupos: [], totales: [] })
  })

  it('regresión (segunda revisión): que entre o salga un pedido no se nota dentro del tramo', () => {
    const base = [1, 2, 3].map(() => lead({ intent: 'comprar', category: 'terneros', head_count: 200, province: 'Santa Fe' }))
    const conUnoMas = [...base, lead({ intent: 'comprar', category: 'terneros', head_count: 90, province: 'Santa Fe' })]
    expect(JSON.stringify(agregarDemanda(base, AHORA))).toBe(JSON.stringify(agregarDemanda(conUnoMas, AHORA)))
  })

  it('umbral k: dos en la misma región forman grupo propio; uno en cada región va a "otras zonas"', () => {
    const misma = agregarDemanda([
      lead({ intent: 'vender', category: 'vacas', province: 'Corrientes' }),
      lead({ intent: 'vender', category: 'vacas', province: 'Chaco' }),
    ], AHORA)
    expect(misma.grupos).toHaveLength(1)
    expect(misma.grupos[0]).toMatchObject({ zona: 'el NEA', rango: '2 a 4' })

    const distintas = agregarDemanda([
      lead({ intent: 'vender', category: 'vacas', province: 'Corrientes' }),
      lead({ intent: 'vender', category: 'vacas', province: 'Salta' }),
    ], AHORA)
    expect(distintas.grupos).toHaveLength(1)
    expect(distintas.grupos[0]).toMatchObject({ zona: 'otras zonas', categoria: 'vacas', rango: '2 a 4' })
  })

  it('corte de 90 días: el día 90 cuenta, el 91 no', () => {
    const dentro = lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires', created_at: haceDias(VENTANA_DIAS - 0.01) })
    const otro = lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires' })
    expect(agregarDemanda([dentro, otro], AHORA).hay).toBe(true)
    const fuera = lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires', created_at: haceDias(VENTANA_DIAS + 1) })
    const roto = lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires', created_at: 'no es fecha' })
    expect(agregarDemanda([fuera, otro], AHORA).hay).toBe(false)
    expect(agregarDemanda([roto, otro], AHORA).hay).toBe(false)
  })

  it('solo pedidos abiertos', () => {
    const r = agregarDemanda([
      lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires', status: 'won' }),
      lead({ intent: 'comprar', category: 'terneros', province: 'Buenos Aires', status: 'lost' }),
    ], AHORA)
    expect(r.hay).toBe(false)
  })

  it('un pedido a revisar o sin verificar no cuenta en la página pública', () => {
    const verificado = lead({ intent: 'comprar', category: 'terneros', province: 'Santa Fe' })
    expect(agregarDemanda([verificado, lead({ intent: 'comprar', category: 'terneros', province: 'Santa Fe', status: 'needs_review' })], AHORA).hay).toBe(false)
    expect(agregarDemanda([verificado, lead({ intent: 'comprar', category: 'terneros', province: 'Santa Fe', source: 'mcp:market_match' })], AHORA).hay).toBe(false)
  })

  it('agrupa por vertical, lado, categoría y región', () => {
    const r = agregarDemanda([
      lead({ intent: 'comprar', category: 'terneros', head_count: 33, province: 'Buenos Aires' }),
      lead({ intent: 'comprar', category: 'terneros', head_count: 41, province: 'La Pampa' }),
      lead({ intent: 'vender', category: 'terneros', head_count: 50, province: 'Buenos Aires' }),
      lead({ intent: 'vender', category: 'terneros', head_count: 50, province: 'Santa Fe' }),
      lead({ intent: 'arrendar_ofrezco', hectareas: 404, province: 'Corrientes' }),
      lead({ intent: 'arrendar_ofrezco', hectareas: 300, province: 'Misiones' }),
      lead({ intent: 'comprar', hectareas: 1000, province: 'Corrientes' }),
      lead({ intent: 'comprar', hectareas: 2000, province: 'Chaco' }),
    ], AHORA)
    expect(r.grupos.map((g) => [g.vertical, g.lado, g.categoria, g.zona, g.rango])).toEqual([
      ['hacienda', 'compran', 'terneros', 'la zona núcleo', '2 a 4'],
      ['hacienda', 'venden', 'terneros', 'la zona núcleo', '2 a 4'],
      ['campos', 'buscan', 'venta', 'el NEA', '2 a 4'],
      ['campos', 'ofrecen', 'arrendamiento', 'el NEA', '2 a 4'],
    ])
    expect(new Set(r.grupos.map((g) => g.id)).size).toBe(r.grupos.length)
    expect(r.grupos[0].id).toBe('hacienda-compran-terneros-pampeana')
  })

  it('la categoría pasa por lista cerrada', () => {
    expect(categoriaPublica('Vaquillona')).toBe('vaquillonas')
    expect(categoriaPublica('NOVILLITOS ')).toBe('novillitos')
    expect(categoriaPublica('las vacas de Pérez')).toBeNull()
    expect(categoriaPublica(null)).toBeNull()
  })

  it('mesa vacía', () => {
    expect(agregarDemanda([], AHORA)).toMatchObject({ hay: false, rangoTotal: null, grupos: [], totales: [] })
  })
})
