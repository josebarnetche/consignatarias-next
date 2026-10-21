import { describe, expect, it } from 'vitest'
import { decisionesPendientes, estadoActual, type Estado } from './decisiones'
import { oferta } from './mensajes'

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

describe('el estado de hoy se lee del código, no se supone', () => {
  const o = oferta({ leadId: 1, ofertaId: 1, lado: 'vende', datos: { cabezas: 100, categoria: 'novillos', zona: 'Azul', precio_pedido_kg: 3100 }, contraparte: 'X' })
  it('la oferta actual muestra el precio pedido', () => {
    expect(/Precio pretendido/.test(o.texto)).toBe(true)
  })
  it('la oferta actual no lleva el aviso de comunicación comercial', () => {
    expect(/comunicaci[oó]n comercial/.test(o.texto)).toBe(false)
  })
})

describe('estadoActual', () => {
  it('lee la plantilla real: hoy muestra el precio, sin pie, con encuadre comisión', () => {
    const e = estadoActual({
      tiposActivos: false,
      ofertaDePrueba: (d) => oferta({ leadId: 0, ofertaId: 0, lado: 'vende', datos: { cabezas: 100, categoria: 'novillos', ...d }, contraparte: 'X' }).texto,
    })
    expect(e).toEqual({ tiposActivos: false, ofertaMuestraPrecioPedido: true, ofertaConPieComercial: false, encuadreHacienda: 'comision' })
  })
})
