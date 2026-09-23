import { describe, it, expect } from 'vitest'
import {
  getReferencia,
  valuarConBanda,
  normalizarProvincia,
  getSlugsConBanda,
  getBandaPorSlug,
  getOrigenPorSlug,
  getBandasPublicas,
  vrCobertura,
  SLUGS_CONOCIDOS,
  categoriaALote,
  CATEGORIAS_CON_LOTE,
  getTendenciaPorSlug,
  getMovimiento,
  leerSerieVr,
  resumirSerieVr,
  rangoSerieVr,
  vrIsoRestar,
  vrDireccion,
  VR_UMBRAL_MOVIMIENTO_PTS,
  VR_METODOLOGIA,
  type VrPuntoSerie,
  MIN_LOTES_AJUSTE_ORIGEN,
  MIN_LOTES_BANDA_COMPLETA,
} from './vr'

describe('getReferencia — banda', () => {
  it('devuelve banda completa para una categoría con base gruesa', () => {
    const r = getReferencia('vacas')
    expect(r.confianza).toBe('alta')
    expect(r.banda).not.toBeNull()
    expect(r.banda!.p10).toBeLessThan(r.banda!.mediana)
    expect(r.banda!.mediana).toBeLessThan(r.banda!.p90)
    expect(r.banda!.lotes).toBeGreaterThanOrEqual(100)
  })

  it('mapea el plural de market-prices a la categoría del dato de lote', () => {
    expect(getReferencia('novillos').banda).not.toBeNull()
    expect(getReferencia('novillitos').banda).not.toBeNull()
    expect(getReferencia('vaquillonas').banda).not.toBeNull()
    expect(getReferencia('toros').banda).not.toBeNull()
  })

  it('siempre expone metodología y límites, incluso sin base', () => {
    for (const cat of ['vacas', 'terneros', 'inventada']) {
      const r = getReferencia(cat)
      expect(r.metodologia).toBe(VR_METODOLOGIA)
      expect(r.limites.length).toBeGreaterThan(0)
      expect(r.limites[0]).toContain('no es una tasación')
    }
  })
})

describe('getReferencia — regla de degradación (nunca inventar precisión)', () => {
  it('terneros no existe en el dato de lote del MAG: cae a sin_base y lo declara', () => {
    const r = getReferencia('terneros')
    expect(r.confianza).toBe('sin_base')
    expect(r.banda).toBeNull()
    expect(r.limites.join(' ')).toMatch(/no tiene equivalente|base suficiente/)
  })

  it('una categoría inexistente no tira error: devuelve sin_base', () => {
    expect(() => getReferencia('unicornios')).not.toThrow()
    expect(getReferencia('unicornios').confianza).toBe('sin_base')
  })

  it('no aplica ajuste de origen cuando la provincia no llega al mínimo', () => {
    const r = getReferencia('vacas', 'Formosa')
    expect(r.origen).toBeNull()
    expect(r.limites.join(' ')).toContain('no llega')
  })

  it('aplica ajuste de origen cuando hay base, y lo declara con el n', () => {
    const r = getReferencia('vacas', 'La Pampa')
    expect(r.origen).not.toBeNull()
    expect(r.origen!.provincia).toBe('LPA')
    expect(r.origen!.lotes).toBeGreaterThanOrEqual(MIN_LOTES_AJUSTE_ORIGEN)
    expect(r.limites.join(' ')).toContain('Ajuste por origen')
  })

  it('el ajuste de origen mueve la banda en la dirección del factor', () => {
    const nac = getReferencia('vacas')
    const lpa = getReferencia('vacas', 'La Pampa') // factor > 1
    const slu = getReferencia('vacas', 'San Luis') // factor < 1
    expect(lpa.banda!.mediana).toBeGreaterThan(nac.banda!.mediana)
    expect(slu.banda!.mediana).toBeLessThan(nac.banda!.mediana)
  })
})

describe('normalizarProvincia', () => {
  it('resuelve nombre completo, con y sin acento, y código', () => {
    expect(normalizarProvincia('Buenos Aires')).toBe('BUE')
    expect(normalizarProvincia('córdoba')).toBe('CBA')
    expect(normalizarProvincia('cordoba')).toBe('CBA')
    expect(normalizarProvincia('Entre Ríos')).toBe('ERI')
    expect(normalizarProvincia('bue')).toBe('BUE')
  })
})

describe('valuarConBanda', () => {
  it('con banda devuelve tres puntas ordenadas', () => {
    const r = getReferencia('vacas')
    const v = valuarConBanda(r, 470, 350, 2900)
    expect(v.usó_banda).toBe(true)
    expect(v.conservador).toBeLessThan(v.central)
    expect(v.central).toBeLessThan(v.optimista)
    expect(v.central).toBe(Math.round(r.banda!.mediana * 470 * 350))
  })

  it('la amplitud sobre una tropa real es material — el punto entero del producto', () => {
    const r = getReferencia('vacas')
    const v = valuarConBanda(r, 470, 350, 2900)
    // P10→P90 sobre 350 vacas: cientos de millones de pesos de diferencia.
    expect(v.optimista - v.conservador).toBeGreaterThan(100_000_000)
  })

  it('sin banda colapsa las tres puntas en el fallback MAG', () => {
    const r = getReferencia('terneros')
    const v = valuarConBanda(r, 220, 100, 5000)
    expect(v.usó_banda).toBe(false)
    expect(v.conservador).toBe(v.central)
    expect(v.optimista).toBe(v.central)
    expect(v.central).toBe(5000 * 220 * 100)
  })
})

describe('superficie pública (páginas /vr y /mercado)', () => {
  it('solo publica slugs que pasan el mínimo de la regla de degradación', () => {
    const slugs = getSlugsConBanda()
    expect(slugs.length).toBeGreaterThan(0)
    for (const s of slugs) {
      const b = getBandaPorSlug(s)
      expect(b).not.toBeNull()
      expect(b!.lotes).toBeGreaterThanOrEqual(MIN_LOTES_BANDA_COMPLETA)
    }
  })

  it('ternero no tiene página: no hay banda que publicar', () => {
    expect(getSlugsConBanda()).not.toContain('ternero')
    expect(getBandaPorSlug('ternero')).toBeNull()
  })

  it('un slug inventado no explota ni fabrica una página', () => {
    expect(getBandaPorSlug('unicornio')).toBeNull()
    expect(getOrigenPorSlug('unicornio')).toEqual([])
  })

  it('getBandasPublicas ordena por cabezas y coincide con los slugs', () => {
    const pub = getBandasPublicas()
    const cabezas = pub.map((b) => b.cabezas)
    expect([...cabezas].sort((a, b) => b - a)).toEqual(cabezas)
    expect(pub.length).toBe(getSlugsConBanda().length)
  })

  it('los ajustes de origen publicados superan el mínimo', () => {
    for (const s of getSlugsConBanda()) {
      for (const o of getOrigenPorSlug(s)) {
        expect(o.lotes).toBeGreaterThanOrEqual(MIN_LOTES_AJUSTE_ORIGEN)
        // Un factor fuera de ±50% sería un bug de cálculo, no un dato de mercado.
        expect(o.factor).toBeGreaterThan(0.5)
        expect(o.factor).toBeLessThan(1.5)
      }
    }
  })

  it('la cobertura declara fechas coherentes y totales positivos', () => {
    const c = vrCobertura()
    expect(c.desde <= c.hasta).toBe(true)
    expect(c.lotes).toBeGreaterThan(0)
    expect(c.cabezas).toBeGreaterThan(0)
  })
})

describe('regresiones de la auditoría', () => {
  it('SLUGS_CONOCIDOS es superset de los que hoy tienen banda', () => {
    // Si se invirtiera, una URL indexada pasaría a 404 al caer la base.
    for (const s of getSlugsConBanda()) expect(SLUGS_CONOCIDOS).toContain(s)
    expect(SLUGS_CONOCIDOS.length).toBeGreaterThanOrEqual(getSlugsConBanda().length)
  })

  it('una banda colapsada no puede declarar amplitud', () => {
    for (const cat of ['vacas', 'novillos', 'terneros', 'toros', 'vaquillonas']) {
      const r = getReferencia(cat)
      if (r.banda && r.banda.p10 === r.banda.p90) {
        expect(r.banda.amplitud_pct).toBe(0)
      }
    }
  })
})

describe('valuarTropa — coherencia interna de la respuesta', () => {
  it('precio_kg_ars × kg × cabezas === total_ars, con y sin banda', async () => {
    const { valuarTropa } = await import('./valuaciones')
    for (const [cat, cabezas] of [['vacas', 350], ['novillos', 120], ['terneros', 100]] as const) {
      const d = valuarTropa({ categoria: cat, cabezas }).data as Record<string, number>
      expect(d.total_ars).toBe(Math.round(d.precio_kg_ars * d.kg_promedio * cabezas))
    }
  })

  it('conserva el precio MAG y declara la brecha cuando difiere', async () => {
    const { valuarTropa } = await import('./valuaciones')
    const d = valuarTropa({ categoria: 'vaquillonas', cabezas: 10 }).data as Record<string, number>
    // vaquillona es el caso donde mediana de lote y precio MAG más se separan.
    expect(d.precio_kg_mag).toBeGreaterThan(0)
    expect(Math.abs(d.brecha_vs_mag_pct)).toBeGreaterThan(5)
    expect(d.precio_kg_ars).not.toBe(d.precio_kg_mag)
  })

  it('sin banda no hay brecha que declarar', async () => {
    const { valuarTropa } = await import('./valuaciones')
    const d = valuarTropa({ categoria: 'terneros', cabezas: 10 }).data as Record<string, number>
    expect(d.brecha_vs_mag_pct).toBe(0)
    expect(d.precio_kg_ars).toBe(d.precio_kg_mag)
  })
})

describe('categoriaALote — el filtro de la serie histórica depende de esto', () => {
  it('traduce plural y singular al código del dato de lote', () => {
    expect(categoriaALote('novillos')).toBe('NOVILLO')
    expect(categoriaALote('novillo')).toBe('NOVILLO')
    expect(categoriaALote('vacas')).toBe('VACA')
    expect(categoriaALote('vaca')).toBe('VACA')
    expect(categoriaALote('vaquillona')).toBe('VAQUILLONA')
    expect(categoriaALote('toro')).toBe('TORO')
  })

  it('tolera mayúsculas y espacios', () => {
    expect(categoriaALote('  Novillos ')).toBe('NOVILLO')
    expect(categoriaALote('VACA')).toBe('VACA')
  })

  it('devuelve null en vez de un código inventado', () => {
    expect(categoriaALote('unicornio')).toBeNull()
    expect(categoriaALote('')).toBeNull()
  })

  it('toda categoría anunciada como disponible se traduce', () => {
    // Si esto falla, el mensaje de error del endpoint ofrecería categorías
    // que después el filtro rechaza.
    for (const c of CATEGORIAS_CON_LOTE) expect(categoriaALote(c)).not.toBeNull()
  })

  it('todo slug público tiene traducción desde su categoría de producto', () => {
    // El slug /vr/vaca y la categoría "vacas" tienen que apuntar al mismo código.
    for (const slug of getSlugsConBanda()) {
      const b = getBandaPorSlug(slug)!
      expect(categoriaALote(slug)).toBe(b.codigo)
    }
  })
})

describe('tendencia de dispersión', () => {
  it('toda categoría con banda tiene tendencia, y en orden cronológico', () => {
    for (const slug of getSlugsConBanda()) {
      const pts = getTendenciaPorSlug(slug)
      expect(pts.length).toBeGreaterThanOrEqual(2)
      const fechas = pts.map((p) => p.date)
      expect([...fechas].sort()).toEqual(fechas)
    }
  })

  it('los puntos traen amplitud y mediana usables', () => {
    for (const p of getTendenciaPorSlug('vaca')) {
      expect(p.amplitud).toBeGreaterThan(0)
      expect(p.mediana).toBeGreaterThan(0)
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('un slug sin tendencia devuelve lista vacía, no explota', () => {
    expect(getTendenciaPorSlug('ternero')).toEqual([])
    expect(getTendenciaPorSlug('unicornio')).toEqual([])
    expect(getMovimiento('unicornio')).toBeNull()
  })

  it('el movimiento coincide con las puntas de la serie', () => {
    const pts = getTendenciaPorSlug('vaca')
    const m = getMovimiento('vaca')!
    expect(m.amplitudInicial).toBe(pts[0].amplitud)
    expect(m.amplitudFinal).toBe(pts[pts.length - 1].amplitud)
    expect(m.desde).toBe(pts[0].date)
    expect(m.hasta).toBe(pts[pts.length - 1].date)
    expect(m.deltaPuntos).toBeCloseTo(pts[pts.length - 1].amplitud - pts[0].amplitud, 1)
  })

  it('un movimiento menor a un punto NO se anuncia como tendencia', () => {
    // El umbral existe para no vender ruido de redondeo como señal.
    for (const slug of getSlugsConBanda()) {
      const m = getMovimiento(slug)
      if (!m) continue
      if (Math.abs(m.deltaPuntos) <= 1) expect(m.direccion).toBe('estable')
      if (m.direccion === 'abriendo') expect(m.deltaPuntos).toBeGreaterThan(1)
      if (m.direccion === 'cerrando') expect(m.deltaPuntos).toBeLessThan(-1)
    }
  })
})

/* ── Serie histórica ──────────────────────────────────────────────────────── */

const punto = (date: string, category: string, amplitud: number, mediana = 3000): VrPuntoSerie => ({
  date, category, p10: 2500, mediana, p90: 3600,
  amplitud_pct: amplitud, lotes: 100, cabezas: 500,
  ventana_dias: 30, metodologia: 'VR v1.0',
})

describe('vrIsoRestar', () => {
  it('resta días sin correrse por zona horaria', () => {
    expect(vrIsoRestar('2026-09-18', 30)).toBe('2026-08-19')
    expect(vrIsoRestar('2026-01-01', 1)).toBe('2025-12-31')
    expect(vrIsoRestar('2026-03-01', 1)).toBe('2026-02-28')
  })
})

describe('vrDireccion — un solo umbral para página y MCP', () => {
  it('respeta el umbral en ambos sentidos', () => {
    expect(vrDireccion(VR_UMBRAL_MOVIMIENTO_PTS + 0.1)).toBe('abriendo')
    expect(vrDireccion(-VR_UMBRAL_MOVIMIENTO_PTS - 0.1)).toBe('cerrando')
    expect(vrDireccion(VR_UMBRAL_MOVIMIENTO_PTS)).toBe('estable')
    expect(vrDireccion(-VR_UMBRAL_MOVIMIENTO_PTS)).toBe('estable')
    expect(vrDireccion(0)).toBe('estable')
  })

  it('getMovimiento usa el mismo umbral que la serie', () => {
    for (const slug of getSlugsConBanda()) {
      const m = getMovimiento(slug)
      if (m) expect(m.direccion).toBe(vrDireccion(m.deltaPuntos))
    }
  })
})

describe('rangoSerieVr', () => {
  it('cubre TODAS las filas, no solo la primera categoría', () => {
    // El bug real: resumirSerieVr ordena por magnitud del movimiento, así que
    // tomar resumen[0] declaraba un rango más angosto que el dato devuelto.
    const rows = [
      punto('2026-09-01', 'VACA', 44), punto('2026-09-18', 'VACA', 50),
      punto('2026-08-01', 'NOVILLO', 27), punto('2026-09-20', 'NOVILLO', 28),
    ]
    expect(rangoSerieVr(rows)).toEqual({ desde: '2026-08-01', hasta: '2026-09-20' })
  })

  it('sin filas devuelve null en vez de romper', () => {
    expect(rangoSerieVr([])).toBeNull()
  })
})

describe('resumirSerieVr', () => {
  it('resume por categoría y ordena por magnitud del movimiento', () => {
    const rows = [
      punto('2026-09-01', 'VACA', 44), punto('2026-09-18', 'VACA', 60),
      punto('2026-09-01', 'NOVILLO', 27), punto('2026-09-18', 'NOVILLO', 27.5),
    ]
    const r = resumirSerieVr(rows)
    expect(r.map((x) => x.category)).toEqual(['VACA', 'NOVILLO'])
    expect(r[0].deltaPuntos).toBe(16)
    expect(r[0].direccion).toBe('abriendo')
    expect(r[1].direccion).toBe('estable')
    expect(r[0].puntos).toBe(2)
  })
})

describe('leerSerieVr', () => {
  /** Cliente falso: registra los filtros aplicados y pagina lo que le pasen. */
  function fakeSb(paginas: VrPuntoSerie[][], espia: Record<string, unknown> = {}) {
    let i = 0
    const q: Record<string, unknown> = {}
    const chain = {
      select: () => chain,
      gte: (_c: string, v: string) => { espia.desde = v; return chain },
      eq: (c: string, v: string) => { espia[c] = v; return chain },
      order: (c: string) => {
        if (!espia.orden) espia.orden = []
        ;(espia.orden as string[]).push(c)
        return chain
      },
      range: async () => ({ data: paginas[i++] ?? [], error: null }),
    }
    void q
    return { from: (t: string) => { espia.tabla = t; return chain } } as never
  }

  it('filtra metodología y ordena de forma total', async () => {
    const espia: Record<string, unknown> = {}
    await leerSerieVr(fakeSb([[punto('2026-09-18', 'VACA', 44)]], espia), { desde: '2026-08-19' })
    expect(espia.tabla).toBe('vr_bandas_history')
    expect(espia.desde).toBe('2026-08-19')
    // Sin el filtro de metodología, VR v1.1 duplicaría puntos por fecha.
    expect(espia.metodologia).toBe(VR_METODOLOGIA)
    // Sin el desempate por categoría el paginado deja de ser estable.
    expect(espia.orden).toEqual(['date', 'category'])
  })

  it('aplica el filtro de categoría solo cuando se pide', async () => {
    const conFiltro: Record<string, unknown> = {}
    await leerSerieVr(fakeSb([[]], conFiltro), { desde: '2026-01-01', categoriaCodigo: 'VACA' })
    expect(conFiltro.category).toBe('VACA')

    const sinFiltro: Record<string, unknown> = {}
    await leerSerieVr(fakeSb([[]], sinFiltro), { desde: '2026-01-01', categoriaCodigo: null })
    expect(sinFiltro.category).toBeUndefined()
  })

  it('concatena páginas hasta que una viene incompleta', async () => {
    const llena = Array.from({ length: 1000 }, (_, k) => punto('2026-09-18', `C${k}`, 40))
    const { rows, error } = await leerSerieVr(fakeSb([llena, [punto('2026-09-19', 'VACA', 44)]]), { desde: '2026-01-01' })
    expect(error).toBeNull()
    expect(rows.length).toBe(1001)
  })
})
