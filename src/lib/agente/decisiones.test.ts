import { describe, expect, it } from 'vitest'
import { decisionesPendientes, estadoActual, type Estado } from './decisiones'
import { ofertaHacienda } from './mensajes-contacto'

const hoy: Estado = { tiposActivos: false, ofertaMuestraPrecioPedido: true, ofertaConPieComercial: false, encuadreHacienda: 'comision' }

describe('decisionesPendientes', () => {
  it('con el estado de hoy lista lo legal primero', () => {
    const d = decisionesPendientes(hoy)
    const ids = d.map((x) => x.id)
    expect(ids).toEqual(expect.arrayContaining(['siocal', 'bloqueo-arrendamiento', 'comision-campo', 'arrendamiento-quien-paga', 'precio-pedido', 'pie-comercial', 'agente-tipos']))
    expect(d[0].gravedad).toBe('legal')
    expect(d.at(-1)!.gravedad).toBe('producto')
  })
  it('cada decisión tomada desaparece de la lista', () => {
    const d = decisionesPendientes({ tiposActivos: true, ofertaMuestraPrecioPedido: false, ofertaConPieComercial: true, encuadreHacienda: 'servicio_contacto' })
    const ids = d.map((x) => x.id)
    expect(ids).not.toContain('siocal')
    expect(ids).not.toContain('precio-pedido')
    expect(ids).not.toContain('pie-comercial')
    expect(ids).not.toContain('agente-tipos')
  })
})

describe('el estado se lee de la oferta que usa el motor', () => {
  const ofertaDePrueba = (d: { precio_pedido_kg: number }) =>
    ofertaHacienda({ leadId: 0, ofertaId: 0, lado: 'vende', datos: { cabezas: 100, categoria: 'novillos', ...d }, contraparte: 'X' }).texto
  it('desde v1.244.0: sin precio pedido, con pie comercial, encuadre servicio de contacto', () => {
    expect(estadoActual({ tiposActivos: false, ofertaDePrueba })).toEqual({
      tiposActivos: false,
      ofertaMuestraPrecioPedido: false,
      ofertaConPieComercial: true,
      encuadreHacienda: 'servicio_contacto',
      pendientesVerificacion: 0,
    })
  })
  it('esas tres decisiones salen solas de la lista', () => {
    const ids = decisionesPendientes(estadoActual({ tiposActivos: false, ofertaDePrueba })).map((d) => d.id)
    expect(ids).not.toContain('siocal')
    expect(ids).not.toContain('precio-pedido')
    expect(ids).not.toContain('pie-comercial')
    expect(ids).toContain('siocal-abogado') // el riesgo legal no se da por cerrado sin abogado
  })
  it('los pedidos sin verificar aparecen con su conteo, y sin pendientes no hay línea', () => {
    const con = decisionesPendientes(estadoActual({ tiposActivos: true, ofertaDePrueba, pendientesVerificacion: 3 }))
    expect(con.find((d) => d.id === 'verificar-contactos')?.titulo).toMatch(/^3 pedidos esperan/)
    const sin = decisionesPendientes(estadoActual({ tiposActivos: true, ofertaDePrueba, pendientesVerificacion: 0 }))
    expect(sin.map((d) => d.id)).not.toContain('verificar-contactos')
  })
})
