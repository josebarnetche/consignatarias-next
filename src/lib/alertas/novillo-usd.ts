import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * novillo-usd.ts — la alerta que casi nunca suena.
 *
 * POR QUÉ ESTA Y NO OTRA
 * En este sitio ya existe una feature de alertas de precio configurables: **0 de 48
 * usuarios creó una**. La diferencia acá es que el umbral no lo pone el usuario. Lo
 * ponemos nosotros, lo publicamos, lo backtesteamos y decimos de antemano cuántas veces al
 * año va a sonar. El productor no tiene que decidir si 12 % es mucho o poco.
 *
 * LA REGLA
 * Suena cuando el promedio de las últimas 20 ruedas del novillo medido en dólares se
 * aparta más de ±12 % del promedio de las 20 ruedas inmediatamente anteriores. Después de
 * sonar, calla 30 días.
 *
 * POR QUÉ 20 RUEDAS Y NO 5
 * Se probó primero media de 5 contra media de 20: con ±5 % habría sonado 86 veces por año.
 * Una alerta que suena tres veces por mes no es una alerta, es ruido con permiso de entrar
 * al mail. Veinte ruedas son ~un mes de mercado y los dos bloques no se pisan, así que la
 * regla compara "el mes contra el mes anterior" y no reacciona a una rueda floja.
 *
 * BACKTEST sobre la serie completa 2015-2026 (1.729 ruedas, verificado el 30-ago-2026
 * corriendo la regla completa día por día): **46 disparos en 11,6 años = 4,0 por año**.
 *
 * Ojo con cómo se cuenta. Contar "meses con señal" da 59 de 137 (5,2 al año) y
 * sobrestima: un mes puede cruzar el umbral estando en silencio, y ese cruce no es un
 * disparo. El número que se le promete al suscriptor es el de disparos reales, no el de
 * cruces.
 */

/** Ruedas que promedia cada bloque. ~un mes de mercado. */
export const VENTANA = 20

/** Apartamiento mínimo entre bloques para que suene. */
export const UMBRAL = 0.12

/** Días de silencio obligado después de sonar. */
export const COOLDOWN_DIAS = 30

export interface PuntoUsd {
  date: string
  /** Novillo en dólares por kilo vivo. */
  usdKg: number
}

export interface Evaluacion {
  /** Promedio de las últimas 20 ruedas. */
  actual: number
  /** Promedio de las 20 anteriores a ésas. */
  previo: number
  /** Apartamiento relativo. −0,14 = bajó 14 %. */
  delta: number
  /** true si el apartamiento supera el umbral. NO contempla el cooldown. */
  cruzaUmbral: boolean
  /** Fecha de la última rueda considerada. */
  hasta: string
  /** Ruedas usadas. Menos de 40 y no se puede evaluar. */
  ruedas: number
}

/**
 * Evalúa la serie. Función pura: no sabe de la base ni del cooldown, así que se puede
 * correr sobre cualquier tramo histórico para verificar la regla.
 *
 * Devuelve `null` si no hay 40 ruedas: sin los dos bloques completos no hay comparación
 * posible, y estimar con menos sería inventar una señal.
 */
export function evaluar(serie: PuntoUsd[], ventana = VENTANA, umbral = UMBRAL): Evaluacion | null {
  if (serie.length < ventana * 2) return null

  const ordenada = [...serie].sort((a, b) => a.date.localeCompare(b.date))
  const fin = ordenada.slice(-ventana)
  const ini = ordenada.slice(-ventana * 2, -ventana)

  const prom = (xs: PuntoUsd[]) => xs.reduce((s, p) => s + p.usdKg, 0) / xs.length
  const actual = prom(fin)
  const previo = prom(ini)
  if (!previo) return null

  const delta = (actual - previo) / previo

  return {
    actual,
    previo,
    delta,
    cruzaUmbral: Math.abs(delta) > umbral,
    hasta: fin[fin.length - 1].date,
    ruedas: ordenada.length,
  }
}

/**
 * Serie del novillo en dólares.
 *
 * El dólar se toma de la última cotización **anterior o igual** a la rueda: el MAG opera
 * días que el mercado cambiario no, y buscar coincidencia exacta de fecha perdería la
 * mitad de los puntos.
 *
 * ⚠️ PostgREST corta en 1.000 filas y `.limit()` no lo evita — la serie tiene 2.275 filas
 * y 5.683 de dólar, así que se pagina con `.range()`. Este bug ya dio números falsos en
 * este proyecto.
 */
export async function construirSerieUsd(
  db: SupabaseClient,
  opts: { desde?: string } = {},
): Promise<PuntoUsd[]> {
  const desde = opts.desde ?? '2015-01-01'

  const inmag = await traerTodo<{ date: string; inmag_value: number | null }>(
    db,
    'mag_inmag_history',
    'date, inmag_value',
    desde,
  )
  const usd = await traerTodo<{ date: string; venta: number | null }>(
    db,
    'usd_blue_history',
    'date, venta',
    desde,
  )

  const cotiz = usd
    .filter((u) => (u.venta ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  const out: PuntoUsd[] = []
  let i = 0
  let ultima = 0

  for (const p of inmag.sort((a, b) => a.date.localeCompare(b.date))) {
    if (!p.inmag_value || p.inmag_value <= 0) continue
    // Avanza el puntero del dólar hasta la última cotización <= la fecha de la rueda.
    while (i < cotiz.length && cotiz[i].date <= p.date) {
      ultima = cotiz[i].venta!
      i++
    }
    if (ultima > 0) out.push({ date: p.date, usdKg: p.inmag_value / ultima })
  }

  return out
}

async function traerTodo<T>(
  db: SupabaseClient,
  tabla: string,
  columnas: string,
  desde: string,
): Promise<T[]> {
  const PAGINA = 1000
  const out: T[] = []
  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await db
      .from(tabla)
      .select(columnas)
      .gte('date', desde)
      .order('date', { ascending: true })
      .range(offset, offset + PAGINA - 1)
    if (error) throw new Error(`[novillo-usd] ${tabla}: ${error.message}`)
    const pagina = (data ?? []) as T[]
    out.push(...pagina)
    if (pagina.length < PAGINA) break
  }
  return out
}

/** ¿Pasó el silencio obligado desde el último disparo? */
export function fueraDeCooldown(ultimoDisparo: string | null, hoy = new Date()): boolean {
  if (!ultimoDisparo) return true
  const dias = (hoy.getTime() - new Date(ultimoDisparo).getTime()) / 86_400_000
  return dias >= COOLDOWN_DIAS
}

/**
 * El texto de la alerta.
 *
 * Dice lo que pasó y —tan importante como eso— **lo que la alerta no dice**. Sin ese
 * párrafo, un mail que avisa que el novillo se movió 12 % se lee como una recomendación de
 * vender, y no lo es.
 */
export function redactar(e: Evaluacion, ultimoDisparo: string | null): { asunto: string; cuerpo: string } {
  const dir = e.delta >= 0 ? 'subió' : 'bajó'
  const pctStr = `${Math.abs(e.delta * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`
  const desde = ultimoDisparo
    ? `La última vez fue el ${new Date(ultimoDisparo).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}.`
    : 'Es la primera vez desde que empezamos a medirlo.'

  return {
    asunto: `El novillo en dólares ${dir} ${pctStr} en un mes`,
    cuerpo: [
      `El promedio de las últimas ${VENTANA} ruedas es de USD ${e.actual.toFixed(2)} por kilo vivo. El de las ${VENTANA} ruedas anteriores era USD ${e.previo.toFixed(2)}. La diferencia es de ${e.delta >= 0 ? '+' : '−'}${pctStr}.`,
      `Te escribimos porque esto pasa unas cuatro veces por año. ${desde}`,
      `Lo que esta alerta NO dice: si esto sigue, si conviene vender, o si tu categoría se movió igual. El índice es el novillo del Mercado de Cañuelas, que es mercado de gordo y mayormente pampeano.`,
    ].join('\n\n'),
  }
}
