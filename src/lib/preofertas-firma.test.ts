import { describe, expect, it } from 'vitest'
import { armarPreofertas, ordenarLotes, urlPreofertaFirma } from './preofertas-firma'
import { isoALocalAr, localArAIso } from '@/lib/validators/preoferta-firma'

const fila = (id: string) => ({
  id,
  consignataria_slug: 'reggi',
  titulo: `Remate ${id}`,
  fecha_remate: '2026-11-05',
  lugar: null,
  cierre: '2026-11-04T21:00:00Z',
  condiciones: null,
  estado: 'publicada',
  created_at: '2026-10-17T00:00:00Z',
  updated_at: '2026-10-17T00:00:00Z',
})

const lote = (id: string, preoferta_id: string, orden: number, titulo = `Lote ${id}`) => ({
  id, preoferta_id, orden, titulo,
  categoria: null, cabezas: null, peso_kg: null, video_url: null, descripcion: null, precio_base: null,
})

describe('armarPreofertas', () => {
  it('reparte los lotes en su pre-oferta, ordenados, sin la clave foránea', () => {
    const [a, b] = armarPreofertas(
      [fila('a'), fila('b')],
      [lote('3', 'a', 2), lote('1', 'a', 1), lote('2', 'b', 1)],
    )
    expect(a.lotes.map((l) => l.id)).toEqual(['1', '3'])
    expect(b.lotes.map((l) => l.id)).toEqual(['2'])
    expect(a.lotes[0]).not.toHaveProperty('preoferta_id')
  })

  it('una pre-oferta sin lotes queda con la lista vacía', () => {
    expect(armarPreofertas([fila('a')], [])[0].lotes).toEqual([])
  })

  it('el precio base numeric (que PostgREST puede mandar como texto) sale como número', () => {
    const l = { ...lote('1', 'a', 1), precio_base: '1500000' as unknown as number }
    expect(armarPreofertas([fila('a')], [l])[0].lotes[0].precio_base).toBe(1_500_000)
  })
})

describe('ordenarLotes', () => {
  it('a igual orden desempata por título', () => {
    const r = ordenarLotes([lote('x', 'a', 1, 'Vaquillonas'), lote('y', 'a', 1, 'Terneros')])
    expect(r.map((l) => l.titulo)).toEqual(['Terneros', 'Vaquillonas'])
  })
})

describe('fechas del panel', () => {
  it('datetime-local en hora argentina ida y vuelta', () => {
    const iso = localArAIso('2026-11-04T18:00')
    expect(new Date(iso).toISOString()).toBe('2026-11-04T21:00:00.000Z')
    expect(isoALocalAr('2026-11-04T21:00:00Z')).toBe('2026-11-04T18:00')
  })
})

it('url pública de la ficha', () => {
  expect(urlPreofertaFirma('abc')).toBe('/preofertas/f/abc')
})
