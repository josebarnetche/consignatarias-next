/**
 * VR — Valor de Referencia: la banda de precio observado por categoría.
 *
 * ── QUÉ PROBLEMA RESUELVE ────────────────────────────────────────────────────
 * `valuaciones.ts` multiplica `precio_MAG × kg × cabezas` y devuelve UN número.
 * Medido sobre nuestra propia tabla `mag_consignataria_sales_lots` (18.397 lotes
 * con precio, 53 ruedas, 2026-05-19 → 2026-09-18), el mercado real no es un número:
 *
 *     VACA         P10 2.500 · mediana 2.900 · P90 3.600  → 44,0 % de amplitud
 *     VAQUILLONA   P10 3.500 · mediana 4.500 · P90 5.000  → 42,9 %
 *     NOVILLITO    P10 3.750 · mediana 4.700 · P90 5.100  → 36,0 %
 *     NOVILLO      P10 3.600 · mediana 4.300 · P90 4.600  → 27,8 %
 *
 * Sobre 350 vacas eso son decenas de millones de pesos de diferencia. Un punto en
 * el medio de esa banda no sirve para colateralizar, asegurar ni licenciar: sirve
 * para tener una idea. La banda, con el n que la sustenta, sí.
 *
 * ── POR QUÉ LA BANDA Y NO EL CORTE POR PROVINCIA ─────────────────────────────
 * Medido sobre VACA a 90 días, el origen mueve la mediana entre −6,5 % (SLU) y
 * +7,9 % (CBA/LPA), y solo 6 provincias llegan a n≥30 (BUE se lleva 5.039 lotes).
 * La varianza grande es de CALIDAD DE LOTE, no geográfica: vale 4 a 6 veces más
 * que el ajuste de origen. Por eso la banda es el producto y la provincia un
 * secundario que se aplica solo cuando hay base, y se declara cuando no.
 *
 * ── POR QUÉ ES SÍNCRONO Y LEE UN JSON ────────────────────────────────────────
 * Igual que `market-prices.json`: las bandas se precomputan una vez por día
 * (`scripts/compute-vr-bandas.mjs`) y se commitean. Consultar Supabase en cada
 * llamada volvería dinámico todo lo que hoy es SSG y pondría una query de
 * percentiles en el camino caliente del MCP, que responde a agentes.
 *
 * ── LA REGLA QUE NO SE NEGOCIA: NUNCA INVENTAR PRECISIÓN ─────────────────────
 * Misma doctrina que `inmag-historico.ts` (recorta y lo declara, nunca niega).
 * Con base fina se devuelve menos, y se dice. El caso `VAC.MUERTA` del dato crudo
 * —40 lotes, precio 0— es la prueba de que la regla hace falta: hay categorías
 * basura que no pueden llegar a una respuesta.
 */
import bandas from '@/lib/data/vr-bandas.json'

/** Versión de la metodología. Cambia el cálculo → cambia esto. */
export const VR_METODOLOGIA = 'VR v1.0'
export const VR_METODOLOGIA_URL = 'https://www.consignatarias.com.ar/metodologia/vr'

interface VrArchivoShape { ventana_dias: number; ventana_origen_dias: number }

/** Ventanas del cálculo. Expuestas porque la página de metodología las declara. */
export const VR_VENTANA_DIAS = (bandas as unknown as VrArchivoShape).ventana_dias
export const VR_VENTANA_ORIGEN_DIAS = (bandas as unknown as VrArchivoShape).ventana_origen_dias

/** Mínimos de la regla de degradación. */
export const MIN_LOTES_BANDA = 10
export const MIN_LOTES_BANDA_COMPLETA = 30
export const MIN_LOTES_AJUSTE_ORIGEN = 30

/** Confianza de la respuesta, de mayor a menor. */
export type VrConfianza = 'alta' | 'media' | 'baja' | 'sin_base'

export interface VrBanda {
  p10: number
  mediana: number
  p90: number
  amplitud_pct: number
  lotes: number
  cabezas: number
}

export interface VrOrigen {
  provincia: string
  factor: number
  lotes: number
}

interface VrArchivo {
  generado: string
  ventana_dias: number
  ventana_origen_dias: number
  fecha_dato_desde: string
  fecha_dato_hasta: string
  categorias: Record<string, VrBanda>
  origen: Record<string, VrOrigen[]>
  /** Últimos puntos de la serie, embebidos para la sparkline pública (ver `getTendencia`). */
  tendencia?: Record<string, VrPuntoTendencia[]>
}

export interface VrPuntoTendencia {
  date: string
  amplitud: number
  mediana: number
}

const archivo = bandas as unknown as VrArchivo

/**
 * Categorías del dato de lote (MAG, mayúsculas) ↔ categorías de `market-prices.json`
 * (minúsculas, plural). Sin este mapa la banda nunca se engancharía con `valuarTropa`.
 */
const CATEGORIA_A_LOTE: Record<string, string> = {
  novillos: 'NOVILLO',
  novillitos: 'NOVILLITO',
  vaquillonas: 'VAQUILLONA',
  vacas: 'VACA',
  toros: 'TORO',
  terneros: 'TERNERO',
}

export interface VrReferencia {
  unidad: 'ARS/kg vivo'
  confianza: VrConfianza
  /** null cuando no hay base suficiente: el caller cae a la referencia MAG. */
  banda: VrBanda | null
  origen: VrOrigen | null
  ventana_dias: number
  fecha_dato: string
  metodologia: string
  url_metodologia: string
  /** Siempre presente. Va EN la respuesta, no en un footer. */
  limites: string[]
}

const LIMITE_BASE =
  'Referencia de mercado observada en el MAG (Cañuelas), no es una tasación ni una cotización en firme.'

/**
 * Resuelve la banda para una categoría, con ajuste de origen si hay base.
 *
 * Devuelve SIEMPRE un objeto: cuando no hay base, `banda` es null y `confianza`
 * es 'sin_base'. Que el caller decida caer a la referencia MAG — acá no se
 * inventa un número ni se tira un error.
 */
export function getReferencia(categoria: string, provincia?: string): VrReferencia {
  const cat = CATEGORIA_A_LOTE[categoria.toLowerCase()]
  const banda = cat ? archivo.categorias[cat] : undefined

  const base: Omit<VrReferencia, 'confianza' | 'banda' | 'origen' | 'limites'> = {
    unidad: 'ARS/kg vivo',
    ventana_dias: archivo.ventana_dias,
    fecha_dato: archivo.fecha_dato_hasta,
    metodologia: VR_METODOLOGIA,
    url_metodologia: VR_METODOLOGIA_URL,
  }

  if (!banda || banda.lotes < MIN_LOTES_BANDA) {
    return {
      ...base,
      confianza: 'sin_base',
      banda: null,
      origen: null,
      limites: [
        LIMITE_BASE,
        cat
          ? `No hay base suficiente de lotes observados para ${categoria} en los últimos ${archivo.ventana_dias} días (mínimo ${MIN_LOTES_BANDA}). Se responde con la referencia nacional del MAG, sin banda.`
          : `La categoría "${categoria}" no tiene equivalente en el dato de lote del MAG. Se responde con la referencia nacional, sin banda.`,
      ],
    }
  }

  // Base fina: mediana sí, banda no. Decir por qué.
  if (banda.lotes < MIN_LOTES_BANDA_COMPLETA) {
    return {
      ...base,
      confianza: 'baja',
      // La banda colapsa en la mediana, así que la amplitud es 0. Dejar la
      // original diría "rango nulo" y "53% de dispersión" en la misma respuesta.
      banda: { ...banda, p10: banda.mediana, p90: banda.mediana, amplitud_pct: 0 },
      origen: null,
      limites: [
        LIMITE_BASE,
        `Base fina: ${banda.lotes} lotes en ${archivo.ventana_dias} días. Se informa la mediana sin banda de dispersión (hacen falta ${MIN_LOTES_BANDA_COMPLETA} lotes).`,
      ],
    }
  }

  const origen = resolverOrigen(cat, provincia)
  const limites = [LIMITE_BASE]

  if (provincia && !origen) {
    limites.push(
      `No hay serie oficial de precios por provincia. El ajuste por origen se aplica solo con ${MIN_LOTES_AJUSTE_ORIGEN}+ lotes en ${archivo.ventana_origen_dias} días y ${provincia} no llega, así que esta referencia es nacional.`,
    )
  }
  if (origen) {
    limites.push(
      `Ajuste por origen ${origen.provincia}: ×${origen.factor.toFixed(3)} sobre ${origen.lotes} lotes en ${archivo.ventana_origen_dias} días. Es un ajuste de nuestra base, no un precio oficial provincial.`,
    )
  }

  return {
    ...base,
    confianza: banda.lotes >= 100 ? 'alta' : 'media',
    banda: origen ? aplicarFactor(banda, origen.factor) : banda,
    origen,
    limites,
  }
}

function aplicarFactor(b: VrBanda, factor: number): VrBanda {
  return {
    ...b,
    p10: Math.round(b.p10 * factor),
    mediana: Math.round(b.mediana * factor),
    p90: Math.round(b.p90 * factor),
  }
}

/** Normaliza "Buenos Aires" / "bue" / "BUE" al código de 3 letras del dato de lote. */
const ALIAS_PROVINCIA: Record<string, string> = {
  'buenos aires': 'BUE',
  cordoba: 'CBA',
  'córdoba': 'CBA',
  'santa fe': 'SFE',
  'entre rios': 'ERI',
  'entre ríos': 'ERI',
  'la pampa': 'LPA',
  'san luis': 'SLU',
  'santiago del estero': 'SGO',
  corrientes: 'COR',
  chaco: 'CHA',
  formosa: 'FOR',
}

export function normalizarProvincia(p: string): string {
  const k = p.trim().toLowerCase()
  if (ALIAS_PROVINCIA[k]) return ALIAS_PROVINCIA[k]
  return p.trim().toUpperCase().slice(0, 3)
}

function resolverOrigen(categoriaLote: string, provincia?: string): VrOrigen | null {
  if (!provincia) return null
  const cod = normalizarProvincia(provincia)
  const fila = archivo.origen[categoriaLote]?.find((o) => o.provincia === cod)
  if (!fila || fila.lotes < MIN_LOTES_AJUSTE_ORIGEN) return null
  return fila
}

/** Las tres puntas de la valuación. Con base fina las tres colapsan en la central. */
export function valuarConBanda(
  ref: VrReferencia,
  kg: number,
  cabezas: number,
  precioFallbackKg: number,
): { conservador: number; central: number; optimista: number; usó_banda: boolean } {
  const unidades = kg * cabezas
  if (!ref.banda) {
    const central = Math.round(precioFallbackKg * unidades)
    return { conservador: central, central, optimista: central, usó_banda: false }
  }
  return {
    conservador: Math.round(ref.banda.p10 * unidades),
    central: Math.round(ref.banda.mediana * unidades),
    optimista: Math.round(ref.banda.p90 * unidades),
    usó_banda: true,
  }
}

/* ── Superficie pública: lo que lee la página de metodología y /mercado ────── */

/** Etiquetas legibles para las categorías del dato de lote. */
const ETIQUETA: Record<string, string> = {
  NOVILLO: 'Novillo',
  NOVILLITO: 'Novillito',
  VAQUILLONA: 'Vaquillona',
  VACA: 'Vaca',
  TORO: 'Toro',
  MEJ: 'MEJ (mejorado)',
}

export interface VrBandaPublica extends VrBanda {
  /** Código del dato de lote (NOVILLO, VACA…). */
  codigo: string
  /** Etiqueta legible. */
  categoria: string
}

/**
 * Las bandas publicables, ordenadas por volumen de cabezas. Solo las que pasan el
 * mínimo de la regla de degradación — una banda que no se puede sostener no se muestra.
 */
export function getBandasPublicas(): VrBandaPublica[] {
  return Object.entries(archivo.categorias)
    .filter(([, b]) => b.lotes >= MIN_LOTES_BANDA_COMPLETA)
    .map(([codigo, b]) => ({ ...b, codigo, categoria: ETIQUETA[codigo] ?? codigo }))
    .sort((a, b) => b.cabezas - a.cabezas)
}

/** Cobertura de la ventana vigente: fechas y totales que sostienen las bandas. */
export function vrCobertura(): { desde: string; hasta: string; lotes: number; cabezas: number } {
  const todas = Object.values(archivo.categorias)
  return {
    desde: archivo.fecha_dato_desde,
    hasta: archivo.fecha_dato_hasta,
    lotes: todas.reduce((s, b) => s + b.lotes, 0),
    cabezas: todas.reduce((s, b) => s + b.cabezas, 0),
  }
}

/** Slug público por categoría: /vr/vaca, /vr/novillo… */
const SLUG_A_CODIGO: Record<string, string> = {
  novillo: 'NOVILLO',
  novillito: 'NOVILLITO',
  vaquillona: 'VAQUILLONA',
  vaca: 'VACA',
  toro: 'TORO',
  mej: 'MEJ',
}

/**
 * Todos los slugs que el producto reconoce, tengan banda hoy o no.
 * `generateStaticParams` usa ESTA lista para que una URL ya indexada nunca pase
 * a 404 por una caída temporal de base; el sitemap usa `getSlugsConBanda()`,
 * que sí exige banda vigente.
 */
export const SLUGS_CONOCIDOS = Object.keys(SLUG_A_CODIGO)

/** Slugs con banda publicable. Es la fuente del sitemap. */
export function getSlugsConBanda(): string[] {
  return Object.entries(SLUG_A_CODIGO)
    .filter(([, codigo]) => (archivo.categorias[codigo]?.lotes ?? 0) >= MIN_LOTES_BANDA_COMPLETA)
    .map(([slug]) => slug)
}

/** La banda de un slug público, o null si ese slug no tiene base publicable. */
export function getBandaPorSlug(slug: string): VrBandaPublica | null {
  const codigo = SLUG_A_CODIGO[slug.toLowerCase()]
  if (!codigo) return null
  const b = archivo.categorias[codigo]
  if (!b || b.lotes < MIN_LOTES_BANDA_COMPLETA) return null
  return { ...b, codigo, categoria: ETIQUETA[codigo] ?? codigo }
}

/** Ajustes por origen de una categoría, para mostrarlos en su página. */
export function getOrigenPorSlug(slug: string): VrOrigen[] {
  const codigo = SLUG_A_CODIGO[slug.toLowerCase()]
  if (!codigo) return []
  return archivo.origen[codigo] ?? []
}

/** Nombre legible de provincia para el código de 3 letras del dato de lote. */
export const PROVINCIA_NOMBRE: Record<string, string> = {
  BUE: 'Buenos Aires',
  CBA: 'Córdoba',
  SFE: 'Santa Fe',
  ERI: 'Entre Ríos',
  LPA: 'La Pampa',
  SLU: 'San Luis',
  SGO: 'Santiago del Estero',
  COR: 'Corrientes',
  CHA: 'Chaco',
  FOR: 'Formosa',
}

/**
 * Traduce cualquier nombre de categoría que el producto acepte al código del
 * dato de lote ("NOVILLO"). Resuelve las tres formas que circulan:
 * la de `market-prices` ("novillos"), su singular ("novillo") y el slug
 * público ("mej", que NO existe en market-prices pero sí tiene banda y página).
 *
 * Consulta los DOS mapas a propósito. Cuando solo miraba `CATEGORIA_A_LOTE`,
 * `/vr/mej` publicaba banda y tenía filas en la serie, pero
 * `?vr=historico&categoria=mej` respondía 400 — dos mapas que no se hablaban.
 * Que esto sea una sola función es lo que impide que vuelvan a divergir.
 */
export function categoriaALote(categoria: string): string | null {
  const c = categoria.trim().toLowerCase()
  if (CATEGORIA_A_LOTE[c]) return CATEGORIA_A_LOTE[c]
  if (SLUG_A_CODIGO[c]) return SLUG_A_CODIGO[c]
  // Singular → plural: "novillo" → "novillos".
  const plural = c.endsWith('s') ? c : `${c}s`
  return CATEGORIA_A_LOTE[plural] ?? null
}

/**
 * Los nombres de categoría que `categoriaALote` resuelve. Es lo que el endpoint
 * ofrece cuando rechaza una categoría, así que no puede prometer más de lo que
 * la función acepta (hay un test que lo verifica).
 */
export const CATEGORIAS_CON_LOTE = Array.from(
  new Set([...Object.keys(CATEGORIA_A_LOTE), ...Object.keys(SLUG_A_CODIGO)]),
).filter((c) => CATEGORIA_A_LOTE[c] || SLUG_A_CODIGO[c])

/**
 * Los últimos puntos de la serie de dispersión para una categoría.
 *
 * Viene embebido en el JSON, no de la base: así `/vr/[categoria]` sigue siendo
 * SSG puro. La serie COMPLETA es Enterprise (`/api/precios?vr=historico`); acá
 * va solo la ventana corta, que es la misma doctrina de siempre — el número se
 * ve, la profundidad se paga.
 */
export function getTendenciaPorSlug(slug: string): VrPuntoTendencia[] {
  const codigo = SLUG_A_CODIGO[slug.toLowerCase()]
  if (!codigo) return []
  return archivo.tendencia?.[codigo] ?? []
}

export interface VrMovimiento {
  /** Puntos porcentuales que se movió la amplitud entre el primer y el último punto. */
  deltaPuntos: number
  direccion: 'abriendo' | 'cerrando' | 'estable'
  desde: string
  hasta: string
  amplitudInicial: number
  amplitudFinal: number
}

/**
 * Cómo se movió la dispersión en la ventana de tendencia.
 *
 * Umbral de 1 punto porcentual para llamarlo movimiento: por debajo de eso la
 * diferencia es ruido del redondeo de percentiles y anunciarla como tendencia
 * sería exactamente el tipo de falsa precisión que el resto del VR evita.
 */
export function getMovimiento(slug: string): VrMovimiento | null {
  const pts = getTendenciaPorSlug(slug)
  if (pts.length < 2) return null
  const a = pts[0]
  const z = pts[pts.length - 1]
  const delta = Number((z.amplitud - a.amplitud).toFixed(1))
  return {
    deltaPuntos: delta,
    direccion: delta > 1 ? 'abriendo' : delta < -1 ? 'cerrando' : 'estable',
    desde: a.date,
    hasta: z.date,
    amplitudInicial: a.amplitud,
    amplitudFinal: z.amplitud,
  }
}
