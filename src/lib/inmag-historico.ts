/**
 * La serie histórica del INMAG: rango, techo gratuito y armado de la respuesta.
 *
 * Vive acá y no dentro del server MCP porque la consumen dos superficies que deben
 * responder EXACTAMENTE lo mismo: la tool `get_inmag_historico` (gratis hasta el techo)
 * y el endpoint pago `/api/x402/inmag-historico` (sin techo). Si el formateo se
 * duplicara, la versión paga se despegaría de la gratis sin que nadie lo note.
 *
 * ── EL TECHO, Y POR QUÉ ESTÁ DONDE ESTÁ ──────────────────────────────────────
 * La serie diaria empalmada Liniers→MAG (2.237 ruedas desde 2015) es el activo:
 * es el gráfico que una consultora agropecuaria compra o dibuja a mano. Todo lo
 * demás del server sigue abierto.
 *
 * El corte va en la VENTANA PEDIDA, no en la antigüedad del dato. Medido sobre las
 * 350 llamadas reales de julio-agosto 2026, un techo de 365 días toca **6 de 350
 * (1,7 %)**: las que piden `dias: 5000`. Las de rango corto no cambian, y la consulta
 * de fecha puntual vieja —`desde=hasta=2020-03-20`, 13 llamadas— sigue pasando gratis,
 * que es lo correcto: un punto suelto es una cita, la serie larga es el producto.
 *
 * Y no niega: RECORTA. Devuelve los últimos 365 días con su análisis completo y dice
 * cuánto quedó atrás y cómo obtenerlo. Es la misma doctrina que el muro de pago del
 * sitio — un muro que no deja ver nada no vende, espanta. La nota además aclara qué
 * sigue siendo gratis, sin lo cual el recorte se lee como "ahora todo es pago".
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const VENTANA_GRATIS_DIAS = 365
export const SERIE_ARRANCA = '2015-01-05'
/** El MAG (Cañuelas) opera desde acá; antes es la era Mercado de Liniers. */
export const MAG_DESDE = '2022-05-17'
export const PRECIO_SERIE_COMPLETA_USD_CENTS = 25

const DIA_MS = 86_400_000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface Rango {
  desde: string
  hasta: string
  label: string
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS)
}

function restarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - dias * DIA_MS).toISOString().slice(0, 10)
}

/**
 * Traduce los args a un rango concreto. `desde`/`hasta` mandan sobre `dias`.
 * Devuelve `{ error }` en vez de tirar: el llamador decide cómo comunicarlo.
 */
export function resolverRango(args: Record<string, unknown>, hoy: string): Rango | { error: string } {
  const pidioFechas = typeof args.desde === 'string' || typeof args.hasta === 'string'
  if (pidioFechas) {
    if (
      (typeof args.desde === 'string' && !ISO_DATE.test(args.desde)) ||
      (typeof args.hasta === 'string' && !ISO_DATE.test(args.hasta))
    ) {
      return { error: 'desde/hasta deben ser fechas YYYY-MM-DD (ej. 2020-03-20).' }
    }
    const desde = typeof args.desde === 'string' ? args.desde : SERIE_ARRANCA
    const hasta = typeof args.hasta === 'string' && args.hasta < hoy ? args.hasta : hoy
    if (desde > hasta) return { error: 'desde no puede ser posterior a hasta.' }
    return { desde, hasta, label: `${desde} → ${hasta}` }
  }
  const dias = Math.min(Math.max(typeof args.dias === 'number' ? args.dias : 30, 2), 5000)
  return { desde: restarDias(hoy, dias), hasta: hoy, label: `últimos ${dias} días` }
}

export interface Recorte {
  /** Lo que pidió el llamador. */
  desdePedido: string
  /** Lo que se le devuelve. */
  desdeServido: string
  diasOcultos: number
}

/**
 * Aplica el techo gratuito. Con `autorizado` (API key Enterprise o pago x402
 * liquidado) devuelve el rango intacto.
 */
export function aplicarTecho(rango: Rango, autorizado: boolean): { rango: Rango; recorte: Recorte | null } {
  if (autorizado) return { rango, recorte: null }
  const pedidos = diasEntre(rango.desde, rango.hasta)
  if (pedidos <= VENTANA_GRATIS_DIAS) return { rango, recorte: null }

  const desdeServido = restarDias(rango.hasta, VENTANA_GRATIS_DIAS)
  return {
    rango: {
      desde: desdeServido,
      hasta: rango.hasta,
      label: `últimos ${VENTANA_GRATIS_DIAS} días`,
    },
    recorte: {
      desdePedido: rango.desde < SERIE_ARRANCA ? SERIE_ARRANCA : rango.desde,
      desdeServido,
      diasOcultos: pedidos - VENTANA_GRATIS_DIAS,
    },
  }
}

/** El texto que explica el recorte. Recorta, no niega — y dice qué sigue gratis. */
export function notaDeRecorte(recorte: Recorte, ruedasOcultas: number | null): string {
  const cuanto = ruedasOcultas != null ? `${ruedasOcultas} ruedas` : `${recorte.diasOcultos} días`
  return (
    `\n\n⚠ Serie recortada al tramo abierto: se devolvieron los últimos ${VENTANA_GRATIS_DIAS} días. ` +
    `Quedan ${cuanto} anteriores, hasta el ${recorte.desdePedido} — la serie empalmada Liniers→MAG.\n` +
    `Para la serie completa: API key Enterprise (https://www.consignatarias.com.ar/planes) o pagá esta ` +
    `misma consulta por US$0,${String(PRECIO_SERIE_COMPLETA_USD_CENTS).padStart(2, '0')} en USDC (red Base) vía x402 — ` +
    `GET https://www.consignatarias.com.ar/api/x402/inmag-historico con los mismos params; cualquier cliente ` +
    `x402-aware (@x402/fetch, etc.) lo resuelve solo.\n` +
    `Sigue gratis y sin cupo: el valor de hoy (get_indice_novillo), la tendencia de hasta ${VENTANA_GRATIS_DIAS} días ` +
    `y cualquier fecha puntual (desde=hasta).`
  )
}

export interface Punto {
  date: string
  valor: number
}

/**
 * Lee la serie del rango, ya convertida a la moneda pedida.
 *
 * Pagina a mano: PostgREST capea cada request a 1.000 filas y no avisa — sin esto
 * una ventana larga devuelve la serie truncada (2015→2019) como si fuera completa.
 */
export async function leerSerie(
  service: SupabaseClient,
  rango: Rango,
  moneda: 'ars' | 'usd',
): Promise<{ rows: Punto[] } | { error: string }> {
  const PAGE = 1000
  const all: Array<{ date: string; inmag_value: number | null }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await service
      .from('mag_inmag_history')
      .select('date, inmag_value')
      .gte('date', rango.desde)
      .lte('date', rango.hasta)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return { error: 'Error leyendo el histórico INMAG.' }
    all.push(...((data || []) as Array<{ date: string; inmag_value: number | null }>))
    if (!data || data.length < PAGE) break
  }
  let rows: Punto[] = (all.filter((r) => r.inmag_value != null) as Array<{ date: string; inmag_value: number }>).map(
    (r) => ({ date: r.date, valor: Number(r.inmag_value) }),
  )
  if (rows.length === 0) return { rows }

  if (moneda === 'usd') {
    // Dólar blue venta, último valor conocido a cada fecha (forward-fill): la misma
    // regla que /mercado/inmag-dolares y las alertas. El margen de 14 días hacia atrás
    // asegura que la primera rueda tenga una cotización previa de la cual colgarse.
    const margen = restarDias(rango.desde, 14)
    const blues: Array<{ date: string; venta: number }> = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await service
        .from('usd_blue_history')
        .select('date, venta')
        .gte('date', margen)
        .lte('date', rango.hasta)
        .not('venta', 'is', null)
        .order('date', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) return { error: 'Error leyendo la serie del dólar blue.' }
      blues.push(...((data || []) as Array<{ date: string; venta: number }>))
      if (!data || data.length < PAGE) break
    }
    if (blues.length === 0) return { error: 'Sin cotización blue para el rango pedido.' }
    let bi = 0
    rows = rows.flatMap((r) => {
      while (bi + 1 < blues.length && blues[bi + 1].date <= r.date) bi++
      const blue = blues[bi].date <= r.date ? Number(blues[bi].venta) : null
      return blue && blue > 0 ? [{ date: r.date, valor: Math.round((r.valor / blue) * 100) / 100 }] : []
    })
  }
  return { rows }
}

/** Cuántas ruedas quedaron fuera del recorte — para que la nota diga un número real. */
export async function contarRuedasOcultas(service: SupabaseClient, recorte: Recorte): Promise<number | null> {
  const { count, error } = await service
    .from('mag_inmag_history')
    .select('date', { count: 'exact', head: true })
    .gte('date', recorte.desdePedido)
    .lt('date', recorte.desdeServido)
    .not('inmag_value', 'is', null)
  return error ? null : (count ?? null)
}

export interface SerieFormateada {
  texto: string
  data: Record<string, unknown>
}

/** El texto y el JSON de la respuesta. Idéntico en la tool gratis y en la paga. */
export function formatearSerie(
  rows: Punto[],
  rango: Rango,
  moneda: 'ars' | 'usd',
  fmtArs: (v: number) => string,
): SerieFormateada {
  const vals = rows.map((r) => r.valor)
  const first = vals[0]
  const last = vals[vals.length - 1]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0
  const unidad = moneda === 'usd' ? 'USD/kg vivo (blue)' : 'ARS/kg vivo'
  const fmtVal = (v: number) => (moneda === 'usd' ? `US$ ${v.toFixed(2)}` : fmtArs(v))

  const step = Math.max(1, Math.floor(rows.length / 8))
  const sample = rows.filter((_, i) => i % step === 0 || i === rows.length - 1)

  // Un agente no debe citar "INMAG 2020" sin saber que era otra institución.
  const cruzaEra = rows[0].date < MAG_DESDE
  const notaEra = cruzaEra
    ? `\n\n⚠ Nota metodológica: los valores anteriores al ${MAG_DESDE} corresponden a la era Mercado de Liniers (el MAG de Cañuelas opera desde esa fecha). Serie empalmada, misma metodología de índice diario ponderado por volumen. Citar como "índice novillo (Liniers/MAG)" para rangos que cruzan esa frontera.`
    : ''
  const notaUsd =
    moneda === 'usd'
      ? `\n\nConversión USD: dólar blue venta, último valor conocido a cada fecha (fuente usd_blue_history, serie 2011→).`
      : ''

  const data: Record<string, unknown> = {
    desde: rows[0].date,
    hasta: rows[rows.length - 1].date,
    moneda,
    unidad,
    inicio: first,
    fin: last,
    change_pct: Math.round(changePct * 10) / 10,
    min,
    max,
    ruedas: rows.length,
    ...(cruzaEra ? { era_liniers_hasta: MAG_DESDE } : {}),
  }

  const texto =
    `INMAG — ${rango.label} (${rows.length} ruedas, ${unidad})\n` +
    `Inicio (${rows[0].date}): ${fmtVal(first)} → Fin (${rows[rows.length - 1].date}): ${fmtVal(last)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%)\n` +
    `Mínimo: ${fmtVal(min)} · Máximo: ${fmtVal(max)}\n\nSerie:\n` +
    sample.map((r) => `  ${r.date}: ${fmtVal(r.valor)}`).join('\n') +
    notaEra +
    notaUsd

  return { texto, data }
}
