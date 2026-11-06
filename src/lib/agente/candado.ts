/**
 * Candado por corrida del agente (30-10-2026).
 *
 * /api/cron/agente lo llaman GitHub Actions cada 10–30 min y una llamada puede
 * pisarse con otra (dispatch manual, reintento, una corrida lenta). Dos corridas
 * a la vez leen el mismo estado y pueden ofrecerle a la misma firma dos veces en
 * 24 h o pasarse del cupo diario. Con el candado, la segunda sale sin mandar nada.
 *
 * El candado es una fila con vencimiento (supabase/migrations/20261030_agente_candado.sql),
 * no un pg_advisory_lock: por PostgREST cada .rpc() puede ir por otra conexión del
 * pool. Si la corrida muere sin soltarlo, vence solo a los CANDADO_SEGUNDOS.
 *
 * Sin la migración aplicada (la función no existe) la corrida SIGUE, con una nota:
 * es exactamente lo que hacía el agente antes de este cambio, y frenarlo dejaría
 * sin leer los ACEPTO y las BAJAS hasta que alguien aplique la migración. Cualquier
 * otro error (base caída, timeout) NO deja seguir: si no se puede saber si hay otra
 * corrida, no se manda.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const CANDADO_NOMBRE = 'agente'
/** maxDuration de la ruta es 300 s: 10 min cubre una corrida entera con margen. Tope SQL: 15 min. */
export const CANDADO_SEGUNDOS = 600

export type ResultadoCandado =
  | { estado: 'tomado'; duenio: string }
  | { estado: 'ocupado' }
  | { estado: 'sin_migracion'; detalle: string }
  | { estado: 'error'; detalle: string }

interface ErrorRpc {
  code?: string | null
  message?: string | null
}

/** La función no existe todavía: PostgREST (PGRST202) o Postgres (42883). */
export function faltaFuncion(e: ErrorRpc | null | undefined): boolean {
  if (!e) return false
  if (e.code === 'PGRST202' || e.code === '42883') return true
  return /could not find the function|function .* does not exist/i.test(e.message ?? '')
}

type ClienteRpc = Pick<SupabaseClient, 'rpc'>

export async function tomarCandado(db: ClienteRpc, duenio: string = crypto.randomUUID()): Promise<ResultadoCandado> {
  try {
    // El cliente está tipado contra database.types.ts, que todavía no tiene esta función.
    const rpc = db.rpc.bind(db) as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: ErrorRpc | null }>
    const { data, error } = await rpc(
      'agente_tomar_candado',
      { p_nombre: CANDADO_NOMBRE, p_duenio: duenio, p_segundos: CANDADO_SEGUNDOS },
    )
    if (error) {
      if (faltaFuncion(error)) return { estado: 'sin_migracion', detalle: error.message ?? String(error.code) }
      return { estado: 'error', detalle: error.message ?? String(error.code) }
    }
    return data === true ? { estado: 'tomado', duenio } : { estado: 'ocupado' }
  } catch (e) {
    return { estado: 'error', detalle: e instanceof Error ? e.message : String(e) }
  }
}

/** Nunca tira: si no se puede soltar, vence solo. */
export async function soltarCandado(db: ClienteRpc, duenio: string): Promise<void> {
  try {
    const rpc = db.rpc.bind(db) as unknown as (f: string, a: Record<string, unknown>) => Promise<unknown>
    await rpc('agente_soltar_candado', { p_nombre: CANDADO_NOMBRE, p_duenio: duenio })
  } catch {
    /* vence a los CANDADO_SEGUNDOS */
  }
}

/** ¿Esta corrida puede mandar? Solo con el candado en la mano, o sin la migración (comportamiento previo). */
export function puedeCorrer(r: ResultadoCandado): boolean {
  return r.estado === 'tomado' || r.estado === 'sin_migracion'
}
