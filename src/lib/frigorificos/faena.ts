/**
 * ¿Esta planta puede faenar bovinos hoy?
 *
 * Es la única pregunta que importa antes de mandarle un productor con hacienda
 * en pie, y hasta ahora la respondíamos por inferencia: "figura en el padrón" +
 * "es ciclo I". Las dos fallan.
 *
 *  - Brekan (mat. 1974) figura en el padrón y es ciclo I, así que pasaba los dos
 *    filtros. Pero el establecimiento está TRANSFERIDO y su rubro de faena
 *    bovina está SUSPENDIDO: no faena. La consulta que le mandamos no tenía
 *    destino.
 *  - Vicentin Faenas figura vigente y cerró en diciembre de 2017.
 *
 * El registro APS2 de SENASA publica el estado de CADA rubro, y ahí sí está la
 * respuesta. `scripts/scrapers/senasa-aps2.mjs` lo releva.
 *
 * REGLA: la ausencia de dato NO es un "no". Sólo relevamos las plantas de ciclo
 * I; de las demás no sabemos nada y devolvemos `null`, que el que llama tiene
 * que tratar como "no me consta", nunca como "no habilitada". Dejar de rutear a
 * una planta que sí faena es tan caro como rutear a una que no.
 */

import rubrosData from '@/lib/data/senasa-rubros.json'

export interface RubroSenasa {
  rubro: string
  estado: string
}

export interface PlantaSenasa {
  matricula: string
  razonSocial: string | null
  estado: string | null
  faenaBovinaHabilitada: boolean
  estadoFaenaBovina: string | null
  rubros: RubroSenasa[]
  relevadoEl: string
  error?: string
}

interface Archivo {
  generadoEl: string
  fuente: string
  plantas: PlantaSenasa[]
}

const archivo = rubrosData as unknown as Archivo

const porMatricula = new Map<string, PlantaSenasa>(
  (archivo.plantas || []).filter((p) => !p.error).map((p) => [String(p.matricula), p]),
)

/** El relevamiento de esta planta, o null si nunca la relevamos. */
export function plantaSenasa(matricula: string | number | null | undefined): PlantaSenasa | null {
  if (matricula === null || matricula === undefined) return null
  return porMatricula.get(String(matricula)) ?? null
}

/**
 * `true` habilitada, `false` relevada y NO habilitada, `null` sin dato.
 * El null es importante: no lo colapses a false.
 */
export function puedeFaenarBovinos(matricula: string | number | null | undefined): boolean | null {
  const p = plantaSenasa(matricula)
  if (!p) return null
  return p.faenaBovinaHabilitada
}

/** Frase corta para explicarle a una persona por qué no la ofrecemos. */
export function motivoNoFaena(matricula: string | number | null | undefined): string | null {
  const p = plantaSenasa(matricula)
  if (!p || p.faenaBovinaHabilitada) return null
  if (p.estadoFaenaBovina) {
    return `el rubro de faena bovina figura ${p.estadoFaenaBovina.toLowerCase()} en el registro de SENASA`
  }
  return 'no tiene habilitado el rubro de faena bovina en el registro de SENASA'
}

/** Fecha del relevamiento, para poder citarla. */
export const RELEVADO_EL = archivo.generadoEl?.slice(0, 10) ?? null
