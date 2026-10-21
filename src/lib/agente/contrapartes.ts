/**
 * A quién se le ofrece cada caso. Puro: recibe las listas ya cargadas y devuelve
 * el orden. La carga desde la base vive en `motor.ts`.
 *
 * Criterio, en este orden:
 *  1. La misma provincia, después las limítrofes. El flete se come el margen: una
 *     planta de Mendoza no le compra novillos a un productor de Misiones.
 *  2. Un frigorífico solo recibe hacienda para faena (`vaAFaena`) y solo si SENASA
 *     no dice que su faena bovina está suspendida. Las que la base marca como
 *     porcino, caprino o que no compran en pie quedan afuera.
 *  3. Un lead que compra es la mejor contraparte: ya dijo que quiere.
 */
import { vaAFaena, type DatosHacienda, type Lado, type TipoContraparte } from './reglas'

const LIMITROFES: Record<string, string[]> = {
  'BUENOS AIRES': ['CABA', 'ENTRE RIOS', 'SANTA FE', 'CORDOBA', 'LA PAMPA', 'RIO NEGRO'],
  CABA: ['BUENOS AIRES'],
  CATAMARCA: ['TUCUMAN', 'SALTA', 'SANTIAGO DEL ESTERO', 'CORDOBA', 'LA RIOJA'],
  CHACO: ['FORMOSA', 'CORRIENTES', 'SANTA FE', 'SANTIAGO DEL ESTERO', 'SALTA'],
  CHUBUT: ['RIO NEGRO', 'SANTA CRUZ'],
  CORDOBA: ['SANTA FE', 'BUENOS AIRES', 'LA PAMPA', 'SAN LUIS', 'LA RIOJA', 'CATAMARCA', 'SANTIAGO DEL ESTERO'],
  CORRIENTES: ['MISIONES', 'ENTRE RIOS', 'CHACO', 'SANTA FE', 'FORMOSA'],
  'ENTRE RIOS': ['CORRIENTES', 'SANTA FE', 'BUENOS AIRES'],
  FORMOSA: ['CHACO', 'SALTA', 'CORRIENTES'],
  JUJUY: ['SALTA'],
  'LA PAMPA': ['BUENOS AIRES', 'CORDOBA', 'SAN LUIS', 'MENDOZA', 'NEUQUEN', 'RIO NEGRO'],
  'LA RIOJA': ['CATAMARCA', 'CORDOBA', 'SAN LUIS', 'SAN JUAN'],
  MENDOZA: ['SAN JUAN', 'SAN LUIS', 'LA PAMPA', 'NEUQUEN'],
  MISIONES: ['CORRIENTES'],
  NEUQUEN: ['MENDOZA', 'LA PAMPA', 'RIO NEGRO'],
  'RIO NEGRO': ['NEUQUEN', 'LA PAMPA', 'BUENOS AIRES', 'CHUBUT'],
  SALTA: ['JUJUY', 'FORMOSA', 'CHACO', 'SANTIAGO DEL ESTERO', 'TUCUMAN', 'CATAMARCA'],
  'SAN JUAN': ['LA RIOJA', 'SAN LUIS', 'MENDOZA'],
  'SAN LUIS': ['CORDOBA', 'LA PAMPA', 'MENDOZA', 'SAN JUAN', 'LA RIOJA'],
  'SANTA CRUZ': ['CHUBUT', 'TIERRA DEL FUEGO'],
  'SANTA FE': ['CORDOBA', 'BUENOS AIRES', 'ENTRE RIOS', 'CORRIENTES', 'CHACO', 'SANTIAGO DEL ESTERO'],
  'SANTIAGO DEL ESTERO': ['SALTA', 'CHACO', 'SANTA FE', 'CORDOBA', 'CATAMARCA', 'TUCUMAN'],
  'TIERRA DEL FUEGO': ['SANTA CRUZ'],
  TUCUMAN: ['SALTA', 'SANTIAGO DEL ESTERO', 'CATAMARCA'],
}

/** "Entre Ríos", "ENTRE RIOS", "Ciudad Autónoma de Buenos Aires" → clave del mapa. */
export function claveProvincia(p: string | null | undefined): string {
  const t = (p ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return ''
  if (/CIUDAD AUTONOMA|^CAP(ITAL)? FED|^C\.?A\.?B\.?A\.?$/.test(t)) return 'CABA'
  if (t.startsWith('PROVINCIA DE ')) return t.slice(13)
  return t
}

/** 0 = misma provincia, 1 = limítrofe, null = lejos. */
export function distanciaProvincia(a: string | null | undefined, b: string | null | undefined): 0 | 1 | null {
  const ka = claveProvincia(a)
  const kb = claveProvincia(b)
  if (!ka || !kb) return null
  if (ka === kb) return 0
  if (LIMITROFES[ka]?.includes(kb) || LIMITROFES[kb]?.includes(ka)) return 1
  return null
}

export interface Candidato {
  tipo: TipoContraparte
  ref: string
  nombre: string
  email: string
  provincia: string | null
  /** Solo frigoríficos: false = SENASA dice que no faena bovinos; null = no consta. */
  faenaBovina?: boolean | null
  /** Solo frigoríficos: notas internas de la base (ahí dice "PORCINO", "no compra"...). */
  notas?: string | null
  opera?: boolean | null
  /** Solo firmas: si es PRO. Las demás solo reciben pedidos de compra (José, 21-10). */
  pro?: boolean
  /** Solo leads: qué categoría y cuántas cabezas busca o tiene. */
  categoria?: string | null
  cabezas?: number | null
  /** Solo leads: de qué lado está (un vendedor no se le ofrece a otro vendedor). */
  lado?: Lado
}

/** Las notas de la base que dicen, en castellano, que no hay que mandarle hacienda. */
const NO_DERIVAR = /(porcino|cerdo|caprino|ovino|no compra|no es frigor[ií]fico|no bovino|suspendid|cerr[oó]|deudor)/i

function mismaCategoria(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true
  const raiz = (s: string) => s.toLowerCase().replace(/(es|s)$/, '').slice(0, 6)
  return raiz(a) === raiz(b)
}

/**
 * Candidatos en orden, sin los ya consultados ni los dados de baja.
 * Para quien VENDE: leads que compran, frigoríficos (si es hacienda de faena), firmas.
 * Para quien COMPRA: leads que venden y firmas (un frigorífico no vende hacienda en pie).
 */
export function elegirContrapartes(opts: {
  lado: Lado
  datos: DatosHacienda
  candidatos: Candidato[]
  yaConsultados: Set<string>
  bajas: Set<string>
  cuantos: number
}): Candidato[] {
  const { lado, datos, cuantos } = opts
  const provincia = datos.provincia ?? datos.zona ?? null
  const faena = vaAFaena(datos.categoria)
  const vistos = new Set<string>()

  const aptos = opts.candidatos.filter((c) => {
    const email = c.email.trim().toLowerCase()
    if (!email || opts.bajas.has(email) || vistos.has(email)) return false
    if (opts.yaConsultados.has(`${c.tipo}:${c.ref}`)) return false
    if (c.tipo === 'frigorifico') {
      if (lado !== 'vende' || !faena) return false
      if (c.opera === false || c.faenaBovina === false) return false
      if (c.notas && NO_DERIVAR.test(c.notas)) return false
    }
    if (c.tipo === 'lead' && !mismaCategoria(datos.categoria, c.categoria)) return false
    if (distanciaProvincia(provincia, c.provincia) === null) return false
    vistos.add(email)
    return true
  })

  const peso = (c: Candidato) => {
    const tipo = c.tipo === 'lead' ? 0 : c.tipo === 'frigorifico' ? 1 : 2
    return (distanciaProvincia(provincia, c.provincia) ?? 2) * 10 + tipo
  }
  return aptos.sort((a, b) => peso(a) - peso(b)).slice(0, cuantos)
}
