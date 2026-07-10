import type { Auction } from '@/lib/db/schema'

/* ================================================================== */
/*  SEMANTIC COLOR — UNA fuente de verdad                             */
/*  (DESIGN-SYSTEM.md §2.1 — keep in sync con tailwind.config.js)     */
/* ================================================================== */

/**
 * Canonical hex per semantic tone. This is the SINGLE source of truth for
 * data/value color across the product. Components (HeroNumber, StatPill,
 * Delta, charts, …) import from here — they MUST NOT hardcode a local map.
 *
 * Hard rules (DESIGN-SYSTEM.md §2.1):
 *  - `neutral` (#a1a1aa) y `emphasis` (#f4f4f5) son tokens DISTINTOS. Resuelve
 *    la colisión histórica: HeroNumber usaba #f4f4f5 y StatPill #a1a1aa para
 *    el mismo 'neutral'. Ahora `neutral` = dato sin tendencia (zinc-400) y
 *    `emphasis` = texto fuerte / número-hero (zinc-100).
 *  - Estado ≠ marca: `accent` = interactivo/enlace/foco; `positive/negative/
 *    warning` = valor/dato; `live` = tiempo real. Un número que sube usa
 *    `positive`, jamás `accent`.
 *  - Los charts reciben `SEMANTIC_HEX.positive`, nunca el literal '#34d399'.
 */
export const SEMANTIC_HEX = {
  neutral:  '#a1a1aa', // zinc-400 — dato sin tendencia
  emphasis: '#f4f4f5', // zinc-100 — texto fuerte / número-hero (NO es 'neutral')
  positive: '#34d399', // emerald-400 — sube / ganancia
  negative: '#f87171', // red-400 — baja / pérdida
  warning:  '#fbbf24', // amber-400 — alerta
  accent:   '#38bdf8', // sky-400 — interactivo / enlace / foco
  live:     '#10b981', // emerald-500 — tiempo real
} as const

export type SemanticTone = keyof typeof SEMANTIC_HEX

/** Resolve a tone to its canonical hex. */
export const toneHex = (tone: SemanticTone): string => SEMANTIC_HEX[tone]

/**
 * Map a signed change to a tone. Values within ±`thr` are `neutral` (flat);
 * positive → `positive`, negative → `negative`. Use for deltas/variations so
 * "subió/bajó/igual" always colors the same way across the 135 files.
 */
export const signedTone = (
  n: number,
  thr = 0
): 'neutral' | 'positive' | 'negative' =>
  Math.abs(n) <= thr ? 'neutral' : n > 0 ? 'positive' : 'negative'

/* ------------------------------------------------------------------ */
/*  TYPE BADGE TOKENS                                                  */
/* ------------------------------------------------------------------ */

/** Border + text classes for type badges */
export const TYPE_COLORS: Record<string, string> = {
  invernada: 'border-positive text-positive',
  cria: 'border-accent text-accent',
  reproductores: 'border-warning text-warning',
  general: 'border-zinc-500 text-zinc-400',
  especial: 'border-negative text-negative',
}

/** Full labels for display */
export const TYPE_LABELS: Record<string, string> = {
  invernada: 'INVERNADA',
  cria: 'CRIA',
  reproductores: 'REPRODUCTORES',
  general: 'GENERAL',
  especial: 'ESPECIAL',
}

/** Short labels for tight spaces (desktop table columns) */
export const TYPE_LABELS_SHORT: Record<string, string> = {
  invernada: 'INV',
  cria: 'CRIA',
  reproductores: 'REPROD',
  general: 'GRAL',
  especial: 'ESPEC',
}

/** Background colors for bar charts */
export const TYPE_BAR_COLORS: Record<string, string> = {
  invernada: 'bg-positive',
  cria: 'bg-accent',
  reproductores: 'bg-warning',
  general: 'bg-zinc-500',
  especial: 'bg-negative',
}

/* ------------------------------------------------------------------ */
/*  CATEGORY TOKENS                                                    */
/* ------------------------------------------------------------------ */

/** Full category labels */
export const CAT_LABELS: Record<Auction['mainCategory'], string> = {
  terneros: 'Terneros',
  novillos: 'Novillos',
  vaca_gorda: 'Vaca gorda',
  vaquillonas: 'Vaquillonas',
  toros: 'Toros',
  mixto: 'Mixto',
}

/** Short category codes for dense desktop view */
export const CAT_CODES: Record<Auction['mainCategory'], string> = {
  terneros: 'TERN',
  novillos: 'NOV',
  vaca_gorda: 'V.GOR',
  vaquillonas: 'VAQUI',
  toros: 'TOROS',
  mixto: 'MIXTO',
}

/* ------------------------------------------------------------------ */
/*  PROVINCE TOKENS                                                    */
/* ------------------------------------------------------------------ */

/** Short province codes for desktop */
export const PROVINCE_CODES: Record<string, string> = {
  'CORRIENTES': 'CORR',
  'CHACO': 'CHAC',
  'FORMOSA': 'FORM',
  'ENTRE RIOS': 'RIOS',
  'SANTA FE': 'STFE',
  'BUENOS AIRES': 'BSAS',
  'MISIONES': 'MISI',
  'SANTIAGO DEL ESTERO': 'SEST',
  'TUCUMAN': 'TUCU',
  'SALTA': 'SALT',
  'CORDOBA': 'CORD',
  'LA PAMPA': 'LPAM',
  'SAN LUIS': 'SLUI',
  'NEUQUEN': 'NEUQ',
}

/* ------------------------------------------------------------------ */
/*  MONTH NAMES                                                        */
/* ------------------------------------------------------------------ */

export const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
export const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/* ------------------------------------------------------------------ */
/*  SHARED HELPERS                                                     */
/* ------------------------------------------------------------------ */

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

export function getCity(location: string): string {
  return (location || '').split(',')[0].trim()
}

export function getProvinceCode(province: string): string {
  return PROVINCE_CODES[province] || province.substring(0, 4).toUpperCase()
}

export function getProvinceName(province: string): string {
  // Capitalize first letter of each word for display
  return province
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get "effective today" date string in YYYY-MM-DD format.
 * After 20:00 ART, shift to tomorrow so users see upcoming auctions.
 */
export function getEffectiveToday(): string {
  const now = new Date()
  const art = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  if (art.getHours() >= 20) art.setDate(art.getDate() + 1)
  const y = art.getFullYear()
  const m = (art.getMonth() + 1).toString().padStart(2, '0')
  const d = art.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Fecha REAL de hoy en ART (YYYY-MM-DD), SIN el shift de las 20:00 de
 * getEffectiveToday(). Para el estado real de un remate y la relación hoy/mañana
 * del badge — NO para filtrar qué remates listar como próximos.
 */
export function getRealToday(): string {
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  return `${art.getFullYear()}-${String(art.getMonth() + 1).padStart(2, '0')}-${String(art.getDate()).padStart(2, '0')}`
}

/**
 * Compute effective auction status based on the REAL-TIME ART clock.
 *
 * IMPORTANTE: el estado se computa contra la fecha/hora REAL de ART, NO contra el
 * parámetro `today`. Los callers pasan `getEffectiveToday()`, que corre la fecha a
 * MAÑANA después de las 20:00 (solo para LISTAR próximos remates). Usar ese today
 * shifteado acá causaba un bug: de noche, un remate de mañana a la tarde aparecía
 * "FINALIZADO" (today=mañana + reloj de esta noche → parecía pasado, y el badge se
 * contradecía con el countdown). El `today` se mantiene por compatibilidad de firma
 * pero se ignora — el estado real de un remate no depende del shift de listado.
 *
 * Rules:
 * - date < hoy(ART) → completed
 * - date > hoy(ART) → scheduled
 * - date === hoy(ART):
 *   - time known → scheduled until start, live during (up to 3h), completed after
 *   - time null  → live from 08:00 ART, completed after 20:00 ART
 */
export function getEffectiveStatus(
  date: string,
  time: string | null,
  _today?: string,
): Auction['status'] {
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const realToday = `${art.getFullYear()}-${String(art.getMonth() + 1).padStart(2, '0')}-${String(art.getDate()).padStart(2, '0')}`

  if (date < realToday) return 'completed'
  if (date > realToday) return 'scheduled'

  // date === hoy(ART) — compute based on current ART time
  const nowMinutes = art.getHours() * 60 + art.getMinutes()

  if (time) {
    const [h, m] = time.split(':').map(Number)
    const startMinutes = h * 60 + m
    const endMinutes = startMinutes + 180 // 3 hours duration

    if (nowMinutes < startMinutes) return 'scheduled'
    if (nowMinutes < endMinutes) return 'live'
    return 'completed'
  }

  // No time specified — live from 8:00, completed after 20:00
  if (nowMinutes < 480) return 'scheduled'  // before 08:00
  if (nowMinutes >= 1200) return 'completed' // after 20:00
  return 'live'
}
