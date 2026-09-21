/**
 * El mail de los lunes de Mi Ganado: el Valor de Referencia del rodeo y cuánto se movió
 * en la semana.
 *
 * Por qué existe: desde mayo la página ofrecía "Avisame cada lunes cuánto vale mi
 * hacienda" y guardaba el opt-in (`user_ganado.alerts_opt_in`), pero el envío nunca se
 * construyó — ningún cron leía esa columna (verificado el 21-sep-2026 con grep sobre
 * src/app/api). Al 21-sep había 3 usuarios anotados a un mail que no existía. Prometer y
 * no entregar es peor que no pedir.
 *
 * Todo lo que sale en el mail se RECALCULA en el momento: el valor con la banda vigente
 * (lib/rodeo-vr.ts) y la variación semanal con la serie del rodeo actual contra el INMAG
 * (lib/ganado-historial.ts). No se usa `ganado_value_snapshots`.
 */
import type { PuntoHistorial } from '@/lib/ganado-historial'
import type { RodeoValuado } from '@/lib/rodeo-vr'

export interface ResumenSemanal {
  asunto: string
  central: number
  conservador: number
  optimista: number
  /** Variación del mismo rodeo en los últimos 7 días, movido con el INMAG. null si no hay serie. */
  cambioSemanaPct: number | null
  valuadoCabezas: number
  sinValuarCabezas: number
  fechaDato: string
}

/** Variación entre el último punto y el último punto de hace 7 días o más. */
export function cambioUltimaSemana(serie: PuntoHistorial[]): number | null {
  if (serie.length < 2) return null
  const ultimo = serie[serie.length - 1]
  const corte = new Date(Date.parse(`${ultimo.fecha}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10)
  let previo: PuntoHistorial | null = null
  for (const p of serie) {
    if (p.fecha <= corte) previo = p
    else break
  }
  if (!previo || !(previo.ars > 0)) return null
  return ((ultimo.ars - previo.ars) / previo.ars) * 100
}

const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

/**
 * Arma el resumen. Devuelve null cuando no hay nada honesto que mandar: un rodeo sin
 * ningún lote con referencia observada no recibe un mail con un número inventado.
 */
export function armarResumenSemanal(rodeo: RodeoValuado, serie: PuntoHistorial[]): ResumenSemanal | null {
  if (!rodeo.total) return null
  const cambio = cambioUltimaSemana(serie)
  const tendencia =
    cambio == null ? '' : Math.abs(cambio) < 0.05 ? ' · sin cambios en la semana' : ` · ${cambio > 0 ? '+' : ''}${cambio.toFixed(1).replace('.', ',')} % en la semana`
  return {
    asunto: `Tu rodeo vale ${ars(rodeo.total.central)}${tendencia}`,
    central: rodeo.total.central,
    conservador: rodeo.total.conservador,
    optimista: rodeo.total.optimista,
    cambioSemanaPct: cambio,
    valuadoCabezas: rodeo.valuado.cabezas,
    sinValuarCabezas: rodeo.sinValuar.cabezas,
    fechaDato: rodeo.fecha_dato,
  }
}
