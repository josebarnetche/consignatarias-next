import { describe, it, expect } from 'vitest'
import { bandaSemanal, type PuntoBanda } from './banda-consignatarias'
import {
  MIN_LOTES_PUBLICAR,
  puntosPublicables,
  puntosDesdeArchivo,
  serieAmplitud,
  pasoRedondo,
  escalaRangos,
  posicionPct,
  fechaCorta,
  descripcionRangos,
  descripcionSerie,
  geometriaSerie,
  type ArchivoBanda,
} from './banda-pagina'
import { MIN_LOTES_BANDA_COMPLETA } from '@/lib/vr'

/**
 * Lo que se fija acá: que la página publique con la misma regla que /vr, que el
 * respaldo desde el JSON no afirme récords que no puede sostener, y que el gráfico
 * tenga su versión en palabras.
 */

const p = (date: string, category: string, amplitud: number, extra: Partial<PuntoBanda> = {}): PuntoBanda => ({
  date, category, p10: 100, mediana: 120, p90: 140, amplitud_pct: amplitud, lotes: 400, ...extra,
})

describe('qué se publica', () => {
  it('usa el mínimo de lotes que ya usa /vr, no uno nuevo', () => {
    expect(MIN_LOTES_PUBLICAR).toBe(MIN_LOTES_BANDA_COMPLETA)
  })

  it('descarta las categorías con pocos lotes y deja pasar los puntos sin conteo', () => {
    const pts = [
      p('2026-10-30', 'NOVILLO', 27, { lotes: 365 }),
      p('2026-10-30', 'TORO', 30, { lotes: MIN_LOTES_PUBLICAR - 1 }),
      p('2026-10-30', 'VACA', 38, { lotes: 9 }),
      p('2026-10-23', 'NOVILLO', 25, { lotes: null }),
    ]
    const out = puntosPublicables(pts)
    expect(out.map((x) => x.category).sort()).toEqual(['NOVILLO', 'NOVILLO'])
    const b = bandaSemanal(out)
    expect(b.categorias.map((c) => c.categoria)).toEqual(['NOVILLO'])
  })
})

describe('respaldo desde vr-bandas.json', () => {
  const archivo: ArchivoBanda = {
    fecha_dato_hasta: '2026-10-30',
    categorias: {
      NOVILLO: { p10: 3570, mediana: 4200, p90: 4550, amplitud_pct: 27.5, lotes: 365 },
      VACA: { p10: 2600, mediana: 3000, p90: 3600, amplitud_pct: 38.5, lotes: 1935 },
    },
    tendencia: {
      NOVILLO: Array.from({ length: 12 }, (_, i) => ({
        date: `2026-10-${String(6 + i * 2).padStart(2, '0')}`,
        amplitud: i === 11 ? 27.5 : 20 + i * 0.1,
        mediana: 4300,
      })),
    },
  }

  it('compara contra la semana previa, igual que con la serie', () => {
    const b = bandaSemanal(puntosDesdeArchivo(archivo))
    expect(b.fecha).toBe('2026-10-30')
    expect(b.titular?.categoria).toBe('NOVILLO')
    // El punto de hace 7 días o más es el del 22-10 (i = 8 → 20,8%).
    expect(b.titular?.deltaSemanaPp).toBe(6.7)
    expect(b.lectura).toBe('se_abre')
  })

  it('no ubica el dato contra su historia ni afirma récords con 12 puntos', () => {
    const b = bandaSemanal(puntosDesdeArchivo(archivo))
    expect(b.posicion).toBeNull()
    expect(b.cita).not.toContain('de la serie')
    expect(b.cita).toContain('Banda Consignatarias')
  })

  it('la categoría sin tendencia sale igual, sin cambio semanal', () => {
    const b = bandaSemanal(puntosDesdeArchivo(archivo))
    const vaca = b.categorias.find((c) => c.categoria === 'VACA')
    expect(vaca?.lotes).toBe(1935)
    expect(vaca?.deltaSemanaPp).toBeNull()
  })
})

describe('serie de amplitud', () => {
  it('ordena por categoría según la banda de hoy y por fecha adentro', () => {
    const s = serieAmplitud(
      [p('2026-10-02', 'VACA', 40), p('2026-10-01', 'VACA', 41), p('2026-10-01', 'NOVILLO', 25), p('2026-10-02', 'NOVILLO', 26)],
      ['VACA', 'NOVILLO'],
    )
    expect(s.map((x) => x.categoria)).toEqual(['VACA', 'NOVILLO'])
    expect(s[0].puntos.map((x) => x.date)).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('una categoría con un solo punto no es una serie', () => {
    expect(serieAmplitud([p('2026-10-01', 'TORO', 30)])).toEqual([])
  })

  it('una categoría que no llega al mínimo de lotes no se dibuja', () => {
    const s = serieAmplitud([p('2026-10-01', 'TORO', 30, { lotes: 5 }), p('2026-10-02', 'TORO', 31, { lotes: 5 })])
    expect(s).toEqual([])
  })
})

describe('escala de las barras', () => {
  it('paso redondo', () => {
    expect(pasoRedondo(480)).toBe(500)
    expect(pasoRedondo(240)).toBe(250)
    expect(pasoRedondo(130)).toBe(200)
    expect(pasoRedondo(0)).toBe(1)
  })

  it('cubre del P10 más bajo al P90 más alto, en múltiplos del paso', () => {
    const e = escalaRangos([
      { p10: 2600, p90: 3600 },
      { p10: 3570, p90: 4950 },
    ])
    expect(e.min).toBeLessThanOrEqual(2600)
    expect(e.max).toBeGreaterThanOrEqual(4950)
    expect(e.ticks[0]).toBe(e.min)
    expect(e.ticks[e.ticks.length - 1]).toBe(e.max)
    expect(posicionPct(e.min, e)).toBe(0)
    expect(posicionPct(e.max, e)).toBe(100)
  })

  it('no se rompe con una sola categoría ni sin categorías', () => {
    const e = escalaRangos([{ p10: 4000, p90: 4000 }])
    expect(e.max).toBeGreaterThan(e.min)
    expect(escalaRangos([]).ticks.length).toBeGreaterThan(0)
  })

  it('la posición se acota a 0–100', () => {
    const e = { min: 0, max: 100, ticks: [0, 100] }
    expect(posicionPct(-5, e)).toBe(0)
    expect(posicionPct(150, e)).toBe(100)
  })
})

describe('texto accesible', () => {
  it('fecha argentina sin zona horaria', () => {
    expect(fechaCorta('2026-10-30')).toBe('30/10/2026')
  })

  it('el gráfico de rangos dice los tres precios y la amplitud de cada categoría', () => {
    const b = bandaSemanal([p('2026-10-30', 'NOVILLO', 27.5, { p10: 3570, mediana: 4200, p90: 4550 })])
    const t = descripcionRangos(b.fecha, b.categorias)
    expect(t).toContain('30/10/2026')
    expect(t).toContain('Novillo')
    expect(t).toContain('P10 $3.570')
    expect(t).toContain('mediana $4.200')
    expect(t).toContain('P90 $4.550')
    expect(t).toContain('27,5%')
  })

  it('la serie dice el primer y el último punto', () => {
    const t = descripcionSerie({ categoria: 'VACA', puntos: [{ date: '2026-10-01', amplitud: 41.6 }, { date: '2026-10-30', amplitud: 38.5 }] })
    expect(t).toContain('41,6% el 01/10/2026')
    expect(t).toContain('38,5% el 30/10/2026')
  })
})

describe('geometría de la serie', () => {
  it('arranca a la izquierda y termina en el último punto, dentro del lienzo', () => {
    const g = geometriaSerie({ categoria: 'VACA', puntos: [{ date: 'a', amplitud: 40 }, { date: 'b', amplitud: 35 }, { date: 'c', amplitud: 38 }] }, 300, 60)
    expect(g.d.startsWith('M4 ')).toBe(true)
    expect(g.ultimo.x).toBe(296)
    expect(g.ultimo.y).toBeGreaterThanOrEqual(4)
    expect(g.ultimo.y).toBeLessThanOrEqual(56)
    expect(g.min).toBeLessThan(35)
    expect(g.max).toBeGreaterThan(40)
  })
})
