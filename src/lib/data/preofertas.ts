import elTigre from './preoferta-el-tigre.json'

/* ------------------------------------------------------------------ */
/*  REGISTRY DE PRE-OFERTAS                                            */
/*                                                                     */
/*  Capa reusable de pre-oferta integrada, multi-remate. El Tigre es   */
/*  el primero (cabaña cliente Memola + Reggi consignataria PRO), pero */
/*  el sistema sirve para cualquier remate/consignataria/cabaña:       */
/*  agregar uno = un JSON en data/ + una línea acá. Nada hardcodeado   */
/*  a una marca fuera de los datos.                                    */
/* ------------------------------------------------------------------ */

export interface PreofertaLote {
  rp: string
  corral: string
  lote: string
  video: string
  fn?: string
  padre?: string
  madre?: string
  reg?: string
  ce?: string
  peso?: string
  base?: number
  elrural_id?: string
}

export interface Preoferta {
  slug: string
  consignatariaSlug: string
  cabana: string
  es_cliente_memola?: boolean
  consignataria_pro?: boolean
  elrural_remate_id?: string
  remate: string
  fecha: string          // ISO del remate
  lugar: string
  consignataria: string
  base: number
  cierre_preoferta: string // ISO
  fuente_precios?: string
  veterinario?: string
  flete_gratis?: boolean
  condiciones?: {
    sanidad: string[]
    garantia: { plazo: string; cubre: string; no_cubre: string; exclusion: string }
    financiacion: string
  }
  lotes: PreofertaLote[]
}

// ⬇️ Agregar acá cada nueva pre-oferta (import + entrada en el array).
const PREOFERTAS: Preoferta[] = [elTigre as unknown as Preoferta]

/** Todas las pre-ofertas registradas. */
export function getAllPreofertas(): Preoferta[] {
  return PREOFERTAS
}

/** Una pre-oferta por slug, o null. */
export function getPreoferta(slug: string): Preoferta | null {
  return PREOFERTAS.find((p) => p.slug === slug) ?? null
}

/** Pre-ofertas ABIERTAS (antes del cierre) para un instante dado. */
export function getActivePreofertas(nowMs: number): Preoferta[] {
  return PREOFERTAS.filter((p) => nowMs < new Date(p.cierre_preoferta).getTime())
}

/** Pre-oferta que opera una consignataria (por slug canónico), si hay. */
export function getPreofertaForConsignataria(consignatariaSlug: string): Preoferta | null {
  return PREOFERTAS.find((p) => p.consignatariaSlug === consignatariaSlug) ?? null
}
