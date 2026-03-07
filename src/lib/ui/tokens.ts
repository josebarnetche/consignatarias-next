import type { Auction } from '@/lib/db/schema'

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
  return `${day} ${MONTH_NAMES[d.getMonth()]}`
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
