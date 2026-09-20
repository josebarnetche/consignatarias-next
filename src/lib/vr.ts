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
      banda: { ...banda, p10: banda.mediana, p90: banda.mediana },
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
