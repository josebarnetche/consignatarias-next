/**
 * Umbrales de indexación compartidos entre cada página y el sitemap.
 *
 * Regla: la página decide su `robots` y el sitemap emite la URL con LA MISMA función.
 * Cuando cada lado tenía su propio criterio, el sitemap le ofrecía a Google páginas
 * flacas (meses vacíos, ciudades con "0 próximos") o directamente URLs que daban 404.
 */
import { getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import type { Auction } from '@/lib/db/schema'
import marketPrices from '@/lib/data/market-prices.json'
import { SERIE_ARRANCA } from '@/lib/inmag-historico'

const hoyISO = () => new Date().toISOString().slice(0, 10)

/* ------------------------------------------------------------------ */
/*  /calendario/[slug]                                                 */
/* ------------------------------------------------------------------ */

/** Remates de la firma desde hoy, en orden. */
export function proximosRematesDeFirma(auctions: Auction[], canonical: string, hoy = hoyISO()): Auction[] {
  return getAuctionsForProfile(auctions, canonical)
    .filter((a) => a.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * El calendario va noindex solo si la firma no tiene remates próximos NI hizo alguno en
 * los últimos 90 días. Una firma activa entre dos fechas sigue en el índice: esas
 * páginas traen tráfico (52 URLs con CTR de 4,3 % en GSC, sep-2026).
 */
export function calendarioIndexable(auctions: Auction[], canonical: string, ahora = new Date()): boolean {
  const hace90 = new Date(ahora.getTime() - 90 * 864e5).toISOString().slice(0, 10)
  return getAuctionsForProfile(auctions, canonical).some((a) => a.date >= hace90)
}

/* ------------------------------------------------------------------ */
/*  /remates/mes/[mes]                                                 */
/* ------------------------------------------------------------------ */

export const MESES: Record<string, { name: string; number: number }> = {
  enero: { name: 'Enero', number: 1 },
  febrero: { name: 'Febrero', number: 2 },
  marzo: { name: 'Marzo', number: 3 },
  abril: { name: 'Abril', number: 4 },
  mayo: { name: 'Mayo', number: 5 },
  junio: { name: 'Junio', number: 6 },
  julio: { name: 'Julio', number: 7 },
  agosto: { name: 'Agosto', number: 8 },
  septiembre: { name: 'Septiembre', number: 9 },
  octubre: { name: 'Octubre', number: 10 },
  noviembre: { name: 'Noviembre', number: 11 },
  diciembre: { name: 'Diciembre', number: 12 },
}

/** Por debajo de esto un mes es una lista de un puñado de tarjetas: noindex. */
export const MES_MIN_REMATES_INDEX = 15

/** El mes ya terminó (en el año en curso, que es el único que muestra la página). */
export function mesPasado(mes: string, ahora = new Date()): boolean {
  const config = MESES[mes]
  return !!config && config.number < ahora.getMonth() + 1
}

/**
 * Remates del mes en el año en curso. En un mes que ya pasó son los que se hicieron
 * (antes la página filtraba solo `scheduled` y todo mes pasado quedaba vacío); en el
 * mes en curso y los que vienen, los que están por hacerse.
 */
export function rematesDelMes(auctions: Auction[], mes: string, ahora = new Date()): Auction[] {
  const config = MESES[mes]
  if (!config) return []
  const prefix = `${ahora.getFullYear()}-${String(config.number).padStart(2, '0')}`
  const pasado = mesPasado(mes, ahora)
  return auctions
    .filter((a) => a.date.startsWith(prefix) && (pasado || a.status === 'scheduled' || a.status === 'live'))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
}

export function mesIndexable(auctions: Auction[], mes: string, ahora = new Date()): boolean {
  return rematesDelMes(auctions, mes, ahora).length >= MES_MIN_REMATES_INDEX
}

/* ------------------------------------------------------------------ */
/*  /remates/ciudad/[ciudad]                                           */
/* ------------------------------------------------------------------ */

export function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Alias de una misma localidad que el scraper trae escrita de dos formas. La página
 * del alias junta los remates de ambas, apunta su canonical a la principal y no entra
 * al sitemap. Las URLs del alias siguen respondiendo 200 (pueden estar indexadas).
 */
export const CIUDAD_ALIAS: Record<string, string> = {
  'san-nicolas-buenos-aires': 'san-nicolas-de-los-arroyos-buenos-aires',
  'brandsen-buenos-aires': 'coronel-brandsen-buenos-aires',
  'bolivar-buenos-aires': 'san-carlos-de-bolivar-buenos-aires',
  'buenos-aires-buenos-aires': 'buenos-aires',
}

/** "Localidades" que en realidad son un canal de TV o un "a definir". */
const NO_ES_CIUDAD = new Set([
  'a-definir-cordoba',
  'por-canal-rural-buenos-aires',
  'canal-rural-honduras-5940-catamarca',
])

/**
 * Las que Search Console marcó como soft 404 o 404 (indexacion.csv, sep-2026). Van
 * noindex aunque pasen el umbral, hasta que Google las vuelva a rastrear sanas: el
 * soft 404 venía del canonical global a la portada, ya corregido. Revisar y vaciar.
 */
const CIUDAD_SOFT404_GSC = new Set([
  'san-carlos-de-bolivar-buenos-aires',
  'san-justo-santa-fe',
  'chajari-entre-rios',
  'carmen-de-areco-buenos-aires',
  'formosa-formosa',
  'laprida-buenos-aires',
  'la-rural-palermo',
  'santo-tome-corrientes',
])

/**
 * Por debajo de esto, y sin ningún remate próximo, la ciudad es una página vacía.
 * El criterio es selectivo a propósito: las ciudades con impresiones rinden (5,1 % de
 * CTR en GSC), así que basta con agenda O con historia para quedar en el índice.
 */
export const CIUDAD_MIN_REMATES_INDEX = 3

export function ciudadCanonica(slug: string): string {
  return CIUDAD_ALIAS[slug] ?? slug
}

/** Remates de la ciudad, sumando los que vienen bajo cualquiera de sus alias. */
export function rematesDeCiudad(auctions: Auction[], slug: string): Auction[] {
  const canonica = ciudadCanonica(slug)
  return auctions.filter((a) => !!a.location && ciudadCanonica(normalizeCity(a.location)) === canonica)
}

/**
 * Noindex (y fuera del sitemap) solo si no tiene remates próximos Y tiene menos de 3 en
 * total, o si no es una localidad, o si GSC la marcó soft 404. Un alias no lleva
 * noindex: lleva canonical a la principal y queda fuera del sitemap (ver sitemap.ts).
 */
export function ciudadIndexable(auctions: Auction[], slug: string, hoy = hoyISO()): boolean {
  if (NO_ES_CIUDAD.has(slug) || CIUDAD_SOFT404_GSC.has(slug)) return false
  const lista = rematesDeCiudad(auctions, slug)
  const tieneProximos = lista.some((a) => a.date >= hoy)
  return tieneProximos || lista.length >= CIUDAD_MIN_REMATES_INDEX
}

/** Lo que entra al sitemap: indexable y slug principal (los alias quedan afuera). */
export function ciudadEnSitemap(auctions: Auction[], slug: string, hoy = hoyISO()): boolean {
  return !CIUDAD_ALIAS[slug] && ciudadIndexable(auctions, slug, hoy)
}

/** Todos los slugs con página (los alias incluidos: no se rompen URLs ya publicadas). */
export function slugsDeCiudades(auctions: Auction[]): string[] {
  const vistos = new Set<string>()
  for (const a of auctions) if (a.location) vistos.add(normalizeCity(a.location))
  return Array.from(vistos)
}

/* ------------------------------------------------------------------ */
/*  /mercado/inmag/[anio]                                              */
/* ------------------------------------------------------------------ */

/**
 * Años con serie INMAG: desde el arranque de la serie empalmada hasta el año del último
 * dato publicado. La página (con dynamicParams = false) y el sitemap usan esta lista;
 * antes los dos tenían 2015–2026 escrito a mano.
 */
export function aniosInmag(): number[] {
  const desde = Number(SERIE_ARRANCA.slice(0, 4))
  const hasta = Number(String(marketPrices.lastUpdate).slice(0, 4)) || new Date().getFullYear()
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
}
