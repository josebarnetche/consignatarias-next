import { describe, it, expect } from 'vitest'
import {
  PRODUCTOS_DATOS,
  getProducto,
  getProductosPublicados,
  evaluar,
  rangoPrecio,
} from './productos-datos'

const P = PRODUCTOS_DATOS[0]

describe('catálogo', () => {
  it('cada producto tiene meta, fecha de corte y qué hacer si no llega', () => {
    for (const p of PRODUCTOS_DATOS) {
      expect(p.metaArs).toBeGreaterThan(0)
      expect(p.fechaCorte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(p.siNoLlega.length).toBeGreaterThan(40)
    }
  })

  it('el precio cobrado siempre cae dentro del rango comunicado', () => {
    for (const p of PRODUCTOS_DATOS) {
      expect(p.precio).toBeGreaterThanOrEqual(p.precioMin)
      expect(p.precio).toBeLessThanOrEqual(p.precioMax)
      expect(p.precioMin).toBeLessThan(p.precioMax)
    }
  })

  it('ningún producto comparte audiencia con otro', () => {
    const audiencias = PRODUCTOS_DATOS.map((p) => p.audiencia)
    expect(new Set(audiencias).size).toBe(audiencias.length)
  })

  it('los slugs y las landings son únicos', () => {
    expect(new Set(PRODUCTOS_DATOS.map((p) => p.slug)).size).toBe(PRODUCTOS_DATOS.length)
    expect(new Set(PRODUCTOS_DATOS.map((p) => p.landing)).size).toBe(PRODUCTOS_DATOS.length)
  })

  it('cada producto declara términos de búsqueda para indexar', () => {
    for (const p of PRODUCTOS_DATOS) {
      expect(p.keywords.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('resuelve por slug y devuelve null cuando no existe', () => {
    expect(getProducto(P.slug)?.nombre).toBe(P.nombre)
    expect(getProducto('no-existe')).toBeNull()
  })

  it('sólo lo publicado sale al sitio', () => {
    for (const p of getProductosPublicados()) expect(p.publicado).toBe(true)
  })
})

describe('kill switch', () => {
  const antes = new Date('2026-09-01T12:00:00-03:00')
  const despues = new Date('2026-12-01T12:00:00-03:00')

  it('en plazo y sin meta, dice cuánto falta y para cuándo', () => {
    const e = evaluar(P, 0, antes)
    expect(e.estado).toBe('en-plazo')
    expect(e.diasRestantes).toBeGreaterThan(0)
    expect(e.veredicto).toContain('Faltan')
  })

  it('vencido sin meta, dicta la acción escrita de antemano', () => {
    const e = evaluar(P, 50_000, despues)
    expect(e.estado).toBe('vencido-sin-meta')
    expect(e.diasRestantes).toBeLessThan(0)
    // El veredicto no describe el fracaso: dice qué se hace.
    expect(e.veredicto).toContain(P.siNoLlega)
  })

  it('la meta cumplida gana sobre la fecha vencida', () => {
    const e = evaluar(P, P.metaArs, despues)
    expect(e.estado).toBe('meta-cumplida')
    expect(e.veredicto).toBe('Meta cumplida. Sigue.')
  })

  it('llegar antes de la fecha ya cuenta como cumplida', () => {
    expect(evaluar(P, P.metaArs + 1, antes).estado).toBe('meta-cumplida')
  })

  it('el avance es la fracción de la meta', () => {
    expect(evaluar(P, P.metaArs / 2, antes).avance).toBeCloseTo(0.5, 5)
    expect(evaluar(P, 0, antes).avance).toBe(0)
  })

  it('no rompe con venta cero ni con venta mayor a la meta', () => {
    expect(() => evaluar(P, 0, antes)).not.toThrow()
    expect(evaluar(P, P.metaArs * 3, antes).avance).toBe(3)
  })
})

describe('precio', () => {
  it('se comunica como rango, nunca como número seco', () => {
    const r = rangoPrecio(P)
    expect(r).toContain('entre')
    expect(r).toContain('y')
  })
})

describe('nada se cobra sin entregable', () => {
  /**
   * La regla que evita el peor incidente posible: cobrar y no poder entregar.
   * `publicado: true` sólo vale si hay un generador que arme el PDF de ese producto.
   * El despacho vive en `src/app/api/informes/[producto]/download/route.ts`.
   */
  const CON_GENERADOR = new Set([
    'informe-canon-arrendamiento',
    'informe-productivo-departamento',
    'parte-semanal-mercado',
    'informe-prospeccion-provincial',
    'informe-valuacion-campo',
    // PRO no entrega un PDF: es un tier sobre la cuenta. Su "entregable" son las
    // funciones que desbloquea, no un archivo.
    'pro-abierto',
  ])

  it('todo producto publicado tiene generador de PDF', () => {
    for (const p of getProductosPublicados()) {
      expect(CON_GENERADOR.has(p.slug)).toBe(true)
    }
  })

  it('los que todavía no tienen generador quedan despublicados', () => {
    const sinGenerador = PRODUCTOS_DATOS.filter((p) => !CON_GENERADOR.has(p.slug))
    expect(sinGenerador.length).toBeGreaterThan(0)
    for (const p of sinGenerador) expect(p.publicado).toBe(false)
  })
})

describe('cada landing del catálogo tiene su página', () => {
  /**
   * El sitemap emite una entrada por cada producto del catálogo, publicado o no (los
   * no publicados capturan lista de espera). Si un `landing` no tiene su `page.tsx`,
   * le estamos sirviendo un 404 a Google desde nuestro propio sitemap.
   *
   * Pasó: `pro-territorio` e `informe-prospeccion-provincial` estuvieron en el
   * sitemap dos builds antes de que existieran sus páginas.
   */
  it('no hay landing sin page.tsx', async () => {
    const { existsSync } = await import('node:fs')
    const { join } = await import('node:path')

    const faltantes = PRODUCTOS_DATOS.filter((p) => {
      const ruta = join(process.cwd(), 'src', 'app', '(terminal)', ...p.landing.split('/').filter(Boolean), 'page.tsx')
      return !existsSync(ruta)
    })
    expect(faltantes.map((p) => p.landing)).toEqual([])
  })
})
