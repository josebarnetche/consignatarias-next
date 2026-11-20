/**
 * Qué rueda del MAG le toca a una corrida del pipeline de lotes (mag-lots-worker).
 *
 * Vive fuera de `route.ts` a propósito: Next rechaza exports que no sean de ruta
 * (GET/POST/runtime...) en un route handler, y esto tiene que poder testearse puro.
 */

const TZ_BA = 'America/Argentina/Buenos_Aires'

/** Antes de esta hora de BA, una corrida "de hoy" es en realidad la atrasada de ayer. */
export const HORA_CORTE_RUEDA = 12

/** Ventana del autocurado: cuántos días hacia atrás (contando la rueda) se revisan. */
export const VENTANA_AUTOCURADO_DIAS = 7

/**
 * Un día con lotes cargados que no llegan a esta fracción de las cabezas del INMAG
 * se considera FALTANTE. El mínimo sano medido (oct-nov 2026) fue 25% (09/10: 352
 * de 1.392); los faltantes dan 0% o un residuo de 1 cabeza (18/11: 1 de 3.985).
 * Con "cero lotes" a secas el 18/11 no se habría curado nunca.
 */
export const FRACCION_MINIMA_LOTES = 0.1

/** Fecha (YYYY-MM-DD) y hora (0-23) en Buenos Aires de un instante. */
function partesBA(now: Date): { iso: string; hora: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_BA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return { iso: `${v('year')}-${v('month')}-${v('day')}`, hora: parseInt(v('hour'), 10) }
}

/** Resta `n` días a una fecha ISO de calendario (sin zona: aritmética en UTC). */
export function restarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

/**
 * La rueda que corresponde a una corrida que arranca en `now`.
 *
 * El workflow está agendado 19:42 ART, pero GitHub lo retrasa de 2 a más de 5 horas
 * (medido nov-2026: hasta 5h09). El arreglo de septiembre pasó la fecha de UTC a BA,
 * lo que cubría atrasos hasta medianoche ART; pasada la medianoche la corrida encolaba
 * el día SIGUIENTE —sin rueda— y los 128 jobs quedaban `done` con cero filas
 * (05, 11, 12, 17 y 18/11: 41,5% de las cabezas del mes sin lotes).
 *
 * Regla: si en BA es antes del mediodía, nadie está corriendo la rueda de hoy (el MAG
 * todavía no la publicó): es la corrida de ayer que llegó tarde.
 */
export function fechaDeRueda(now: Date): string {
  const { iso, hora } = partesBA(now)
  return ultimoDiaHabil(hora < HORA_CORTE_RUEDA ? restarDias(iso, 1) : iso)
}

/** 0 = domingo … 6 = sábado, de una fecha ISO de calendario. */
function diaDeSemana(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * El MAG no tiene rueda sábado ni domingo: una corrida que caiga ahí (manual, o un
 * atraso que cruce el viernes a la madrugada del sábado pasado el mediodía) encola el
 * viernes. Los feriados NO se modelan acá: un feriado no tiene INMAG, sus jobs quedan
 * `done` con 0 filas y el autocurado nunca los reintenta (solo cura días con INMAG).
 */
export function ultimoDiaHabil(iso: string): string {
  const wd = diaDeSemana(iso)
  if (wd === 6) return restarDias(iso, 1)
  if (wd === 0) return restarDias(iso, 2)
  return iso
}

/**
 * Días hábiles (lun-vie) que pasaron DESPUÉS de `desde` hasta `hasta` inclusive.
 * Ej.: viernes 13 → martes 17 = 2 (lun 16 y mar 17). Lo usa la alerta de frescura
 * de la banda (scripts/check-vr-bandas-freshness.mjs replica la regla sin deps).
 */
export function diasHabilesEntre(desde: string, hasta: string): number {
  let n = 0
  let d = desde
  while (d < hasta) {
    d = restarDias(d, -1)
    const wd = diaDeSemana(d)
    if (wd !== 0 && wd !== 6) n++
  }
  return n
}

export interface DiaInmag {
  date: string
  head_count: number | null
}

export interface DiaFaltante {
  date: string
  inmag_cabezas: number
  lotes_cabezas: number
}

/**
 * De los días con INMAG, cuáles tienen lotes faltantes.
 * `lotesPorFecha` = cabezas sumadas de `mag_consignataria_sales_lots` (ausente = 0).
 */
export function diasConLotesFaltantes(
  inmag: DiaInmag[],
  lotesPorFecha: Record<string, number>,
): DiaFaltante[] {
  const out: DiaFaltante[] = []
  for (const d of inmag) {
    const cab = d.head_count ?? 0
    if (cab <= 0) continue
    const lotes = lotesPorFecha[d.date] ?? 0
    if (lotes < cab * FRACCION_MINIMA_LOTES) {
      out.push({ date: d.date, inmag_cabezas: cab, lotes_cabezas: lotes })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
