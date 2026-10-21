/**
 * La vista "por tipo de operación" de /admin/agente: cuántos leads abiertos hay
 * de cada tipo, cuánto valen de referencia, cuánta comisión dejarían y si el
 * agente los puede trabajar hoy. Puro: el tablero le pasa los leads y la función
 * que los valúa.
 *
 * La pregunta que contesta: ¿dónde está la plata que el agente todavía no toca, y
 * qué la frena? (una decisión de José, un bloqueo legal o nada).
 */
import tierra from '@/lib/data/tierra-por-kilo.json'
import { TIPOS, enviaAContrapartes, tieneComision, tipoDeIntent, type TipoOperacion, type Valuacion } from './tipos'

export type EstadoEnvio = 'sale' | 'bloqueo_legal' | 'sin_comision' | 'sin_contraparte'

export interface FilaTipo {
  tipo: TipoOperacion
  label: string
  leads: number
  enAgente: number
  brutoArs: number
  comisionArs: number
  sinEstimar: number
  envio: EstadoEnvio
  /** Por qué no sale, en una línea (vacío si sale). */
  motivo: string
}

export function estadoEnvio(tipo: TipoOperacion): { envio: EstadoEnvio; motivo: string } {
  if (enviaAContrapartes(tipo)) return { envio: 'sale', motivo: '' }
  const c = TIPOS[tipo]
  if (c.bloqueoLegal) return { envio: 'bloqueo_legal', motivo: c.bloqueoLegal }
  if (!tieneComision(tipo)) return { envio: 'sin_comision', motivo: c.baseComision }
  return { envio: 'sin_contraparte', motivo: 'no tiene contrapartes definidas' }
}

export interface LeadAbierto {
  id: number
  intent: string
  province?: string | null
}

const ORDEN: TipoOperacion[] = ['hacienda', 'arrendamiento', 'campo', 'tasacion']

/** Filas por tipo, en orden fijo, solo los tipos con al menos un lead. */
export function resumenPorTipo(
  leads: readonly LeadAbierto[],
  enAgente: ReadonlySet<number>,
  valuar: (l: LeadAbierto) => Valuacion | null,
): FilaTipo[] {
  const acc = new Map<TipoOperacion, FilaTipo>()
  for (const l of leads) {
    const tipo = tipoDeIntent(l.intent)
    if (!tipo) continue
    const f =
      acc.get(tipo) ??
      ({ tipo, label: TIPOS[tipo].label, leads: 0, enAgente: 0, brutoArs: 0, comisionArs: 0, sinEstimar: 0, ...estadoEnvio(tipo) } as FilaTipo)
    f.leads++
    if (enAgente.has(l.id)) f.enAgente++
    const v = valuar(l)
    if (v?.brutoArs) f.brutoArs += v.brutoArs
    else f.sinEstimar++
    if (v?.comisionArs) f.comisionArs += v.comisionArs
    acc.set(tipo, f)
  }
  return ORDEN.filter((t) => acc.has(t)).map((t) => acc.get(t)!)
}

interface FilaTierra {
  provincia: string
  zona: string | null
  kg_ha_mes_canon: number | null
}

/**
 * Canon típico en kg de novillo/ha/mes para una provincia, del relevamiento propio
 * (`tierra-por-kilo.json`): la fila de la provincia si la hay, si no la mediana del
 * país. Es una referencia para estimar, no el canon de ningún campo.
 */
export function kgHaMesTipico(provincia: string | null | undefined, filas: readonly FilaTierra[] = tierra as FilaTierra[]): number {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const p = provincia ? norm(provincia) : ''
  const deProv = filas.filter((f) => f.kg_ha_mes_canon && norm(f.provincia) === p)
  const fila = deProv.find((f) => !f.zona) ?? deProv[0]
  if (fila?.kg_ha_mes_canon) return fila.kg_ha_mes_canon
  const todos = filas.map((f) => f.kg_ha_mes_canon).filter((n): n is number => !!n).sort((a, b) => a - b)
  return todos.length ? todos[Math.floor(todos.length / 2)] : 0
}
