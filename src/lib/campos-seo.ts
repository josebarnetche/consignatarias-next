/**
 * Páginas de valor de la tierra por provincia y por partido.
 *
 * Son programáticas pero no son plantillas vacías: cada una se arma con el
 * relevamiento propio de `tierra-por-kilo.json` — valor de la hectárea, zonas
 * adentro de la provincia, canon relevado — así que dos provincias distintas
 * dicen cosas distintas. Una página por provincia que solo cambiara el nombre
 * sería basura para el lector y para el buscador.
 */
import {
  TIERRA,
  TIERRA_PROVINCIAS,
  ZONA_POR_PARTIDO,
  type ProvinciaTierra,
} from '@/lib/valuacion-campos'

export function slugProvincia(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Las provincias con dato propio. Sin dato no hay página: no inventamos cobertura. */
export const PROVINCIAS_CON_DATO = TIERRA_PROVINCIAS.map((t) => ({
  ...t,
  slug: slugProvincia(t.provincia),
}))

export function provinciaPorSlug(slug: string): ProvinciaTierra | null {
  return PROVINCIAS_CON_DATO.find((p) => p.slug === slug) ?? null
}

export function zonasDeProvincia(provincia: string): ProvinciaTierra[] {
  return TIERRA.filter((t) => !!t.zona && t.provincia === provincia).sort(
    (a, b) => b.usd_ha - a.usd_ha,
  )
}

/**
 * Los partidos de la provincia con la zona a la que pertenecen. Es lo que hace
 * que la página responda "cuánto vale la hectárea en Pergamino" y no solo
 * "en Buenos Aires", que es como la gente busca de verdad.
 */
export function partidosDeProvincia(
  provincia: string,
): Array<{ partido: string; zona: string; usdHa: number }> {
  const mapa = ZONA_POR_PARTIDO[
    provincia
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  ]
  if (!mapa) return []
  const zonas = zonasDeProvincia(provincia)
  const salida: Array<{ partido: string; zona: string; usdHa: number }> = []
  for (const [zona, partidos] of Object.entries(mapa)) {
    const t = zonas.find((z) => z.zona === zona)
    if (!t) continue
    for (const p of partidos.split(',')) {
      salida.push({ partido: titulo(p.trim()), zona, usdHa: t.usd_ha })
    }
  }
  return salida.sort((a, b) => a.partido.localeCompare(b.partido, 'es'))
}

function titulo(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bDe\b/g, 'de')
}

export function slugZona(zona: string): string {
  return slugProvincia(zona)
}

/** Todas las zonas relevadas, con su slug, para generar sus páginas. */
export const ZONAS_CON_DATO = TIERRA.filter((t) => !!t.zona).map((t) => ({
  ...t,
  provinciaSlug: slugProvincia(t.provincia),
  zonaSlug: slugZona(t.zona as string),
}))

export function zonaPorSlug(provinciaSlug: string, zonaSlug: string) {
  return (
    ZONAS_CON_DATO.find((z) => z.provinciaSlug === provinciaSlug && z.zonaSlug === zonaSlug) ?? null
  )
}

/** Los partidos que caen en una zona, para que la página los nombre. */
export function partidosDeZona(provincia: string, zona: string): string[] {
  return partidosDeProvincia(provincia)
    .filter((p) => p.zona === zona)
    .map((p) => p.partido)
}

/** Superficies típicas de operación, para responder "campos de N hectáreas en X". */
export const SUPERFICIES_TIPICAS = [100, 200, 500, 1000, 2000, 5000]
