/**
 * En qué orden mira el agente los casos de cada corrida.
 *
 * Hay un tope de contactos nuevos por día (MAX_CONTACTOS_NUEVOS_DIA). Si la cola
 * va por antigüedad, ese cupo se lo comen los casos más viejos aunque valgan poco.
 * Ordenar por plata esperada (comisión estimada × peso de la etapa, `tipos.ts`)
 * hace que el cupo vaya primero a lo que más puede dejar. Entre dos casos con la
 * misma prioridad manda el más vencido, como antes.
 *
 * El orden no cambia QUÉ se hace con cada caso ni saltea ninguna regla de envío:
 * solo decide quién va primero.
 */
import { PESO_ESTADO } from './tipos'

export interface CasoEnCola {
  lead_id: number
  estado: string
  proximo_at: string
}

/** Prioridad de un caso: comisión estimada × peso de su etapa. 0 si no se puede estimar. */
export function prioridadCaso(comisionArs: number | null | undefined, estado: string): number {
  if (!comisionArs || comisionArs <= 0) return 0
  return Math.round(comisionArs * (PESO_ESTADO[estado] ?? 0))
}

/**
 * Cola ordenada: más prioridad primero; a igual prioridad, el más vencido.
 * `comision` recibe el caso y devuelve su comisión estimada (o null).
 * No muta el arreglo de entrada.
 */
export function ordenarCola<T extends CasoEnCola>(casos: readonly T[], comision: (c: T) => number | null): T[] {
  return casos
    .map((c, i) => ({ c, i, p: prioridadCaso(comision(c), c.estado), t: Date.parse(c.proximo_at) || 0 }))
    .sort((a, b) => b.p - a.p || a.t - b.t || a.i - b.i)
    .map((x) => x.c)
}
