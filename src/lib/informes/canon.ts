import tierra from '@/lib/data/tierra-por-kilo.json'
import marketPrices from '@/lib/data/market-prices.json'
import type { InformeCanonData, ZonaCanon } from '@/lib/pdf/generateInformeCanonPDF'

/**
 * canon.ts — arma los datos del informe de canon a partir del slug de una zona.
 *
 * Vive separado del generador de PDF a propósito: el generador no tiene que saber cómo
 * está guardado `tierra-por-kilo.json` ni de dónde sale el precio del novillo. Si mañana
 * el relevamiento cambia de forma, el PDF no se entera.
 *
 * La variante del entitlement ES el slug de zona que devuelve `slugZona()`, así que esta
 * función y la columna `informe_purchases.variante_slug` tienen que coincidir siempre.
 */

interface FilaTierra {
  provincia: string
  region: string | null
  zona: string | null
  n: number
  usd_ha: number
  p25: number | null
  p75: number | null
  kg_ha_ano: number | null
  kg_ha_mes_canon: number | null
  anos_repago: number | null
  aptitud: string | null
  canon_fuente: string | null
  fecha: string | null
}

const FILAS = tierra as FilaTierra[]

export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** El slug de una zona: `provincia` o `provincia/zona`. Es la variante del entitlement. */
export function slugZona(f: { provincia: string; zona: string | null }): string {
  return f.zona ? `${slugificar(f.provincia)}/${slugificar(f.zona)}` : slugificar(f.provincia)
}

export function nombreZona(f: { provincia: string; zona: string | null }): string {
  return f.zona ? `${f.provincia} · ${f.zona}` : f.provincia
}

/** Las zonas que se pueden vender: sólo las que tienen canon relevado. */
export function zonasConCanon(): FilaTierra[] {
  return FILAS.filter((f) => f.kg_ha_mes_canon && f.kg_ha_mes_canon > 0)
}

export function buscarZona(slug: string): FilaTierra | null {
  return zonasConCanon().find((f) => slugZona(f) === slug) ?? null
}

function aZonaCanon(f: FilaTierra): ZonaCanon {
  return {
    provincia: f.provincia,
    zona: f.zona,
    n: f.n,
    usdHa: f.usd_ha,
    p25: f.p25,
    p75: f.p75,
    kgHaMesCanon: f.kg_ha_mes_canon!,
    kgHaAno: f.kg_ha_ano,
    aniosRepago: f.anos_repago,
    aptitud: f.aptitud,
    canonFuente: f.canon_fuente,
  }
}

/**
 * Los comparables de una zona.
 *
 * Primero las de la misma región (que es la vecindad real, no la administrativa), después
 * las de aptitud parecida. Se excluye la propia. Sin esto el canon se lee en el vacío: un
 * número solo no dice si es alto o bajo.
 */
export function comparablesDe(f: FilaTierra, tope = 8): FilaTierra[] {
  const resto = zonasConCanon().filter((z) => slugZona(z) !== slugZona(f))
  const mismaRegion = resto.filter((z) => z.region && z.region === f.region)
  const mismaAptitud = resto.filter(
    (z) => z.aptitud === f.aptitud && !mismaRegion.includes(z),
  )
  return [...mismaRegion, ...mismaAptitud, ...resto]
    .filter((z, i, arr) => arr.indexOf(z) === i)
    .slice(0, tope)
}

/** Precio del novillo y dólar del día, con su fecha. */
function mercado() {
  const m = marketPrices as {
    categories: Record<string, { current: number }>
    usdBlue?: { current: number }
    lastUpdate: string
  }
  return {
    novilloArsKg: m.categories?.novillos?.current ?? 0,
    usdArs: m.usdBlue?.current ?? null,
    fecha: m.lastUpdate,
  }
}

/** Fecha en formato humano corto, para el PDF. */
function fechaCorta(iso: string): string {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${MESES[Number(m) - 1] ?? m}-${a}`
}

/**
 * Arma el payload completo del informe. Devuelve `null` si la zona no existe o si no hay
 * precio del novillo — sin precio el informe no puede convertir kilos a pesos, que es la
 * mitad de lo que se compró, y es preferible no entregar a entregar un PDF con ceros.
 */
export function armarInformeCanon(
  slugDeZona: string,
  compradorEmail: string,
  hoy = new Date(),
): InformeCanonData | null {
  const f = buscarZona(slugDeZona)
  if (!f) return null

  const m = mercado()
  if (!m.novilloArsKg) return null

  return {
    zona: aZonaCanon(f),
    comparables: comparablesDe(f).map(aZonaCanon),
    novilloArsKg: m.novilloArsKg,
    novilloFecha: fechaCorta(m.fecha),
    usdArs: m.usdArs,
    compradorEmail,
    generadoISO: hoy.toISOString().slice(0, 10),
    datasetFecha: f.fecha ?? 'agosto 2026',
  }
}
