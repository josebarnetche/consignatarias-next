import { describe, it, expect, vi } from 'vitest'

// Sin base en los tests: los contactos vienen vacíos y todo lo demás sale del JSON.
vi.mock('@/lib/supabase', () => ({ createServiceClient: () => null }))

import { unoPorVideo, repeticionesRecientes, claveStream } from './remates-en-vivo'
import remates from '@/lib/data/remates.json'

describe('unoPorVideo: una transmisión, un recuadro', () => {
  it('tres remates del mismo canal que resuelven al mismo video dan UN recuadro', () => {
    // El caso real: UMC tenía tres remates el 18-sep y los tres caían en su canal.
    const items = [
      { id: 'umc-10', videoId: 'AAAAAAAAAAA', _distancia: 240 },
      { id: 'umc-14', videoId: 'AAAAAAAAAAA', _distancia: 20 },
      { id: 'umc-18', videoId: 'AAAAAAAAAAA', _distancia: 220 },
    ]
    const out = unoPorVideo(items)
    expect(out).toHaveLength(1)
    // Queda el que se está rematando: el de horario más cercano a ahora.
    expect(out[0].id).toBe('umc-14')
  })

  it('videos distintos no se tocan, y los que no tienen video se conservan todos', () => {
    const items = [
      { id: 'a', videoId: 'AAAAAAAAAAA', _distancia: 5 },
      { id: 'b', videoId: 'BBBBBBBBBBB', _distancia: 5 },
      { id: 'c', videoId: null, _distancia: 5 },
      { id: 'd', videoId: null, _distancia: 5 },
    ]
    expect(unoPorVideo(items).map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('repeticionesRecientes: lo que llena el muro cuando nadie transmite', () => {
  const lista = (Array.isArray(remates) ? remates : []) as Array<{ date: string; youtubeUrl: string | null }>

  it('sólo trae remates PASADOS con video, del más nuevo al más viejo, sin repetir video', async () => {
    const hoy = '2026-09-21'
    const reps = await repeticionesRecientes(hoy, 8)
    const hayGrabados = lista.some((r) => r.date < hoy && r.youtubeUrl)
    if (!hayGrabados) {
      expect(reps).toEqual([])
      return
    }
    expect(reps.length).toBeGreaterThan(0)
    expect(reps.length).toBeLessThanOrEqual(8)
    for (const r of reps) {
      expect(r.fecha < hoy).toBe(true)
      expect(r.videoId).toMatch(/^[a-zA-Z0-9_-]{11}$/)
      expect(r.watchUrl).toBe(`https://www.youtube.com/watch?v=${r.videoId}`)
    }
    const fechas = reps.map((r) => r.fecha)
    expect([...fechas].sort().reverse()).toEqual(fechas)
    expect(new Set(reps.map((r) => r.videoId)).size).toBe(reps.length)
  })

  it('no inventa: si no hay nada grabado antes de la fecha, devuelve vacío', async () => {
    expect(await repeticionesRecientes('1990-01-01', 8)).toEqual([])
  })
})

describe('claveStream', () => {
  it('es estable y no depende del id del scrape', () => {
    expect(claveStream({ consignatariaSlug: 'ofarrell', date: '2026-09-18', time: '14:00' })).toBe('ofarrell-2026-09-18-1400')
    expect(claveStream({ consignatariaSlug: 'ofarrell', date: '2026-09-18', time: null })).toBe('ofarrell-2026-09-18')
  })
})
