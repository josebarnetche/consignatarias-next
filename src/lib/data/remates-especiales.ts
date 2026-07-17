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
  /* ── Módulo de pre-oferta integrado (opcional) ──
     Cuando hay preofertaSlug se renderiza el mini-módulo: doble cuenta regresiva
     (al remate y al cierre de la pre-oferta), tira de lotes y CTA a /preoferta/<slug>. */
  /** Slug de la pre-oferta integrada, p.ej. "el-tigre" → /preoferta/el-tigre. */
  preofertaSlug?: string
  /** Cierre de la pre-oferta, ISO "YYYY-MM-DDTHH:MM". */
  cierrePreoferta?: string
  /** Fecha+hora del remate para la cuenta regresiva, ISO "YYYY-MM-DDTHH:MM". */
  remateAt?: string
  /** IDs de YouTube de algunos lotes para la tira de previews. */
  preofertaThumbs?: string[]
  /** Total de lotes en la pre-oferta (para el CTA "ver los N lotes"). */
  preofertaLotes?: number
  /** Cantidad de canales de financiación bancaria publicados (gancho al dossier). */
  financiacionCanales?: number
  /**
   * Token que debe aparecer en el título del remate del calendario para que este
   * destaque le corresponda. Evita que el badge matchee cualquier remate de la
   * misma consignataria en la misma fecha (p.ej. una feria semanal). Case-insensitive.
   */
  matchTitle?: string
}

const REMATES_ESPECIALES = rematesEspecialesData as RemateEspecial[]

/** Fecha de hoy en ART (YYYY-MM-DD) — el server corre en UTC. */
function hoyART(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
}

/**
 * Remates especiales de una consignataria (por slug), excluyendo los cuya fecha
 * ya pasó — así el destaque se auto-oculta el día después del remate y no queda
 * publicidad vieja colgada en el perfil.
 */
export function getRematesEspecialesForSlug(slug: string): RemateEspecial[] {
  const hoy = hoyART()
  return REMATES_ESPECIALES.filter((r) => r.consignatariaSlug === slug && r.date >= hoy)
}

/**
 * Match a normal remate against a remate especial config entry. Joins by
 * consignatariaSlug + date, y —cuando el destaque define `matchTitle`— exige
 * además que ese token aparezca en el título del remate. Así el badge sale SOLO
 * en el remate que marcamos, no en cualquier otro de esa consignataria/fecha
 * (p.ej. una feria semanal que cae el mismo día). Returns null si no matchea.
 */
export function findRemateEspecial(
  consignatariaSlug: string,
  date: string,
  auctionTitle?: string,
): RemateEspecial | null {
  return (
    REMATES_ESPECIALES.find((r) => {
      if (r.consignatariaSlug !== consignatariaSlug || r.date !== date) return false
      if (r.matchTitle) {
        return (auctionTitle ?? '').toLowerCase().includes(r.matchTitle.toLowerCase())
      }
      return true
    }) ?? null
  )
}

/** True when the consignataria operates at least one remate especial. */
export function hasRematesEspeciales(slug: string): boolean {
  return REMATES_ESPECIALES.some((r) => r.consignatariaSlug === slug)
}
