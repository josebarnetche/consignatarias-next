import { describe, it, expect } from 'vitest'
import { clasificarCambio, recomendar, rematesPorMes, aResumenPDF, nombreMes, type Performance } from './performance'

/**
 * El corazón de estos tests es la honestidad del reporte: es el documento que la
 * firma reenvía a su socio para justificar el pago. Si dice "+100%" cuando pasó de
 * 3 a 6 contactos, la primera vez que el socio mire de cerca perdemos la cuenta.
 */
describe('clasificarCambio', () => {
  it('no afirma nada con conteos chicos', () => {
    const c = clasificarCambio(4, 2, 'contactos')
    expect(c.confianza).toBe('sin_base')
    expect(c.leyenda).toContain('Muy pocos datos')
  })

  it('NO llama mejora a un salto que entra en la variación normal', () => {
    // 20 → 28: la banda de ruido es 2·√21 ≈ 9,2, así que +8 no alcanza.
    const c = clasificarCambio(28, 20, 'visitas')
    expect(c.direccion).toBe('sube')
    expect(c.confianza).toBe('ruido')
    expect(c.leyenda).toContain('Se mantiene')
  })

  it('sí llama señal a un salto que supera la banda', () => {
    const c = clasificarCambio(60, 20, 'visitas')
    expect(c.confianza).toBe('señal')
    expect(c.leyenda).toContain('Subió de verdad')
  })

  it('detecta una caída real', () => {
    const c = clasificarCambio(10, 60, 'contactos')
    expect(c.direccion).toBe('baja')
    expect(c.confianza).toBe('señal')
    expect(c.leyenda).toContain('Bajó de verdad')
  })

  it('no calcula porcentaje sobre cero', () => {
    // "+∞%" o "+500%" desde 0 es ruido disfrazado de logro.
    expect(clasificarCambio(9, 0, 'leads').deltaPct).toBeNull()
  })

  it('un mes sin cambios se reporta como igual', () => {
    const c = clasificarCambio(30, 30, 'visitas')
    expect(c.direccion).toBe('igual')
    expect(c.delta).toBe(0)
  })
})

describe('recomendar', () => {
  const base = (over: Partial<Performance['actual']> = {}): Omit<Performance, 'recomendaciones'> => ({
    slug: 'x',
    actual: { mes: '2026-08', vistas: 0, contactos: 0, porCanal: {}, interes: 0, leads: 0, remates: 1, ...over },
    anterior: { mes: '2026-07', vistas: 0, contactos: 0, porCanal: {}, interes: 0, leads: 0, remates: 1 },
    cambios: {
      vistas: clasificarCambio(0, 0, 'visitas'),
      contactos: clasificarCambio(0, 0, 'contactos'),
      leads: clasificarCambio(0, 0, 'leads'),
    },
    ranking: null,
  })

  it('marca el caso de muchas visitas y cero contactos', () => {
    const r = recomendar(base({ vistas: 120 }))
    expect(r.join(' ')).toContain('nadie te contactó')
  })

  it('avisa cuando no hay ningún remate publicado', () => {
    expect(recomendar(base({ remates: 0 })).join(' ')).toContain('ningún remate publicado')
  })

  it('nombra el canal dominante cuando hay volumen', () => {
    const r = recomendar(base({ contactos: 5, porCanal: { contact_whatsapp: 4, contact_web: 1 } }))
    expect(r.join(' ')).toContain('WhatsApp')
  })

  it('no inventa consejos cuando no hay nada que decir', () => {
    // Un mes normal, con remate y contactos: no hay que llenar espacio.
    const r = recomendar(base({ vistas: 20, contactos: 2, leads: 1, porCanal: { contact_web: 2 } }))
    expect(r).toEqual([])
  })
})

describe('aResumenPDF', () => {
  const perf: Performance = {
    slug: 'reggi',
    actual: { mes: '2026-08', vistas: 30, contactos: 4, porCanal: { contact_whatsapp: 3, contact_web: 1 }, interes: 0, leads: 0, remates: 0 },
    anterior: { mes: '2026-07', vistas: 46, contactos: 2, porCanal: {}, interes: 0, leads: 0, remates: 1 },
    cambios: {
      vistas: clasificarCambio(30, 46, 'visitas'),
      contactos: clasificarCambio(4, 2, 'contactos'),
      leads: clasificarCambio(0, 0, 'leads'),
    },
    ranking: { posicion: 2, total: 7, provincia: 'CORRIENTES' },
    recomendaciones: ['Probá con → esto'],
  }

  it('no deja pasar caracteres que jsPDF no sabe dibujar', () => {
    // La flecha salía impresa como "!" en el PDF que la firma le manda al socio.
    const r = aResumenPDF(perf)
    const todo = [...r.filas.map((f) => f.leyenda), ...r.recomendaciones, r.ranking ?? ''].join(' ')
    expect(todo).not.toContain('→')
    expect(r.filas[0].leyenda).toContain('46 a 30 visitas')
  })

  it('traduce los canales a nombres legibles y los ordena', () => {
    const r = aResumenPDF(perf)
    expect(r.porCanal[0]).toEqual({ canal: 'WhatsApp', n: 3 })
  })

  it('marca como señal sólo lo que lo es', () => {
    const r = aResumenPDF(perf)
    expect(r.filas[0].esSeñal).toBe(true)   // 46 → 30 supera la banda
    expect(r.filas[1].esSeñal).toBe(false)  // 2 → 4 no
  })
})

describe('nombreMes', () => {
  it('convierte la clave a mes en castellano', () => {
    expect(nombreMes('2026-08')).toBe('agosto 2026')
    expect(nombreMes('2026-01')).toBe('enero 2026')
  })
})

describe('rematesPorMes', () => {
  it('cuenta sólo los de la firma, agrupados por mes', () => {
    const out = rematesPorMes(
      [
        { consignatariaSlug: 'oregui', date: '2026-08-03' },
        { consignatariaSlug: 'oregui', date: '2026-08-20' },
        { consignatariaSlug: 'oregui', date: '2026-07-15' },
        { consignatariaSlug: 'lalor', date: '2026-08-10' },
        { consignatariaSlug: 'oregui' },
      ],
      'oregui',
    )
    expect(out).toEqual({ '2026-08': 2, '2026-07': 1 })
  })
})
