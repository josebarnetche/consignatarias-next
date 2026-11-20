/**
 * Enriquecimiento de remates: pin de mapa, logo de la firma y hora faltante.
 *
 * `remates.json` lo reescribe el scraper todos los días, así que estos datos
 * viven aparte (`remates-enriq.json`) y se cruzan al leer. Fuentes:
 * - pines: OpenStreetMap (predio/Sociedad Rural) o Georef (centro de la
 *   localidad), filtrados por provincia; `precision` dice cuál es.
 * - logos: el sitio de cada firma, verificados (200 + image/*).
 * - horas: solo las que una fuente publica para esa fecha y lugar; nunca se
 *   pisa una hora que ya trae el remate.
 */
import data from '@/lib/data/remates-enriq.json'
import type { Auction, PinRemate } from '@/lib/db/schema'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'

export type { PinRemate }

export interface EnriqRemate {
  pin: PinRemate | null
  logo_url: string | null
  web: string | null
  /** Hora del remate o, si no la trae, la publicada por una fuente. */
  hora: string | null
  hora_fuente: string | null
}

type Lugar = { lat: number; lng: number; precision: 'predio' | 'localidad'; predio: string | null }
type Firma = { logo: string | null; web: string | null; /** Motivo para NO mostrar logo (ni el del perfil). */ logo_bloqueado?: string }
type Hora = { hora: string; fuente: string }

const LUGARES = data.lugares as Record<string, Lugar>
const FIRMAS = data.firmas as Record<string, Firma>
const HORAS = data.horas as Record<string, Hora>

// Índice por slug canónico: una variante nueva del nombre ("f-rauch") encuentra
// el logo cargado bajo otra ("ferias-rauch-s-a").
const FIRMAS_CANON = new Map<string, Firma>()
for (const [slug, f] of Object.entries(FIRMAS)) {
  const c = getCanonicalSlug(slug) ?? slug
  const prev = FIRMAS_CANON.get(c)
  if (!prev || (!prev.logo && f.logo)) FIRMAS_CANON.set(c, f)
}

export function firmaDe(slug: string | null | undefined): Firma | null {
  if (!slug) return null
  return FIRMAS[slug] ?? FIRMAS_CANON.get(getCanonicalSlug(slug) ?? slug) ?? null
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function pinDe(location: string | null | undefined): PinRemate | null {
  const l = location ? LUGARES[location] : undefined
  if (!l) return null
  return { lat: l.lat, lng: l.lng, precision: l.precision, predio: l.predio, maps_url: mapsUrl(l.lat, l.lng) }
}

type RemateBase = Pick<Auction, 'consignatariaSlug' | 'date' | 'location' | 'time'>

/** Mapa canonical_slug → logo_url del directorio (lo que la firma sube desde su perfil). */
export type LogosPerfil = Record<string, string>

function logoDePerfil(slug: string | null | undefined, perfiles?: LogosPerfil): string | null {
  if (!slug || !perfiles) return null
  const url = perfiles[getCanonicalSlug(slug) ?? slug] ?? perfiles[slug]
  // Solo https: un logo http rompe la página por contenido mixto.
  return url && /^https:\/\//.test(url) ? url : null
}

export function enriquecerRemate(a: RemateBase, perfiles?: LogosPerfil): EnriqRemate {
  const firma = firmaDe(a.consignatariaSlug)
  const h = a.time ? null : HORAS[`${a.consignatariaSlug}|${a.date}|${a.location}`]
  return {
    pin: pinDe(a.location),
    logo_url: firma?.logo ?? (firma?.logo_bloqueado ? null : logoDePerfil(a.consignatariaSlug, perfiles)),
    web: firma?.web ?? null,
    hora: a.time ?? h?.hora ?? null,
    hora_fuente: h?.fuente ?? null,
  }
}

/** El remate con hora completada, pin y logo, listo para la UI. */
export function conEnriq<T extends Auction>(a: T, perfiles?: LogosPerfil): T {
  const e = enriquecerRemate(a, perfiles)
  return { ...a, time: e.hora, pin: e.pin, logoUrl: e.logo_url }
}
