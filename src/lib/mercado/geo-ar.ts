/**
 * Geografía argentina para el closer: región de cada provincia y cómo se nombra
 * una zona sin identificar a nadie. Compartido por todos los verticales.
 */
import { normalizeGeo } from '@/lib/leads/routing'

const REGION: Record<string, string> = {
  'BUENOS AIRES': 'pampeana', 'SANTA FE': 'pampeana', CORDOBA: 'pampeana',
  'ENTRE RIOS': 'pampeana', 'LA PAMPA': 'pampeana',
  CORRIENTES: 'nea', MISIONES: 'nea', CHACO: 'nea', FORMOSA: 'nea',
  SALTA: 'noa', JUJUY: 'noa', TUCUMAN: 'noa', 'SANTIAGO DEL ESTERO': 'noa', CATAMARCA: 'noa',
  MENDOZA: 'cuyo', 'SAN JUAN': 'cuyo', 'SAN LUIS': 'cuyo', 'LA RIOJA': 'cuyo',
  NEUQUEN: 'patagonia', 'RIO NEGRO': 'patagonia', CHUBUT: 'patagonia',
  'SANTA CRUZ': 'patagonia', 'TIERRA DEL FUEGO': 'patagonia',
}

const NOMBRE_REGION: Record<string, string> = {
  pampeana: 'la zona núcleo', nea: 'el NEA', noa: 'el NOA', cuyo: 'Cuyo', patagonia: 'la Patagonia',
}

/**
 * Cómo escribe la gente las provincias en un formulario. Sin esto "Bs As" no
 * tenía región y un campo en "Bs As" nunca cruzaba con uno en "Buenos Aires"
 * (revisión del 21-10-2026).
 */
const ALIAS: Record<string, string> = {
  'BS AS': 'BUENOS AIRES', 'BS. AS.': 'BUENOS AIRES', 'BS.AS.': 'BUENOS AIRES', BSAS: 'BUENOS AIRES', PBA: 'BUENOS AIRES',
  'PROVINCIA DE BUENOS AIRES': 'BUENOS AIRES', 'PCIA DE BUENOS AIRES': 'BUENOS AIRES', 'PCIA. DE BUENOS AIRES': 'BUENOS AIRES',
  CABA: 'BUENOS AIRES', 'CAPITAL FEDERAL': 'BUENOS AIRES', 'CIUDAD AUTONOMA DE BUENOS AIRES': 'BUENOS AIRES',
  'STA FE': 'SANTA FE', 'STA. FE': 'SANTA FE', 'SGO DEL ESTERO': 'SANTIAGO DEL ESTERO', 'STGO DEL ESTERO': 'SANTIAGO DEL ESTERO',
  'TIERRA DEL FUEGO, ANTARTIDA E ISLAS DEL ATLANTICO SUR': 'TIERRA DEL FUEGO',
}

/** Provincia normalizada y con los alias resueltos ("Bs As" → "BUENOS AIRES"). */
export function provinciaCanonica(provincia: string | null | undefined): string {
  const n = normalizeGeo(provincia)
  if (ALIAS[n]) return ALIAS[n]
  const sinPrefijo = n.replace(/^(PROVINCIA|PCIA\.?) DEL? /, '')
  return ALIAS[sinPrefijo] ?? sinPrefijo
}

export function regionDe(provincia: string | null | undefined): string | null {
  const p = provinciaCanonica(provincia)
  return p ? REGION[p] ?? null : null
}

/** "el NEA", "la zona núcleo"… — nunca la provincia ni la localidad. */
export function lugarGenerico(provincia: string | null | undefined): string {
  const r = regionDe(provincia)
  return r ? NOMBRE_REGION[r] : 'otra zona'
}

/**
 * Cercanía entre dos provincias. `lejos` es el multiplicador fuera de región:
 * la hacienda viaja (0,4), un campo no se muda (0 = incompatible).
 */
export function cercania(
  a: string | null | undefined,
  b: string | null | undefined,
  lejos: number,
): { f: number; txt: string } | null {
  const pa = provinciaCanonica(a)
  const pb = provinciaCanonica(b)
  if (!pa || !pb) return { f: 0.5, txt: 'falta la provincia de una punta' }
  if (pa === pb) return { f: 1, txt: `misma provincia (${a})` }
  const ra = regionDe(a)
  if (ra && ra === regionDe(b)) return { f: 0.75, txt: `misma región (${a} → ${b})` }
  return lejos > 0 ? { f: lejos, txt: `lejos (${a} → ${b})` } : null
}
