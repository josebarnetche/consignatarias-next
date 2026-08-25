/**
 * benchmark.ts — cómo vendió una firma contra el resto del mercado, por categoría.
 *
 * POR QUÉ ESTO Y NO LEADS
 * El argumento de venta de PRO venía siendo "te damos leads", y no se sostiene:
 * al 24-ago-2026 hay **un solo** `consignataria_leads` real en 130 firmas. Prometer
 * un flujo que no existe se cae en la primera reunión. Y la demanda genérica del
 * sitio (`producer_leads`) es del negocio, no algo para regalar.
 *
 * Lo que sí tenemos y la firma no: **14.234 lotes vendidos en Cañuelas**, de 22
 * casas, con precio, categoría y cabezas, actualizado Mar/Mié/Vie. Su CRM tiene sus
 * propias liquidaciones; lo que no tiene —y no puede tener— es el número de las
 * otras casas para la misma categoría, el mismo día.
 *
 * Eso convierte el panel en algo que su sistema no reemplaza: *"en novillo vendiste
 * 4,1% arriba del promedio del mercado; en toro, 17% abajo"*. Es el argumento que la
 * firma usa para pelear una consignación, y se lo damos hecho.
 *
 * HONESTIDAD (la misma regla que en performance.ts)
 *  · **Nunca se compara el promedio general entre firmas.** Una casa que vende más
 *    terneros tiene un $/kg más alto que otra que vende vacas, sin que ninguna venda
 *    mejor. La única comparación válida es dentro de la misma categoría.
 *  · Con pocos lotes el promedio es ruido: por debajo de `MIN_LOTES` no se afirma
 *    nada, y la diferencia se marca como significativa sólo si supera el error
 *    estándar de la propia serie.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Lotes mínimos para que el promedio de una firma en una categoría signifique algo. */
export const MIN_LOTES = 15

/** Lotes mínimos del mercado en esa categoría para servir de referencia. */
const MIN_LOTES_MERCADO = 50

export interface FilaBenchmark {
  categoria: string
  lotes: number
  cabezas: number
  /** $/kg promedio de la firma en esa categoría. */
  miPrecio: number
  /** $/kg promedio del mercado (todas las casas) en esa categoría. */
  precioMercado: number
  /** Diferencia porcentual contra el mercado. Positivo = vendió más caro. */
  diffPct: number
  /**
   * ¿La diferencia se distingue del ruido? Se compara contra el error estándar de
   * la media de la firma: si la brecha no lo supera, es dispersión normal de lotes.
   */
  significativa: boolean
  /** Frase lista para mostrar, honesta sobre lo que se puede afirmar. */
  leyenda: string
}

export interface Benchmark {
  slug: string
  /** Ventana analizada, en días. */
  dias: number
  filas: FilaBenchmark[]
  totalLotes: number
  totalCabezas: number
  /** Cuántos remitentes distintos le consignaron: su cartera activa en el MAG. */
  clientes: number
  /** Categorías donde vende por encima del mercado, de mayor a menor ventaja. */
  fuertes: FilaBenchmark[]
  /** Donde vende por debajo. Es lo primero que la firma quiere mirar. */
  debiles: FilaBenchmark[]
  ultimaVenta: string | null
}

interface LoteRow {
  category: string | null
  price: number | null
  head_count: number | null
  date: string
  remitente: string | null
  mag_consignataria_id: number
}

/** Promedio simple. */
function media(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/**
 * Error estándar de la media: desvío / √n.
 *
 * Es la banda de ruido de la propia serie de la firma. Una diferencia contra el
 * mercado que no lo supera puede ser sólo qué lotes le tocaron ese mes, no cómo
 * vendió.
 */
function errorEstandar(xs: number[]): number {
  if (xs.length < 2) return Infinity
  const m = media(xs)
  const varianza = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(varianza / xs.length)
}

function leyendaDe(cat: string, diffPct: number, significativa: boolean, lotes: number): string {
  const cual = cat.toLowerCase()
  if (!significativa) {
    return `En ${cual} vendiste prácticamente al precio del mercado (${lotes} lotes). La diferencia entra en la dispersión normal entre lotes.`
  }
  const abs = Math.abs(diffPct).toFixed(1)
  return diffPct > 0
    ? `En ${cual} vendiste ${abs}% por encima del promedio del mercado (${lotes} lotes).`
    : `En ${cual} vendiste ${abs}% por debajo del promedio del mercado (${lotes} lotes).`
}

/**
 * Benchmark de una firma contra el mercado de Cañuelas.
 *
 * `slug` es el canónico de la consignataria; se resuelve al id del MAG por
 * `mag_consignatarias.consignataria_canonical_slug`. Devuelve null si la firma no
 * opera en el MAG o no tiene lotes suficientes — que es el caso de la mayoría de las
 * casas del interior, y decirlo así es más honesto que mostrar una tabla vacía.
 */
export async function getBenchmark(
  db: SupabaseClient | null,
  slug: string,
  dias = 60,
): Promise<Benchmark | null> {
  if (!db) return null
  try {
    const { data: firmaMag } = await db
      .from('mag_consignatarias')
      .select('mag_id')
      .eq('consignataria_canonical_slug', slug)
      .maybeSingle()

    const magId = (firmaMag as { mag_id: number } | null)?.mag_id
    if (!magId) return null

    const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)

    // Se traen TODOS los lotes del período (no sólo los de la firma) porque el
    // promedio del mercado es la referencia; filtrar antes obligaría a una segunda
    // consulta y a mantener dos ventanas sincronizadas.
    //
    // PAGINADO A MANO, y no es opcional: PostgREST corta en 1.000 filas por
    // respuesta sin avisar, y `.limit(50000)` no lo cambia. En 60 días hay ~8.000
    // lotes, así que sin esto el benchmark salía calculado sobre el 12% del mercado
    // —con precios promedio equivocados y presentados como si fueran el dato—.
    const lotes: LoteRow[] = []
    const PAGINA = 1000
    for (let desdeFila = 0; ; desdeFila += PAGINA) {
      const { data, error } = await db
        .from('mag_consignataria_sales_lots')
        .select('category, price, head_count, date, remitente, mag_consignataria_id')
        .gte('date', desde)
        .order('id', { ascending: true })
        .range(desdeFila, desdeFila + PAGINA - 1)

      if (error) return null
      const pagina = (data ?? []) as LoteRow[]
      lotes.push(...pagina)
      if (pagina.length < PAGINA) break
      // Tope duro: 60 días son ~8.000 lotes; 60.000 es diez veces eso y evita un
      // bucle infinito si algún día la consulta deja de achicar la página.
      if (lotes.length >= 60_000) break
    }

    if (lotes.length === 0) return null

    const precioMercadoPorCat = new Map<string, number[]>()
    const preciosFirmaPorCat = new Map<string, number[]>()
    const cabezasPorCat = new Map<string, number>()
    const clientes = new Set<string>()
    let ultimaVenta: string | null = null
    let totalLotes = 0
    let totalCabezas = 0

    for (const l of lotes) {
      if (!l.category || !l.price || l.price <= 0) continue
      const cat = l.category.trim().toUpperCase()

      precioMercadoPorCat.set(cat, [...(precioMercadoPorCat.get(cat) ?? []), l.price])

      if (l.mag_consignataria_id === magId) {
        preciosFirmaPorCat.set(cat, [...(preciosFirmaPorCat.get(cat) ?? []), l.price])
        cabezasPorCat.set(cat, (cabezasPorCat.get(cat) ?? 0) + (l.head_count ?? 0))
        if (l.remitente) clientes.add(l.remitente.trim().toUpperCase())
        totalLotes++
        totalCabezas += l.head_count ?? 0
        if (!ultimaVenta || l.date > ultimaVenta) ultimaVenta = l.date
      }
    }

    if (totalLotes === 0) return null

    const filas: FilaBenchmark[] = []
    for (const [cat, preciosFirma] of preciosFirmaPorCat) {
      if (preciosFirma.length < MIN_LOTES) continue
      const preciosMercado = precioMercadoPorCat.get(cat) ?? []
      if (preciosMercado.length < MIN_LOTES_MERCADO) continue

      const miPrecio = media(preciosFirma)
      const precioMercado = media(preciosMercado)
      const diffPct = ((miPrecio - precioMercado) / precioMercado) * 100
      // Dos errores estándar ≈ 95%: la misma banda que usa el reporte mensual.
      const significativa = Math.abs(miPrecio - precioMercado) > 2 * errorEstandar(preciosFirma)

      filas.push({
        categoria: cat,
        lotes: preciosFirma.length,
        cabezas: cabezasPorCat.get(cat) ?? 0,
        miPrecio: Math.round(miPrecio),
        precioMercado: Math.round(precioMercado),
        diffPct: Number(diffPct.toFixed(1)),
        significativa,
        leyenda: leyendaDe(cat, diffPct, significativa, preciosFirma.length),
      })
    }

    if (filas.length === 0) return null

    filas.sort((a, b) => b.cabezas - a.cabezas)
    const conSeñal = filas.filter((f) => f.significativa)

    return {
      slug,
      dias,
      filas,
      totalLotes,
      totalCabezas,
      clientes: clientes.size,
      fuertes: conSeñal.filter((f) => f.diffPct > 0).sort((a, b) => b.diffPct - a.diffPct),
      debiles: conSeñal.filter((f) => f.diffPct < 0).sort((a, b) => a.diffPct - b.diffPct),
      ultimaVenta,
    }
  } catch (e) {
    console.error('[benchmark] falló:', e)
    return null
  }
}
