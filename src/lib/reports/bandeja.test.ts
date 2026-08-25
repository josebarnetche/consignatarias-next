import { describe, it, expect } from 'vitest'
import { construirBandeja, type InsumosBandeja } from './bandeja'
import type { Cartera } from './cartera'
import type { Benchmark } from './benchmark'

/**
 * La bandeja decide qué ve primero una consignataria cuando abre el panel. Si el
 * orden está mal, el trabajo importante queda debajo del ruido y la herramienta deja
 * de usarse.
 */

const vacio: InsumosBandeja = {
  cartera: null,
  benchmark: null,
  participacion: null,
  leadsNuevos: [],
  proximosRemates: [],
  faltaWhatsapp: false,
}

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

function cartera(over: Partial<Cartera> = {}): Cartera {
  return {
    slug: 'x', dias: 90, totalClientes: 10,
    enRiesgo: [], nuevos: [], ganados: [], top: [],
    concentracionTop5: 0, cabezas: 0, ...over,
  }
}

function benchmark(over: Partial<Benchmark> = {}): Benchmark {
  return {
    slug: 'x', dias: 60, filas: [], totalLotes: 0, totalCabezas: 0,
    clientes: 0, fuertes: [], debiles: [], ultimaVenta: null, ...over,
  }
}

describe('construirBandeja', () => {
  it('sin nada que atender, devuelve la bandeja vacía', () => {
    // Mejor decir "no hay nada" que inventar tareas decorativas.
    const b = construirBandeja(vacio)
    expect(b.entradas).toHaveLength(0)
    expect(b.urgentes).toBe(0)
  })

  it('pone al cliente que se va por encima de un lead nuevo', () => {
    // 400 cabezas yéndose valen más que una consulta de ayer.
    const b = construirBandeja({
      ...vacio,
      leadsNuevos: [{ id: 1, name: 'Juan', created_at: hace(0), message: 'consulta' }],
      cartera: cartera({
        enRiesgo: [{
          nombre: 'LA ESTELITA SA', localidad: 'AZUL', provincia: 'BUENOS AIRES',
          diasSilencio: 54, cadenciaDias: 10, consignaciones: 6, cabezas: 404, seFueA: null,
        }],
      }),
    })
    expect(b.entradas[0].tipo).toBe('cliente_fuga')
    expect(b.entradas[1].tipo).toBe('lead')
  })

  it('un cliente que se fue a un competidor pesa más que uno que sólo dejó de operar', () => {
    const base = {
      localidad: null, provincia: null, diasSilencio: 40,
      cadenciaDias: 10, consignaciones: 5, cabezas: 100,
    }
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: [
          { ...base, nombre: 'SILENCIOSO', seFueA: null },
          { ...base, nombre: 'MUDADO', seFueA: 'LA COMPETENCIA' },
        ],
      }),
    })
    expect(b.entradas[0].titulo).toContain('MUDADO')
    expect(b.entradas[0].detalle).toContain('LA COMPETENCIA')
  })

  it('marca urgente un lead que espera hace días', () => {
    const b = construirBandeja({
      ...vacio,
      leadsNuevos: [{ id: 1, name: 'Ramón', created_at: hace(4), message: null }],
    })
    expect(b.entradas[0].urgencia).toBe('urgente')
    expect(b.entradas[0].dato).toBe('hace 4d')
  })

  it('un lead de hoy es atención, no urgencia', () => {
    const b = construirBandeja({
      ...vacio,
      leadsNuevos: [{ id: 1, name: 'Ramón', created_at: hace(0), message: null }],
    })
    expect(b.entradas[0].urgencia).toBe('atencion')
    expect(b.entradas[0].dato).toBe('hoy')
  })

  it('las buenas noticias van debajo de lo accionable', () => {
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: [{
          nombre: 'SE VA', localidad: null, provincia: null, diasSilencio: 40,
          cadenciaDias: 10, consignaciones: 5, cabezas: 50, seFueA: null,
        }],
        ganados: [{ nombre: 'LLEGÓ', localidad: null, cabezas: 900, veniaDe: 'OTRA', desde: '2026-08-01' }],
      }),
    })
    // Aunque el ganado mueva más cabezas, primero va lo que hay que resolver.
    expect(b.entradas[0].tipo).toBe('cliente_fuga')
    expect(b.entradas.find((e) => e.tipo === 'cliente_ganado')!.urgencia).toBe('buena')
  })

  it('avisa del precio por debajo del mercado', () => {
    const b = construirBandeja({
      ...vacio,
      benchmark: benchmark({
        debiles: [{
          categoria: 'TORO', lotes: 45, cabezas: 200, miPrecio: 2433,
          precioMercado: 2940, diffPct: -17.2, significativa: true, leyenda: '',
        }],
      }),
    })
    expect(b.entradas[0].tipo).toBe('precio_bajo')
    expect(b.entradas[0].titulo).toContain('toro')
    expect(b.entradas[0].dato).toBe('-17.2%')
  })

  it('reclama el WhatsApp faltante', () => {
    const b = construirBandeja({ ...vacio, faltaWhatsapp: true })
    expect(b.entradas[0].tipo).toBe('perfil')
    expect(b.entradas[0].href).toContain('tab=editar')
  })

  it('no muestra remates que ya pasaron', () => {
    const b = construirBandeja({
      ...vacio,
      proximosRemates: [{ title: 'Viejo', date: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10) }],
    })
    expect(b.entradas.filter((e) => e.tipo === 'remate')).toHaveLength(0)
  })

  it('suma las cabezas en riesgo para el encabezado', () => {
    const base = { localidad: null, provincia: null, diasSilencio: 40, cadenciaDias: 10, consignaciones: 5, seFueA: null }
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: [
          { ...base, nombre: 'A', cabezas: 400 },
          { ...base, nombre: 'B', cabezas: 100 },
        ],
      }),
    })
    expect(b.cabezasEnRiesgo).toBe(500)
    // Un silencio, por largo que sea, NO es urgente: el productor puede simplemente
    // no tener hacienda lista. Sólo se vuelve urgente cuando el Mercado muestra que
    // está operando en otra casa.
    expect(b.urgentes).toBe(0)
  })

  it('sólo es urgente el silencio con destino probado', () => {
    const base = { localidad: null, provincia: null, diasSilencio: 40, cadenciaDias: 10, consignaciones: 5, cabezas: 100 }
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: [
          { ...base, nombre: 'SIN PRUEBA', seFueA: null },
          { ...base, nombre: 'CON PRUEBA', seFueA: 'LA COMPETENCIA' },
        ],
      }),
    })
    expect(b.urgentes).toBe(1)
    expect(b.entradas.find((e) => e.titulo.includes('CON PRUEBA'))!.urgencia).toBe('urgente')
    expect(b.entradas.find((e) => e.titulo.includes('SIN PRUEBA'))!.urgencia).toBe('atencion')
  })

  it('no afirma que el cliente se fue cuando no hay con qué probarlo', () => {
    // El tono importa: acusar a un cliente de irse cuando sólo está entre ciclos hace
    // que la casa desconfíe de la herramienta apenas lo llame.
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: [{
          nombre: 'LA ESTELITA SA', localidad: null, provincia: null,
          diasSilencio: 54, cadenciaDias: 10, consignaciones: 6, cabezas: 404, seFueA: null,
        }],
      }),
    })
    const e = b.entradas[0]
    expect(e.titulo).toBe('LA ESTELITA SA: 54 días sin consignarte')
    expect(e.titulo).not.toContain('dejó de')
    expect(e.detalle).toContain('no tenga hacienda lista')
  })

  it('no satura con toda la cartera: corta las fugas en 6', () => {
    const base = { localidad: null, provincia: null, diasSilencio: 40, cadenciaDias: 10, consignaciones: 5, seFueA: null }
    const b = construirBandeja({
      ...vacio,
      cartera: cartera({
        enRiesgo: Array.from({ length: 20 }, (_, i) => ({ ...base, nombre: `R${i}`, cabezas: 10 })),
      }),
    })
    expect(b.entradas.filter((e) => e.tipo === 'cliente_fuga')).toHaveLength(6)
    // Pero el total en riesgo sigue siendo el real.
    expect(b.cabezasEnRiesgo).toBe(200)
  })
})
