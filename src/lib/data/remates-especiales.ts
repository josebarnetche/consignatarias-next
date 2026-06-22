import rematesEspecialesData from './remates-especiales.json'

/* ------------------------------------------------------------------ */
/*  REMATES ESPECIALES                                                 */
/*                                                                     */
/*  Reusable layer for "remates especiales" — premium cabaña/expositor */
/*  auctions operated by a consignataria (reproductores, razas         */
/*  destacadas, streaming en vivo, pre-oferta). Generic by design:     */
/*  every concrete case lives in remates-especiales.json, nothing is   */
/*  hardcoded to a single brand here.                                  */
/* ------------------------------------------------------------------ */

export interface RemateEspecial {
  /** Canonical slug of the consignataria that OPERATES the auction. */
  consignatariaSlug: string
  /** Expositor / cabaña name (e.g. "Farming Salentein"). */
  brand: string
  /** Optional logo path under /public (e.g. "/logos/salentein.png"). */
  brandLogo: string | null
  /** Razas destacadas, shown as chips. */
  breeds: string[]
  title: string
  /** ISO date "YYYY-MM-DD" — matched against the normal remate's date. */
  date: string
  /** "HH:MM" or omitted. */
  time?: string
  location: string
  province: string
  /** Free-text lote summary, e.g. "~60 toros · ~300 vientres". */
  lotes: string
  /** e.g. "Streaming en vivo". */
  modality: string
  /** Hook line, e.g. "5% OFF online en pre-oferta". */
  preOffer: string
  catalogUrl?: string | null
  youtubeUrl?: string | null
}

const REMATES_ESPECIALES = rematesEspecialesData as RemateEspecial[]

/** All remates especiales operated by a given consignataria (by canonical slug). */
export function getRematesEspecialesForSlug(slug: string): RemateEspecial[] {
  return REMATES_ESPECIALES.filter((r) => r.consignatariaSlug === slug)
}

/**
 * Match a normal remate against a remate especial config entry by
 * consignatariaSlug + date. Returns the especial when the consignataria
 * operates one on that date, otherwise null. This is the join key used to
 * surface the expositor badge on listing/calendar cards.
 */
export function findRemateEspecial(
  consignatariaSlug: string,
  date: string,
): RemateEspecial | null {
  return (
    REMATES_ESPECIALES.find(
      (r) => r.consignatariaSlug === consignatariaSlug && r.date === date,
    ) ?? null
  )
}

/** True when the consignataria operates at least one remate especial. */
export function hasRematesEspeciales(slug: string): boolean {
  return REMATES_ESPECIALES.some((r) => r.consignatariaSlug === slug)
}
