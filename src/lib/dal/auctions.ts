/**
 * auctions.ts — la agenda de remates de una firma, de las DOS fuentes.
 *
 * EL PROBLEMA QUE RESUELVE
 * Los remates de una consignataria viven en dos lados: el calendario scrapeado
 * (`remates.json`, lo que el sitio encuentra solo) y `consignataria_auctions` (lo que
 * la firma carga desde su panel). Hasta ahora el merge estaba escrito **inline y sólo
 * en el perfil**, así que un remate cargado por el dueño aparecía en su página y en
 * ningún otro lado: ni en `/go`, ni en el widget, ni en el iCal, ni en el PDF, ni en
 * el ranking provincial.
 *
 * O sea: la promesa central que se le vende a la firma —"cargá tu remate y lo
 * distribuimos"— no se cumplía. El remate se cargaba y se quedaba quieto.
 *
 * Este módulo es la fuente única. Cualquier superficie que muestre remates de una
 * firma debería llamar acá y no leer `remates.json` por su cuenta.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Auction } from '@/lib/db/schema'

/**
 * Los ids de los remates cargados por el dueño se desplazan a un rango propio para
 * no chocar con los del scrape, que vienen numerados desde 1.
 */
export const OWNER_ID_OFFSET = 100_000

/** Fila cruda de `consignataria_auctions`. */
interface OwnerAuctionRow {
  id: number
  title: string | null
  date: string
  time: string | null
  location: string | null
  province: string | null
  type: string | null
  main_category: string | null
  estimated_heads: number | null
  description: string | null
  catalog_url: string | null
  youtube_url: string | null
  status: string | null
}

/**
 * Normaliza una fila de la tabla a la misma forma que usa `remates.json`.
 *
 * OJO CON EL ID. La versión anterior calculaba `100000 + row.id + idx`, sumando la
 * posición en la lista. Como la lista va ordenada por fecha y los ids no son
 * consecutivos, dos remates distintos podían caer en el mismo número: el id 5 en la
 * posición 0 y el id 4 en la posición 1 dan los dos 100005. Eso rompe las keys de
 * React y hace que un enlace al detalle pueda abrir el remate equivocado. El
 * desplazamiento tiene que depender SÓLO del id.
 */
export function normalizeOwnerAuction(row: OwnerAuctionRow, firmaNombre: string, slug: string): Auction {
  return {
    id: OWNER_ID_OFFSET + row.id,
    title: row.title ?? '',
    consignatariaName: firmaNombre,
    consignatariaSlug: slug,
    date: row.date.slice(0, 10),
    time: row.time || null,
    location: row.location || '',
    province: row.province || '',
    type: (row.type as Auction['type']) || 'general',
    mainCategory: (row.main_category as Auction['mainCategory']) || 'mixto',
    estimatedHeads: row.estimated_heads ?? null,
    description: row.description || '',
    youtubeUrl: row.youtube_url || null,
    catalogUrl: row.catalog_url || null,
    source: 'manual',
    sourceUrl: null,
    status: (row.status as Auction['status']) || 'scheduled',
  } as Auction
}

/** Clave para detectar que dos filas son el MISMO remate del mundo real. */
function claveRemate(a: Pick<Auction, 'date' | 'location'>): string {
  return `${a.date}|${(a.location || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()}`
}

/**
 * Une las dos fuentes para una firma.
 *
 * Cuando el mismo remate está en las dos (el scraper lo encontró Y el dueño lo
 * cargó), **gana el del dueño**: él sabe la hora, las cabezas y el catálogo mejor
 * que nuestro parser. Se considera el mismo remate si coinciden fecha y localidad.
 *
 * Ordena por fecha y hora ascendente.
 */
export function mergeAuctions(scrapeadas: Auction[], propias: Auction[]): Auction[] {
  const clavesPropias = new Set(propias.map(claveRemate))
  const sinPisar = scrapeadas.filter((a) => !clavesPropias.has(claveRemate(a)))

  return [...sinPisar, ...propias].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
  )
}

/**
 * Agenda completa de una firma: lo scrapeado más lo que cargó ella.
 *
 * `scrapeadas` lo pasa el llamador ya filtrado por firma —normalmente con
 * `getAuctionsForProfile()`, que resuelve las variantes de slug— para que este módulo
 * no tenga que importar las 900 filas del calendario.
 *
 * Soft-fail: si la consulta a la base falla o tarda, devuelve sólo lo scrapeado. Una
 * agenda incompleta es mejor que una página caída.
 */
export async function getMergedAuctionsForConsignataria(
  db: SupabaseClient | null,
  slug: string,
  firmaNombre: string,
  scrapeadas: Auction[],
): Promise<Auction[]> {
  if (!db) return [...scrapeadas].sort((a, b) => a.date.localeCompare(b.date))

  try {
    const { data, error } = await db
      .from('consignataria_auctions')
      .select('id, title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url, status')
      .eq('consignataria_slug', slug)
      .order('date', { ascending: true })

    if (error || !data) return mergeAuctions(scrapeadas, [])

    const propias = (data as OwnerAuctionRow[]).map((r) => normalizeOwnerAuction(r, firmaNombre, slug))
    return mergeAuctions(scrapeadas, propias)
  } catch {
    return mergeAuctions(scrapeadas, [])
  }
}

/**
 * TODOS los remates cargados por dueños, agrupados por slug, en UNA sola query.
 *
 * Existe para el build estático. `/go/[slug]` tiene `dynamicParams = false` y genera
 * las 107 páginas de una: pedir los remates propios firma por firma serían 107
 * consultas en cada build. Con esto es una.
 *
 * El resultado se cachea a nivel de módulo porque durante un build el proceso es el
 * mismo para todas las páginas. **No usar en un contexto de request de larga vida**
 * sin pensar la invalidación: acá el proceso muere con el build, en un server no.
 */
let cacheOwnerAuctions: Map<string, OwnerAuctionRow[]> | null = null

export async function getOwnerAuctionsBySlug(
  db: SupabaseClient | null,
): Promise<Map<string, OwnerAuctionRow[]>> {
  if (cacheOwnerAuctions) return cacheOwnerAuctions
  const vacio = new Map<string, OwnerAuctionRow[]>()
  if (!db) return vacio

  try {
    const { data, error } = await db
      .from('consignataria_auctions')
      .select('id, consignataria_slug, title, date, time, location, province, type, main_category, estimated_heads, description, catalog_url, youtube_url, status')
      .order('date', { ascending: true })
      .limit(5000)

    if (error || !data) return vacio

    const out = new Map<string, OwnerAuctionRow[]>()
    for (const row of data as Array<OwnerAuctionRow & { consignataria_slug: string }>) {
      out.set(row.consignataria_slug, [...(out.get(row.consignataria_slug) ?? []), row])
    }
    cacheOwnerAuctions = out
    return out
  } catch {
    return vacio
  }
}

/** Sólo para tests: descarta el cache de módulo. */
export function _resetOwnerAuctionsCache(): void {
  cacheOwnerAuctions = null
}

/**
 * Sólo los que todavía no pasaron, del más próximo al más lejano.
 *
 * No filtra por `status`: el tipo `Auction` sólo admite scheduled/live/completed —
 * no existe un remate cancelado en el modelo— y un remate 'completed' con fecha
 * futura sería un dato inconsistente que conviene ver, no esconder.
 */
export function soloProximos(auctions: Auction[], hoy = new Date().toISOString().slice(0, 10)): Auction[] {
  return auctions.filter((a) => a.date >= hoy)
}
