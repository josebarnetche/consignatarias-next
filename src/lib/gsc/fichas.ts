/**
 * fichas.ts — "Lo que buscan en Google sobre su firma" (17-10-2026).
 *
 * Por cada ficha /consignatarias/<slug>, las consultas de Google Search Console que
 * la mostraron: impresiones, clics y posición, a 28 y a 90 días. Es un bloque del
 * panel PRO, del reporte mensual y del PDF de la propuesta.
 *
 * POR QUÉ VIVE EN UNA TABLA (`gsc_fichas`) Y NO SE PIDE EN VIVO
 * Google tiene cuota y tarda: el panel y el PDF no pueden llamarlo en cada carga.
 * Un cron semanal (/api/cron/gsc-fichas) hace UNA consulta para todas las fichas y
 * guarda el resultado; acá sólo se agrega y se lee.
 *
 * Este archivo es PURO a propósito (sin `server-only`, sin imports con valor): lo
 * importan el cron, el componente del panel, los tests y también
 * `scripts/gsc-fichas-local.mjs`, que lo carga directo con el type-stripping de
 * Node (≥ 22.18 / 23.6). Por eso todo import es `import type` y no se usa sintaxis
 * de TS que no se pueda borrar (enum, namespace, parameter properties).
 */
import type { ServiceClient } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  TIPOS                                                              */
/* ------------------------------------------------------------------ */

/** Una fila de searchanalytics.query con dimensiones [page, query] o [page]. */
export interface FilaGsc {
  keys?: string[] | null
  clicks?: number | null
  impressions?: number | null
  position?: number | null
}

export interface ConsultaGsc {
  query: string
  impresiones: number
  clics: number
  /** Posición media, ponderada por impresiones. */
  posicion: number
}

export interface FichaGsc {
  slug: string
  impresiones: number
  clics: number
  posicion: number | null
  /** Top consultas por impresiones (máx. `TOP_CONSULTAS`). */
  consultas: ConsultaGsc[]
}

export interface PeriodoBusquedas {
  dias: number
  desde: string
  hasta: string
  impresiones: number
  clics: number
  posicion: number | null
  consultas: ConsultaGsc[]
  actualizado: string
}

export interface BusquedasFicha {
  d28: PeriodoBusquedas | null
  d90: PeriodoBusquedas | null
}

export const TOP_CONSULTAS = 25
export const PERIODOS_GSC = [28, 90] as const
/** GSC publica con 2-3 días de atraso: la ventana termina hoy − 3. */
export const LAG_GSC_DIAS = 3

/* ------------------------------------------------------------------ */
/*  RUTA → SLUG                                                        */
/* ------------------------------------------------------------------ */

/**
 * Las páginas de provincia del directorio comparten la ruta /consignatarias/<x>
 * pero NO son una firma. Copia de las claves de PROVINCE_MAP
 * (`src/app/(terminal)/consignatarias/_views/ProvinceView.tsx`): no se importa de
 * ahí porque ese módulo arrastra componentes y remates.json al cron. Un test
 * verifica que las dos listas sigan iguales.
 */
export const PROVINCIAS_DIRECTORIO: ReadonlySet<string> = new Set([
  'buenos-aires', 'chaco', 'cordoba', 'corrientes', 'entre-rios', 'formosa', 'la-pampa',
  'misiones', 'neuquen', 'san-luis', 'santa-fe', 'santiago-del-estero', 'tucuman',
])

/** Rutas hermanas bajo /consignatarias/ que tampoco son una ficha. */
const RUTAS_NO_FICHA: ReadonlySet<string> = new Set(['activar'])

/**
 * Arma el mapeo URL de GSC → slug canónico. `canonico` resuelve variantes
 * (reggi-y-cia → reggi); si no la conoce, la firma no curada conserva su slug
 * (su ficha se sintetiza desde los remates y también la busca la gente).
 * Devuelve null para todo lo que no es la ficha misma: provincias, subrutas
 * (/consignatarias/reggi/activar), el índice.
 */
export function crearSlugDePath(canonico: (raw: string) => string | null): (pagina: string) => string | null {
  return (pagina: string) => {
    let path = pagina
    try {
      path = new URL(pagina, 'https://www.consignatarias.com.ar').pathname
    } catch {
      return null
    }
    try {
      path = decodeURIComponent(path)
    } catch {
      /* se queda con el path crudo */
    }
    const m = path.toLowerCase().replace(/\/+$/, '').match(/^\/consignatarias\/([^/]+)$/)
    if (!m) return null
    const raw = m[1]
    if (PROVINCIAS_DIRECTORIO.has(raw) || RUTAS_NO_FICHA.has(raw)) return null
    return canonico(raw) ?? raw
  }
}

/* ------------------------------------------------------------------ */
/*  AGREGACIÓN                                                         */
/* ------------------------------------------------------------------ */

const redondear = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d

/**
 * Agrega filas de GSC por ficha.
 *
 * - `filasConsulta`: dimensiones [page, query]. Dan el detalle de qué se buscó.
 * - `filasPagina` (opcional): dimensiones [page]. Dan el TOTAL de la ficha. Hace
 *   falta porque Google oculta las consultas poco frecuentes ("anonimizadas"): en
 *   Reggi, la suma de las consultas da ~2/3 de las impresiones reales de la página.
 *   Sin estas filas el total cae a la suma de las consultas (y lo subestima).
 *
 * Varias URLs pueden caer en el mismo slug (variantes con 308, mayúsculas): se
 * suman, y la misma consulta en dos URLs se funde en una. La posición se pondera
 * por impresiones, que es como la promedia Google.
 */
export function agregarPorFicha(
  filasConsulta: FilaGsc[],
  slugDePath: (pagina: string) => string | null,
  filasPagina?: FilaGsc[],
): Map<string, FichaGsc> {
  type Acum = { impr: number; clics: number; posImpr: number }
  const nuevo = (): Acum => ({ impr: 0, clics: 0, posImpr: 0 })
  const sumar = (a: Acum, f: FilaGsc) => {
    const impr = f.impressions ?? 0
    a.impr += impr
    a.clics += f.clicks ?? 0
    a.posImpr += (f.position ?? 0) * impr
  }

  const porSlug = new Map<string, { total: Acum; consultas: Map<string, Acum> }>()
  const slot = (slug: string) => {
    let s = porSlug.get(slug)
    if (!s) porSlug.set(slug, (s = { total: nuevo(), consultas: new Map() }))
    return s
  }

  for (const f of filasConsulta) {
    const [pagina, query] = f.keys ?? []
    if (!pagina || !query) continue
    const slug = slugDePath(pagina)
    if (!slug) continue
    const s = slot(slug)
    const q = query.trim().toLowerCase()
    let a = s.consultas.get(q)
    if (!a) s.consultas.set(q, (a = nuevo()))
    sumar(a, f)
    if (!filasPagina) sumar(s.total, f)
  }

  if (filasPagina) {
    for (const f of filasPagina) {
      const pagina = f.keys?.[0]
      if (!pagina) continue
      const slug = slugDePath(pagina)
      if (!slug) continue
      sumar(slot(slug).total, f)
    }
  }

  const out = new Map<string, FichaGsc>()
  for (const [slug, s] of porSlug) {
    const consultas: ConsultaGsc[] = [...s.consultas.entries()]
      .map(([query, a]) => ({
        query,
        impresiones: a.impr,
        clics: a.clics,
        posicion: a.impr > 0 ? redondear(a.posImpr / a.impr) : 0,
      }))
      .sort((x, y) => y.impresiones - x.impresiones || y.clics - x.clics || x.query.localeCompare(y.query))
      .slice(0, TOP_CONSULTAS)
    out.set(slug, {
      slug,
      impresiones: s.total.impr,
      clics: s.total.clics,
      posicion: s.total.impr > 0 ? redondear(s.total.posImpr / s.total.impr) : null,
      consultas,
    })
  }
  return out
}

/** Ventana [desde, hasta] en ISO para `dias` días que terminan en hoy − LAG. */
export function ventanaGsc(dias: number, hoy: Date = new Date()): { desde: string; hasta: string } {
  const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - LAG_GSC_DIAS))
  const desde = new Date(hasta)
  desde.setUTCDate(desde.getUTCDate() - (dias - 1))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: iso(desde), hasta: iso(hasta) }
}

/* ------------------------------------------------------------------ */
/*  LECTURA DEL PATRÓN "REMATE EN VIVO"                                */
/* ------------------------------------------------------------------ */

const RE_EN_VIVO = /\b(en vivo|vivo|hoy|remates?)\b/i

/**
 * Las consultas que buscan el remate (en vivo / hoy / remate). Es el hallazgo que
 * se le muestra a la firma: la gente la busca para mirar el remate, no sólo por
 * el nombre. Ej. Reggi: "reggi y cia remate hoy en vivo", "remate reggi en vivo".
 */
export function consultasDeRemate(consultas: ConsultaGsc[]): ConsultaGsc[] {
  return consultas.filter((c) => RE_EN_VIVO.test(c.query))
}

/* ------------------------------------------------------------------ */
/*  LECTOR                                                             */
/* ------------------------------------------------------------------ */

function aConsultas(v: unknown): ConsultaGsc[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      query: String(x.query ?? ''),
      impresiones: Number(x.impresiones ?? 0),
      clics: Number(x.clics ?? 0),
      posicion: Number(x.posicion ?? 0),
    }))
    .filter((c) => c.query)
}

/**
 * Lee lo guardado por el cron para una ficha. null si no hay nada (tabla vacía,
 * firma sin impresiones, o la tabla todavía no existe en la base): el panel
 * muestra entonces el estado vacío, nunca un cero inventado.
 */
export async function getBusquedasFicha(db: ServiceClient, slug: string): Promise<BusquedasFicha | null> {
  const { data, error } = await db
    .from('gsc_fichas')
    .select('periodo_dias, desde, hasta, impresiones, clics, posicion, consultas, actualizado')
    .eq('slug', slug)
  if (error || !data || data.length === 0) return null
  const periodo = (dias: number): PeriodoBusquedas | null => {
    const r = data.find((x) => x.periodo_dias === dias)
    if (!r) return null
    return {
      dias,
      desde: r.desde,
      hasta: r.hasta,
      impresiones: r.impresiones,
      clics: r.clics,
      posicion: r.posicion === null ? null : Number(r.posicion),
      consultas: aConsultas(r.consultas),
      actualizado: r.actualizado,
    }
  }
  const out = { d28: periodo(28), d90: periodo(90) }
  return out.d28 || out.d90 ? out : null
}
