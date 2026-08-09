import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import { logEvent } from '@/lib/ops'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import frigorificosData from '@/lib/data/frigorificos.json'
import { isValidCategory, categoryLabel, getCurrentPrice, CATEGORY_VALUES } from '@/lib/price-alerts'
import {
  SANIDAD_DISCLAIMER, PLANES, CALENDARIO_AFTOSA_2026, REQUISITOS_MOVIMIENTO,
  FUENTES, fuentesDe, planPorId, zonaAftosaDe, decodeRenspa, DTE_INFO,
} from '@/lib/data/senasa-sanidad'
import { BPG_TEMAS, BPG_FUENTE } from '@/lib/data/bpg-ganaderas'
import { getLiquidacion, LIQUIDACION_CAVEAT } from '@/lib/data/liquidacion'
import { valuarTropa, valuarArrendamiento, KG_DEFAULT } from '@/lib/valuaciones'
import { getX402Config } from '@/lib/x402'
import { cotizarProUsdCents, proArsMensual, proMeses, validarSlugPro } from '@/lib/pro-x402'
import { CATEGORIAS_DEMANDA, crearDemanda, formatMatches, matchRemates, normalizarCategoria } from '@/lib/demanda'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * MCP server (Streamable HTTP, JSON-RPC 2.0) — "Consignatarias como servicio para IAs".
 *
 * Expone la data ganadera argentina como TOOLS que cualquier agente MCP (Claude,
 * Cursor, etc.) usa nativamente conectándose a https://www.consignatarias.com.ar/api/mcp
 *
 * Implementación propia (sin mcp-handler) para no arrastrar el conflicto zod v3/v4 ni
 * Redis: el subset que necesita un tool-server es chico — initialize / tools/list /
 * tools/call. TODOS los tools son públicos: `crear_alerta_precio` tiene free tier
 * (3 alertas activas por origen sin key; con key Enterprise sin límite) y las
 * valuaciones tienen cupo diario gratis con overflow pago vía x402 (/api/x402/*).
 */

const SERVER_INFO = { name: 'consignatarias', version: '1.0.0' }
// Versiones del protocolo MCP que soportamos. Somos tools-only + stateless, así que
// la compatibilidad es hacia adelante: negociamos la que pida el cliente si la conocemos.
// Si pide una desconocida NO devolvemos la última a ciegas: un cliente que pide
// 2026-03-26 no implementa 2026-07-28 y corta la conexión ("Server's protocol version
// is not supported") — bajamos a la más nueva que no sea posterior a la pedida.
// LATEST se emite además en el header MCP-Protocol-Version de cada respuesta
// (lo exige el spec 2026-07-28 — "routing-headers").
const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-06-18', '2025-03-26'] as const
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]
const OLDEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1]
const PROTOCOL_VERSION = LATEST_PROTOCOL_VERSION

// Las versiones son fechas ISO: comparan lexicográficamente. SUPPORTED va de más
// nueva a más vieja, así que find() da la más nueva compatible con lo pedido.
function negotiateProtocolVersion(requested?: string): string {
  if (!requested) return LATEST_PROTOCOL_VERSION
  return SUPPORTED_PROTOCOL_VERSIONS.find((v) => v <= requested) ?? OLDEST_PROTOCOL_VERSION
}

// ── Tools (wrappers finos sobre data/lógica existente) ───────────────────────
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }
interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresAuth?: boolean
  run: (args: Record<string, unknown>, req: NextRequest) => Promise<ToolResult>
}

// Títulos humanos por tool (annotation `title`) — Glama y los clientes MCP los muestran.
const TOOL_TITLES: Record<string, string> = {
  get_indice_novillo: 'Índice Novillo (INMAG) hoy',
  get_inmag_historico: 'Histórico del Índice Novillo (INMAG)',
  get_precios_hacienda: 'Precios de hacienda por categoría',
  get_precios_detallados: 'Precios por subcategoría',
  get_contexto_macro: 'Contexto macro ganadero',
  get_indice_liquidacion: 'Índice de Liquidación (% hembras)',
  list_remates: 'Próximos remates de hacienda',
  buscar_consignataria: 'Buscar consignataria',
  actividad_consignatarias: 'Ranking de actividad de consignatarias',
  buscar_frigorifico: 'Buscar frigorífico',
  calcular_arrendamiento: 'Calcular arrendamiento rural',
  sanidad_plan: 'Plan sanitario SENASA (ficha)',
  sanidad_calendario_aftosa: 'Calendario de vacunación antiaftosa',
  sanidad_requisitos_movimiento: 'Requisitos sanitarios de movimiento',
  sanidad_renspa: 'Validar / decodificar RENSPA',
  sanidad_dte_tropa: 'DT-e (número de tropa) — referencia',
  buenas_practicas: 'Buenas Prácticas Ganaderas (BPG)',
  crear_alerta_precio: 'Crear alerta de precio',
}

// MCP tool annotations (spec 2025-03-26+): declaran el comportamiento de forma
// ESTRUCTURADA — es lo que Glama (y otros scorers) esperan para la dimensión
// "side effects / auth / destructive". Todas las tools son de solo lectura sobre
// datos de mercado (open-world) salvo crear_alerta_precio, que crea un recurso.
function toolAnnotations(t: Tool) {
  // Única tool de escritura: crear_alerta_precio (ya sin auth obligatoria).
  const readOnly = t.name !== 'crear_alerta_precio'
  return {
    title: TOOL_TITLES[t.name] ?? t.name,
    readOnlyHint: readOnly, // no muta estado del mundo (solo consulta)
    destructiveHint: false, // ninguna borra/sobreescribe datos
    idempotentHint: readOnly, // repetir una lectura no cambia nada; crear_alerta sí genera otra
    openWorldHint: true, // consultan datos de mercado en vivo (fuente externa)
  }
}

const prices = marketPrices as unknown as {
  inmag: { current: number; change: number; prev: number; series?: Array<{ date: string; value: number; volume: number }> }
  categories: Record<string, { current: number; change: number; prev?: number; sioWeek?: string; latestVolume?: number }>
  corn: { current: number; change: number; unit: string }
  usdBlue: { current: number; change: number }
  usdOficial: { current: number; change: number }
  lastUpdate: string
}
const remates = rematesData as unknown as Array<{
  title: string; consignatariaName: string; consignatariaSlug: string; date: string
  time: string | null; location: string; province: string; mainCategory: string
  estimatedHeads: number | null; youtubeUrl: string | null; status: string
}>
const frigorificos = frigorificosData as unknown as Array<{
  cuit: string; name: string; matricula: string | null; province: string; stage: number; senasaActive?: boolean
}>

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] })
const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], isError: true })

// Mensaje al agotar el cupo diario gratis de valuaciones: si x402 está configurado,
// ofrece la misma consulta paga en centavos (USDC/Base); si no, el reset diario.
function cupoValuacionMsg(endpoint: 'valuar-tropa' | 'valuar-arrendamiento', precio: string): string {
  const base = 'Cupo diario gratis de valuaciones agotado para este origen (se resetea cada 24 h).'
  if (!getX402Config()) {
    return `${base} Volvé mañana o pedí una API key Enterprise (sin límites): https://www.consignatarias.com.ar/planes`
  }
  return (
    `${base}\n\nPara seguir SIN esperar: la misma consulta cuesta ${precio} en USDC (red Base) vía x402 — ` +
    `misma query como GET a https://www.consignatarias.com.ar/api/x402/${endpoint} (mismos params). ` +
    `La respuesta 402 trae las instrucciones de pago (scheme "exact", header X-PAYMENT); ` +
    `cualquier cliente x402-aware (@x402/fetch, etc.) lo resuelve solo.`
  )
}
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

// Ubicación limpia: evita duplicar la provincia cuando ya viene en location
// (635/763 remates traen "Ciudad, Provincia" + province → "…, Provincia, PROVINCIA").
function cleanLocation(location: string | null | undefined, province: string | null | undefined): string {
  const loc = (location || '').trim()
  const prov = (province || '').trim()
  if (!loc) return prov
  if (!prov || loc.toLowerCase().includes(prov.toLowerCase())) return loc
  return `${loc}, ${prov}`
}

const TOOLS: Tool[] = [
  {
    name: 'get_indice_novillo',
    description:
      'INMAG diario del Mercado Agroganadero (MAG/Cañuelas): novillo de referencia HOY en ARS/kg vivo, ponderado por volumen. Devuelve valor, volumen, variación vs rueda previa (marca ruedas flacas) y promedio 5 ruedas. Sin args. Histórico: get_inmag_historico. NO da precios por categoría (get_precios_hacienda, semanal) ni subcategoría (get_precios_detallados); no comparar 1:1.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const series = prices.inmag.series || []
      const n = series.length
      if (n === 0) {
        const { current, change, prev } = prices.inmag
        return ok(`Índice Novillo (INMAG) — ${prices.lastUpdate}\nHoy: ${fmt(current)}/kg vivo (${change >= 0 ? '+' : ''}${change}% vs ${fmt(prev)})`)
      }
      const hoy = series[n - 1]
      const prevRueda = n > 1 ? series[n - 2] : null
      const last5 = series.slice(-5)
      const avg5 = last5.reduce((s, p) => s + p.value, 0) / last5.length
      const diaChange = prevRueda ? ((hoy.value - prevRueda.value) / prevRueda.value) * 100 : 0
      const vsAvg = avg5 ? ((hoy.value - avg5) / avg5) * 100 : 0
      // Flag de rueda flaca: la INMAG diaria es ruidosa y una rueda de bajo volumen
      // puede exagerar el % día-a-día. Comparamos el volumen previo con la mediana reciente.
      const recentVols = last5.map((p) => p.volume).sort((a, b) => a - b)
      const medVol = recentVols[Math.floor(recentVols.length / 2)] || 0
      const thinPrev = !!prevRueda && medVol > 0 && prevRueda.volume < medVol * 0.6
      return ok(
        `Índice Novillo (INMAG) — ${hoy.date}\n` +
          `Hoy: ${fmt(hoy.value)}/kg vivo · volumen ${hoy.volume.toLocaleString('es-AR')} cab\n` +
          (prevRueda
            ? `Variación vs rueda previa (${prevRueda.date}, ${fmt(prevRueda.value)}): ${diaChange >= 0 ? '+' : ''}${diaChange.toFixed(1)}%` +
              (thinPrev ? ' ⚠ la rueda previa fue de bajo volumen; la variación diaria puede exagerar' : '') + '\n'
            : '') +
          `Tendencia: promedio últimas 5 ruedas ${fmt(avg5)} — hoy ${vsAvg >= 0 ? '+' : ''}${vsAvg.toFixed(1)}% vs esa media\n` +
          `Métrica: índice DIARIO ponderado por volumen del canal formal MAG (Cañuelas). Los precios por categoría (get_precios_hacienda) son una observación SEMANAL distinta — no comparar 1:1.\n\n` +
          JSON.stringify({
            inmag: hoy.value, date: hoy.date, volume: hoy.volume,
            change_dia_pct: Math.round(diaChange * 10) / 10, prev_date: prevRueda?.date ?? null, prev: prevRueda?.value ?? null,
            avg_5_ruedas: Math.round(avg5 * 100) / 100, change_vs_avg5_pct: Math.round(vsAvg * 10) / 10,
            prev_low_volume: thinPrev, unit: 'ARS/kg vivo', metric: 'inmag_daily_volume_weighted',
          }),
      )
    },
  },
  {
    name: 'get_inmag_historico',
    description:
      'Serie histórica del Índice Novillo (INMAG) — TENDENCIA. Serie diaria desde 2015-01-05: MAG/Cañuelas desde may-2022, antes era Mercado de Liniers (índice empalmado; la respuesta lo aclara cuando el rango cruza esa frontera). Devuelve valor inicial y final, variación %, mínimo, máximo, nº de ruedas y una muestra (~8 puntos). Índice DIARIO ponderado por volumen. Rango: dias (ventana atrás, default 30, máx 5000 ≈ serie completa) o desde/hasta (YYYY-MM-DD, exacto — sirve para una fecha puntual: desde=hasta). moneda: ars (default) o usd (dólar blue venta, último valor conocido a cada fecha). Valor de HOY → get_indice_novillo; por categoría (semanal) → get_precios_hacienda, no comparar 1:1.',
    inputSchema: {
      type: 'object',
      properties: {
        dias: { type: 'number', description: 'Ventana en días hacia atrás (default 30, máx 5000; la serie arranca 2015-01-05). Ignorado si se pasa desde/hasta.' },
        desde: { type: 'string', description: 'Fecha inicial YYYY-MM-DD (opcional; la serie arranca 2015-01-05)' },
        hasta: { type: 'string', description: 'Fecha final YYYY-MM-DD (opcional; default hoy). desde=hasta consulta una fecha puntual.' },
        moneda: { type: 'string', enum: ['ars', 'usd'], description: 'ars (default) o usd — conversión por dólar blue venta, último valor conocido a cada fecha (regla de /mercado/inmag-dolares)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
      const hoy = new Date().toISOString().slice(0, 10)
      const moneda = args.moneda === 'usd' ? 'usd' : 'ars'
      // Rango: desde/hasta exactos si vienen; si no, la ventana `dias` hacia atrás.
      let desde: string
      let hasta: string
      let rangoLabel: string
      if (typeof args.desde === 'string' || typeof args.hasta === 'string') {
        if (
          (typeof args.desde === 'string' && !ISO_DATE.test(args.desde)) ||
          (typeof args.hasta === 'string' && !ISO_DATE.test(args.hasta))
        )
          return fail('desde/hasta deben ser fechas YYYY-MM-DD (ej. 2020-03-20).')
        desde = typeof args.desde === 'string' ? args.desde : '2015-01-05'
        hasta = typeof args.hasta === 'string' && args.hasta < hoy ? args.hasta : hoy
        if (desde > hasta) return fail('desde no puede ser posterior a hasta.')
        rangoLabel = `${desde} → ${hasta}`
      } else {
        const dias = Math.min(Math.max(typeof args.dias === 'number' ? args.dias : 30, 2), 5000)
        desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
        hasta = hoy
        rangoLabel = `últimos ${dias} días`
      }
      const service = requireServiceClient()
      // Paginado: PostgREST capea cada request a 1.000 filas — sin esto, una ventana
      // larga devuelve la serie truncada (2015→2019) como si fuera completa.
      const PAGE = 1000
      const all: Array<{ date: string; inmag_value: number | null }> = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await service
          .from('mag_inmag_history')
          .select('date, inmag_value')
          .gte('date', desde)
          .lte('date', hasta)
          .order('date', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return fail('Error leyendo el histórico INMAG.')
        all.push(...(data || []))
        if (!data || data.length < PAGE) break
      }
      let rows = (all.filter((r) => r.inmag_value != null) as Array<{ date: string; inmag_value: number }>).map(
        (r) => ({ date: r.date, valor: Number(r.inmag_value) }),
      )
      if (rows.length === 0)
        return ok(`Sin ruedas INMAG en el rango ${rangoLabel}. La serie arranca el 2015-01-05 y solo hay valor en días de rueda (Lun-Vie, sin feriados).`)
      // Conversión a USD: dólar blue venta, último valor conocido a cada fecha
      // (forward-fill) — la misma regla que /mercado/inmag-dolares y las alertas.
      if (moneda === 'usd') {
        const margen = new Date(new Date(`${desde}T00:00:00Z`).getTime() - 14 * 86400000).toISOString().slice(0, 10)
        const blues: Array<{ date: string; venta: number }> = []
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await service
            .from('usd_blue_history')
            .select('date, venta')
            .gte('date', margen)
            .lte('date', hasta)
            .not('venta', 'is', null)
            .order('date', { ascending: true })
            .range(from, from + PAGE - 1)
          if (error) return fail('Error leyendo la serie del dólar blue.')
          blues.push(...((data || []) as Array<{ date: string; venta: number }>))
          if (!data || data.length < PAGE) break
        }
        if (blues.length === 0) return fail('Sin cotización blue para el rango pedido.')
        let bi = 0
        rows = rows.flatMap((r) => {
          while (bi + 1 < blues.length && blues[bi + 1].date <= r.date) bi++
          const blue = blues[bi].date <= r.date ? Number(blues[bi].venta) : null
          return blue && blue > 0 ? [{ date: r.date, valor: Math.round((r.valor / blue) * 100) / 100 }] : []
        })
        if (rows.length === 0) return ok(`Sin ruedas INMAG convertibles a USD en el rango ${rangoLabel}.`)
      }
      const vals = rows.map((r) => r.valor)
      const first = vals[0], last = vals[vals.length - 1]
      const min = Math.min(...vals), max = Math.max(...vals)
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0
      const unidad = moneda === 'usd' ? 'USD/kg vivo (blue)' : 'ARS/kg vivo'
      const fmtVal = (v: number) => (moneda === 'usd' ? `US$ ${v.toFixed(2)}` : fmt(v))
      // muestra: hasta ~8 puntos espaciados
      const step = Math.max(1, Math.floor(rows.length / 8))
      const sample = rows.filter((_, i) => i % step === 0 || i === rows.length - 1)
      // Frontera institucional: el MAG (Cañuelas) opera desde el 2022-05-17; los valores
      // previos son la era Mercado de Liniers, serie empalmada con la misma metodología.
      // Si el rango la cruza, se aclara — un agente no debe citar "INMAG 2020" sin contexto.
      const MAG_DESDE = '2022-05-17'
      const cruzaEra = rows[0].date < MAG_DESDE
      const notaEra = cruzaEra
        ? `\n\n⚠ Nota metodológica: los valores anteriores al ${MAG_DESDE} corresponden a la era Mercado de Liniers (el MAG de Cañuelas opera desde esa fecha). Serie empalmada, misma metodología de índice diario ponderado por volumen. Citar como "índice novillo (Liniers/MAG)" para rangos que cruzan esa frontera.`
        : ''
      const notaUsd =
        moneda === 'usd'
          ? `\n\nConversión USD: dólar blue venta, último valor conocido a cada fecha (fuente usd_blue_history, serie 2011→).`
          : ''
      return ok(
        `INMAG — ${rangoLabel} (${rows.length} ruedas, ${unidad})\n` +
          `Inicio (${rows[0].date}): ${fmtVal(first)} → Fin (${rows[rows.length - 1].date}): ${fmtVal(last)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%)\n` +
          `Mínimo: ${fmtVal(min)} · Máximo: ${fmtVal(max)}\n\nSerie:\n` +
          sample.map((r) => `  ${r.date}: ${fmtVal(r.valor)}`).join('\n') +
          notaEra +
          notaUsd +
          '\n\n' + JSON.stringify({ desde: rows[0].date, hasta: rows[rows.length - 1].date, moneda, unidad, inicio: first, fin: last, change_pct: Math.round(changePct * 10) / 10, min, max, ruedas: rows.length, ...(cruzaEra ? { era_liniers_hasta: MAG_DESDE } : {}) }),
      )
    },
  },
  {
    name: 'get_precios_hacienda',
    description:
      'Precios de hacienda por categoría (novillos, novillitos, vaquillonas, vacas, toros, terneros) del Mercado Agroganadero: observación SEMANAL del SIO, ARS/kg vivo. Cada una: precio actual, cabezas y aviso si <200 cab (pocos datos). categoria (enum) filtra una; sin arg, todas. NO es el INMAG diario (get_indice_novillo, no comparar 1:1) ni subcategorías (get_precios_detallados).',
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: Object.keys((marketPrices as { categories: object }).categories) },
      },
      additionalProperties: false,
    },
    async run(args) {
      const cat = typeof args.categoria === 'string' ? args.categoria : null
      const entries = Object.entries(prices.categories).filter(([k]) => !cat || k === cat)
      if (entries.length === 0) return fail(`Categoría desconocida. Válidas: ${Object.keys(prices.categories).join(', ')}`)
      const week = entries.map(([, v]) => v.sioWeek).find(Boolean) || null
      const lines = entries.map(([k, v]) => {
        const vol = v.latestVolume
        const thin = vol != null && vol < 200
        return `${k}: ${fmt(v.current)}/kg${vol != null ? ` · ${vol} cab` : ''}${thin ? ' (pocos datos)' : ''}`
      })
      return ok(
        `Precios de hacienda por categoría — observación SIO ${week ? `(${week})` : 'semanal'}, ARS/kg vivo\n` +
          `⚠ Métrica SEMANAL por categoría — distinta del índice INMAG diario (ver get_indice_novillo). No comparar 1:1.\n` +
          `${lines.join('\n')}\n\n` +
          JSON.stringify({
            metric: 'sio_weekly_by_category', week,
            prices: Object.fromEntries(entries.map(([k, v]) => [k, { price: v.current, head: v.latestVolume ?? null }])),
          }),
      )
    },
  },
  {
    name: 'get_precios_detallados',
    description:
      'Precios por SUBCATEGORÍA del Mercado Agroganadero (MAG/Cañuelas), último día hábil: ej. "NOVILLOS Regular +430", "VACAS Conserva Buena" — mín/prom/máx en ARS/kg vivo + cabezas. Más granular que get_precios_hacienda (categorías); NO es el índice INMAG diario (get_indice_novillo). Param opcional grupo (novillos/novillitos/vaquillonas/vacas/toros); sin filtro, todas.',
    inputSchema: {
      type: 'object',
      properties: {
        grupo: { type: 'string', enum: ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros'] },
      },
      additionalProperties: false,
    },
    async run(args) {
      const grupo = typeof args.grupo === 'string' ? args.grupo.toLowerCase() : null
      const service = requireServiceClient()
      const { data: latest } = await service
        .from('mag_prices_detailed')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!latest?.date) return ok('Sin datos de precios detallados por ahora.')
      let qb = service
        .from('mag_prices_detailed')
        .select('subcategory, category_group, price_min, price_avg, price_max, head_count')
        .eq('date', latest.date)
      if (grupo) qb = qb.eq('category_group', grupo)
      const { data, error } = await qb.order('category_group')
      if (error) return fail('Error leyendo precios detallados.')
      if (!data || data.length === 0) return ok('Sin subcategorías para ese filtro.')
      const lines = data.map(
        (r) =>
          `${r.subcategory}: prom ${r.price_avg != null ? fmt(Number(r.price_avg)) : 's/d'}` +
          `${r.price_min != null && r.price_max != null ? ` (${fmt(Number(r.price_min))}–${fmt(Number(r.price_max))})` : ''}` +
          `${r.head_count ? ` · ${r.head_count} cab` : ''}`,
      )
      return ok(`Precios detallados por subcategoría — ${latest.date} (ARS/kg vivo)\n${lines.join('\n')}`)
    },
  },
  {
    name: 'get_contexto_macro',
    description:
      'Contexto macro del mercado ganadero argentino, sin parámetros: dólar blue y oficial (ARS), maíz FOB (USD/tn y ARS/kg), novillo INMAG (ARS/kg) y el spread novillo/maíz (kg de maíz que compra 1 kg novillo; proxy de rentabilidad de feedlot); y, si hay, índice de arrendamiento MAG (ARS/kg). NO da la serie INMAG (→get_indice_novillo) ni precios por categoría (→get_precios_hacienda).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const maizArsKg = (prices.corn.current * prices.usdBlue.current) / 1000 // USD/tn → ARS/kg
      const novilloArsKg = prices.inmag.current
      const kgMaizPorKgNovillo = maizArsKg > 0 ? novilloArsKg / maizArsKg : 0
      const arrOficial = (prices as { arrendamientoOficial?: { index: number; date: string } }).arrendamientoOficial ?? null
      return ok(
        `Contexto macro — ${prices.lastUpdate}\n` +
          `Dólar blue: ${fmt(prices.usdBlue.current)} ARS · oficial: ${fmt(prices.usdOficial.current)} ARS\n` +
          `Maíz FOB: USD ${prices.corn.current}/tn (≈ ${fmt(maizArsKg)} ARS/kg)\n` +
          `Novillo (INMAG): ${fmt(novilloArsKg)} ARS/kg\n` +
          `Spread novillo/maíz: ${kgMaizPorKgNovillo.toFixed(1)} kg de maíz por kg de novillo\n` +
          (arrOficial ? `Índice arrendamiento oficial (MAG): ${fmt(arrOficial.index)} ARS/kg (${arrOficial.date})\n` : '') +
          `\n` +
          JSON.stringify({
            usd_blue: prices.usdBlue.current,
            usd_oficial: prices.usdOficial.current,
            maiz_usd_tn: prices.corn.current,
            maiz_ars_kg: Math.round(maizArsKg * 100) / 100,
            novillo_ars_kg: novilloArsKg,
            kg_maiz_por_kg_novillo: Math.round(kgMaizPorKgNovillo * 10) / 10,
            indice_arrendamiento_oficial: arrOficial ?? null,
          }),
      )
    },
  },
  {
    name: 'get_indice_liquidacion',
    description:
      'Índice de Liquidación: participación de HEMBRAS (vacas + vaquillonas) en la hacienda operada en el Mercado Agroganadero (Cañuelas) — indicador ADELANTADO de liquidación (descarga de vientres) vs. retención (armado de rodeo). Sin args. Devuelve la lectura fresca de Cañuelas (mensual, 2026→), el ancla nacional actual (YTD, PDF mensual MAGyP) y el contexto histórico de la faena de hembras NACIONAL (1998-2025: mensual MAGyP + trimestral IPCVA). Ojo: Cañuelas corre estructuralmente por encima de la faena nacional — no comparar 1:1.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const { actual, canuelas, nacional, nacionalActual, interpretacion, fuenteNacional } = await getLiquidacion()
      if (!actual) return ok('Índice de Liquidación — sin dato reciente del mercado.')
      const recientes = canuelas.slice(-4).map((p) => `${p.mes}: ${p.pct}% (${p.cabezas?.toLocaleString('es-AR')} cab)`).join(' · ')
      const natMin = nacional.reduce((m, p) => (p.pct < m.pct ? p : m), nacional[0])
      const natMax = nacional.reduce((m, p) => (p.pct > m.pct ? p : m), nacional[0])
      const anclaNac = nacionalActual?.pct_hembras != null
        ? `Ancla nacional actual (faena, acumulado a ${nacionalActual.mes_informe}): ${nacionalActual.pct_hembras}%${nacionalActual.pct_hembras_anio_previo != null ? ` (vs ${nacionalActual.pct_hembras_anio_previo}% el año previo)` : ''}. Fuente: informe mensual MAGyP.\n`
        : ''
      return ok(
        `Índice de Liquidación (% hembras) — lectura de Cañuelas ${actual.mes}: ${actual.pct}%\n` +
          `${interpretacion}\n\n` +
          `Serie Cañuelas reciente: ${recientes}\n\n` +
          `${anclaNac}` +
          `Contexto histórico — faena de hembras NACIONAL (mensual MAGyP/DNCCA 1998-2019 + trimestral IPCVA 2019-2025): mínimo ${natMin.pct}% (${natMin.mes}, retención), máximo ${natMax.pct}% (${natMax.mes}, liquidación), último ${nacional[nacional.length - 1].pct}% (${nacional[nacional.length - 1].mes}).\n\n` +
          `${LIQUIDACION_CAVEAT}\n` +
          JSON.stringify({
            metric: 'participacion_hembras',
            canuelas_actual_pct: actual.pct, mes: actual.mes, cabezas: actual.cabezas,
            canuelas_serie: canuelas,
            nacional_actual: nacionalActual?.pct_hembras != null ? { pct: nacionalActual.pct_hembras, periodo: nacionalActual.mes_informe, anio_previo: nacionalActual.pct_hembras_anio_previo } : null,
            nacional_min: { pct: natMin.pct, mes: natMin.mes }, nacional_max: { pct: natMax.pct, mes: natMax.mes },
            nacional_ultimo: nacional[nacional.length - 1], fuente_nacional: fuenteNacional.url,
          }),
      )
    },
  },
  {
    name: 'list_remates',
    description:
      'Calendario de próximos remates de hacienda en Argentina: solo programados, fecha ≥ hoy, ordenados por fecha. Devuelve fecha, hora, consignataria, localidad/provincia, categoría principal y si hay transmisión en vivo. Params: provincia (subcadena, opcional), limite (default 10, máx 50). No da precios ni INMAG: usá get_precios_hacienda/get_indice_novillo.',
    inputSchema: {
      type: 'object',
      properties: {
        provincia: { type: 'string', description: 'Filtra por provincia (ej. "Buenos Aires")' },
        limite: { type: 'number', description: 'Máximo de remates (default 10)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const today = new Date().toISOString().slice(0, 10)
      const prov = typeof args.provincia === 'string' ? args.provincia.toLowerCase() : null
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 10, 50)
      const upcoming = remates
        .filter((r) => r.status === 'scheduled' && r.date >= today && (!prov || r.province.toLowerCase().includes(prov)))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, limite)
      if (upcoming.length === 0) return ok('No hay remates próximos con esos filtros.')
      const lines = upcoming.map(
        (r) =>
          `${r.date}${r.time ? ' ' + r.time : ''} · ${r.consignatariaName} · ${cleanLocation(r.location, r.province)}` +
          `${r.mainCategory ? ' · ' + r.mainCategory : ''}${r.youtubeUrl ? ' · 🔴 en vivo' : ''}`,
      )
      return ok(`Próximos ${upcoming.length} remates:\n${lines.join('\n')}`)
    },
  },
  {
    name: 'buscar_consignataria',
    description:
      'Directorio de consignatarias/casas de remate de hacienda por nombre, razón social o localidad (query, mín 2 car). Devuelve nombre, localidad/provincia, categoría, CUIT, un contacto (WhatsApp/teléfono/web) y el perfil en consignatarias.com.ar. Opcional: provincia; limite (def 8, máx 25). NO da actividad de mercado: para cabezas/precio en el MAG usá actividad_consignatarias.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre, localidad o razón social a buscar' },
        provincia: { type: 'string', description: 'Filtra por provincia (opcional)' },
        limite: { type: 'number', description: 'Máximo de resultados (default 8)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    async run(args) {
      // Sanitizar el término para el filtro .or() de PostgREST (evita romper la query).
      const q = String(args.query || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim().slice(0, 80)
      if (q.length < 2) return fail('Pasá un término de al menos 2 caracteres.')
      const prov = typeof args.provincia === 'string' ? args.provincia.replace(/[^\p{L}\p{N}\s]/gu, '').trim() : ''
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 8, 25)

      const service = requireServiceClient()
      let qb = service
        .from('consignatarias')
        .select('display_name, canonical_slug, province, location, category, phone, whatsapp, website, cuit')
        .or(`display_name.ilike.%${q}%,name.ilike.%${q}%,location.ilike.%${q}%`)
      if (prov) qb = qb.ilike('province', `%${prov}%`)
      const { data, error } = await qb.limit(limite)
      if (error) return fail('Error buscando en el directorio.')
      if (!data || data.length === 0) return ok(`Sin resultados para "${q}".`)

      const lines = data.map((c) => {
        const contacto = c.whatsapp || c.phone || c.website || ''
        return `${c.display_name}${c.location ? ' · ' + c.location : c.province ? ' · ' + c.province : ''}` +
          `${c.category ? ' · ' + c.category : ''}${c.cuit ? ' · CUIT ' + c.cuit : ''}${contacto ? ' · ' + contacto : ''}\n  https://www.consignatarias.com.ar/consignatarias/${c.canonical_slug}`
      })
      return ok(`${data.length} resultado(s) para "${q}":\n${lines.join('\n')}`)
    },
  },
  {
    name: 'actividad_consignatarias',
    description:
      'Ranking de consignatarias por CABEZAS operadas en el Mercado Agroganadero (MAG, Cañuelas; mercado de referencia) en un período, con precio promedio ARS/kg por firma. Para "qué firma operó más"; NO da precio de mercado (get_precios_hacienda) ni índice diario (get_indice_novillo). Args: desde (def. 7d), hasta (hoy), categoria (NOVILLO/VACA… opc.), limite (def. 15, máx. 45).',
    inputSchema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD (default: últimos 7 días)' },
        hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD (default: hoy)' },
        categoria: { type: 'string', description: 'Filtra por categoría: NOVILLO, NOVILLITO, VACA, VAQUILLONA, TORO (opcional)' },
        limite: { type: 'number', description: 'Máximo de firmas en el ranking (default 15)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const service = requireServiceClient()
      const today = new Date().toISOString().slice(0, 10)
      const hasta = typeof args.hasta === 'string' ? args.hasta : today
      const desde =
        typeof args.desde === 'string'
          ? args.desde
          : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const categoria = typeof args.categoria === 'string' ? args.categoria.toUpperCase().trim() : ''
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 15, 45)

      let qb = service
        .from('mag_consignataria_sales_lots')
        .select('mag_consignataria_id, head_count, price')
        .gte('date', desde)
        .lte('date', hasta)
      if (categoria) qb = qb.ilike('category', `%${categoria}%`)
      const { data, error } = await qb.limit(50000)
      if (error) return fail('Error consultando la actividad del mercado.')
      if (!data || data.length === 0)
        return ok(
          `Sin operaciones registradas en el MAG entre ${desde} y ${hasta}${categoria ? ` (${categoria})` : ''}. El dato se scrapea a diario tras el cierre (14:00 ART).`,
        )

      const { data: firms } = await service.from('mag_consignatarias').select('mag_id, name')
      const nameById = new Map((firms || []).map((f) => [f.mag_id as number, f.name as string]))

      const agg = new Map<number, { cabezas: number; priceSum: number; priceN: number }>()
      for (const r of data) {
        const id = r.mag_consignataria_id as number
        const a = agg.get(id) || { cabezas: 0, priceSum: 0, priceN: 0 }
        a.cabezas += (r.head_count as number) || 0
        const p = r.price != null ? Number(r.price) : 0
        if (p > 0) {
          a.priceSum += p
          a.priceN++
        }
        agg.set(id, a)
      }
      const rows = [...agg.entries()]
        .map(([id, a]) => ({
          name: nameById.get(id) || `firma #${id}`,
          cabezas: a.cabezas,
          precio: a.priceN ? Math.round(a.priceSum / a.priceN) : null,
        }))
        .sort((x, y) => y.cabezas - x.cabezas)
        .slice(0, limite)
      const totalCab = rows.reduce((s, r) => s + r.cabezas, 0)
      const lines = rows.map(
        (r, i) =>
          `${i + 1}. ${r.name} — ${r.cabezas.toLocaleString('es-AR')} cab${r.precio ? ` · $${r.precio.toLocaleString('es-AR')}/kg prom` : ''}`,
      )
      return ok(
        `Actividad en el MAG Cañuelas (mercado de referencia) ${desde} → ${hasta}${categoria ? ` · ${categoria}` : ''}:\n${lines.join('\n')}\n\nTop ${rows.length}: ${totalCab.toLocaleString('es-AR')} cabezas. Nota: es el mercado concentrador de referencia (~12% nacional) — no incluye lo operado fuera de Cañuelas (ferias del interior, venta directa).`,
      )
    },
  },
  {
    name: 'buscar_frigorifico',
    description:
      'Directorio de frigoríficos y plantas de faena habilitados MAGYP/SENASA (1.102). Buscá por nombre, CUIT o provincia. Por planta devuelve nombre, provincia, matrícula, CUIT y ciclo; marca las inactivas en SENASA. Requiere query (nombre/CUIT) o provincia (una alcanza); limite default 10, máx 30. No da precios ni faena — es directorio.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre o CUIT a buscar (opcional si se pasa provincia)' },
        provincia: { type: 'string', description: 'Filtra por provincia' },
        limite: { type: 'number', description: 'Máximo de resultados (default 10)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const q = String(args.query || '').toLowerCase().trim()
      const prov = String(args.provincia || '').toLowerCase().trim()
      const limite = Math.min(typeof args.limite === 'number' ? args.limite : 10, 30)
      if (!q && !prov) return fail('Pasá un nombre/CUIT o una provincia.')
      const res = frigorificos
        .filter((f) => (!q || f.name.toLowerCase().includes(q) || (f.cuit || '').includes(q)) && (!prov || (f.province || '').toLowerCase().includes(prov)))
        .slice(0, limite)
      if (res.length === 0) return ok('Sin frigoríficos con esos filtros.')
      const lines = res.map(
        (f) =>
          `${f.name} · ${f.province}${f.matricula ? ' · Mat. ' + f.matricula : ''} · CUIT ${f.cuit}` +
          `${f.stage ? ' · Ciclo ' + f.stage : ''}${f.senasaActive === false ? ' · (inactivo SENASA)' : ''}`,
      )
      return ok(`${res.length} frigorífico(s):\n${lines.join('\n')}`)
    },
  },
  {
    name: 'calcular_arrendamiento',
    description:
      'Calcula el canon de arrendamiento de campo (ARS) = kg novillo/ha/mes × hectáreas × precio. Devuelve canon mensual, anual y por ha/mes. Sin precio_novillo usa el índice oficial de arrendamientos del MAG (haciinfo000013), o el INMAG del día si falta. Solo calcula: para consultar precios usá get_indice_novillo o get_precios_hacienda. Estimación, no asesoramiento.',
    inputSchema: {
      type: 'object',
      properties: {
        kg_ha: { type: 'number', description: 'Kg de novillo por hectárea. Por MES salvo que se pase periodo="anio" (típico 3-6 por mes, o 36-72 por año). Los avisos suelen publicarlo por año.' },
        periodo: { type: 'string', enum: ['mes', 'anio'], description: 'Unidad de kg_ha. Por defecto "mes".' },
        hectareas: { type: 'number', description: 'Cantidad de hectáreas' },
        precio_novillo: { type: 'number', description: 'Precio del novillo ARS/kg (default: INMAG actual)' },
      },
      required: ['kg_ha', 'hectareas'],
      additionalProperties: false,
    },
    async run(args) {
      const kgHaEntrada = Number(args.kg_ha)
      const hectareas = Number(args.hectareas)
      // Los avisos se publican en kg/ha/año; adentro se trabaja siempre por mes.
      const porAnio = String(args.periodo ?? 'mes').toLowerCase().startsWith('an')
      const kgHa = porAnio ? kgHaEntrada / 12 : kgHaEntrada
      // Índice oficial del MAG para arrendamientos (haciinfo000013), si el scrape lo trajo.
      const oficial = (prices as { arrendamientoOficial?: { index: number; date: string; periodIndex?: number | null } }).arrendamientoOficial
      const custom = Number.isFinite(Number(args.precio_novillo)) && Number(args.precio_novillo) > 0
      const precio = custom ? Number(args.precio_novillo) : (oficial?.index ?? prices.inmag.current)
      const fuentePrecio = custom
        ? 'precio provisto'
        : oficial
          ? `índice oficial de arrendamiento MAG ${oficial.date}`
          : 'INMAG del día'
      if (!Number.isFinite(kgHaEntrada) || kgHaEntrada <= 0 || !Number.isFinite(hectareas) || hectareas <= 0)
        return fail('kg_ha y hectareas deben ser números positivos.')
      const canonMensual = kgHa * hectareas * precio
      const canonAnual = canonMensual * 12
      const canonHaMes = kgHa * precio
      return ok(
        `Arrendamiento — ${kgHa.toFixed(2)} kg novillo/ha/mes (${(kgHa * 12).toFixed(0)} por año) · ${hectareas} ha · ${fmt(precio)}/kg (${fuentePrecio})\n` +
          `Canon mensual: ${fmt(canonMensual)}\n` +
          `Canon anual: ${fmt(canonAnual)}\n` +
          `Por hectárea/mes: ${fmt(canonHaMes)}\n\n` +
          JSON.stringify({ canon_mensual: Math.round(canonMensual), canon_anual: Math.round(canonAnual), canon_ha_mes: Math.round(canonHaMes), kg_ha_mes: Number(kgHa.toFixed(2)), kg_ha_anio: Number((kgHa * 12).toFixed(1)), hectareas, precio_novillo: precio, fuente_precio: fuentePrecio, indice_arrendamiento_oficial: oficial ?? null }) +
          `\n\n(Índice oficial: "INMAG sugerido para arrendamientos rurales", MAG. Es un cálculo, no asesoramiento.)`,
      )
    },
  },
  {
    name: 'sanidad_plan',
    description:
      'Ficha de un plan sanitario obligatorio de SENASA para bovinos: aftosa, brucelosis, tuberculosis o garrapata/tristeza. Devuelve agente, régimen (vacunación/testeo), categorías afectadas, si es zoonosis y las resoluciones fuente (con URL oficial). Sin argumento lista los 4 planes. Es información regulatoria citada, no operativa (para mover hacienda usá sanidad_requisitos_movimiento).',
    inputSchema: {
      type: 'object',
      properties: {
        enfermedad: { type: 'string', enum: ['aftosa', 'brucelosis', 'tuberculosis', 'garrapata'], description: 'Plan a consultar; sin este arg devuelve los 4' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const id = typeof args.enfermedad === 'string' ? args.enfermedad : null
      const planes = id ? [planPorId(id)].filter(Boolean) : PLANES
      if (planes.length === 0) return fail('Enfermedad desconocida. Válidas: aftosa, brucelosis, tuberculosis, garrapata.')
      const bloques = planes.map((p) => {
        const src = fuentesDe(p!.fuentes).map((f) => `${f.norma} — ${f.titulo}: ${f.url}`).join('\n  ')
        return (
          `● ${p!.enfermedad}${p!.zoonosis ? ' (ZOONOSIS)' : ''}\n` +
          `Agente: ${p!.agente}\n` +
          `Especies: ${p!.especies.join(', ')} · Obligatorio: ${p!.obligatorio ? 'sí' : 'no'}\n` +
          `Régimen: ${p!.regimen}\n` +
          `Categorías: ${p!.categorias_afectadas}\n` +
          `${p!.resumen}\n` +
          `Fuentes:\n  ${src}`
        )
      })
      return ok(`${bloques.join('\n\n')}\n\n${SANIDAD_DISCLAIMER}`)
    },
  },
  {
    name: 'sanidad_calendario_aftosa',
    description:
      'Calendario de vacunación antiaftosa 2026 de SENASA (Res. 711/2025) y estado de zona por provincia. Devuelve las ventanas de la 1ra campaña (todas las categorías) y 2da campaña (solo terneros/terneras), y si la provincia está en zona CON o SIN vacunación (Patagonia/Calingasta). El día exacto por distrito lo fija el Plan Local del Ente Sanitario — devuelve la ventana + la cita, nunca un día inventado.',
    inputSchema: {
      type: 'object',
      properties: {
        provincia: { type: 'string', description: 'Provincia para saber el estado de zona (opcional)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const prov = typeof args.provincia === 'string' ? args.provincia : null
      let zonaTxt = ''
      if (prov) {
        const z = zonaAftosaDe(prov)
        if (!z) zonaTxt = `Provincia "${prov}" no reconocida.\n\n`
        else {
          const estado = z.estado === 'sin_vacunacion' ? 'ZONA SIN VACUNACIÓN (no se vacuna aftosa)' : z.estado === 'mixta' ? 'ZONA MIXTA' : 'ZONA CON VACUNACIÓN'
          zonaTxt = `${z.provincia}: ${estado}${z.nota ? ` — ${z.nota}` : ''}\n\n`
        }
      }
      const camp = CALENDARIO_AFTOSA_2026.map(
        (c) => `${c.campana} campaña — ${c.ventana}\nCategorías: ${c.categorias}\n${c.detalle}`,
      ).join('\n\n')
      const f = fuentesDe(['aftosa_calendario_2026', 'aftosa_plan'])
      return ok(
        `Vacunación antiaftosa 2026\n\n${zonaTxt}${camp}\n\nFuentes:\n  ${f.map((x) => `${x.norma}: ${x.url}`).join('\n  ')}\n\n${SANIDAD_DISCLAIMER}`,
      )
    },
  },
  {
    name: 'sanidad_requisitos_movimiento',
    description:
      'Requisitos sanitarios de SENASA para mover hacienda bovina (RENSPA, DT-e, aftosa al día, serología de brucelosis, barrera de garrapata, transporte habilitado), con la resolución fuente de cada uno. Si pasás provincia de origen y destino, señala si el movimiento cruza la barrera de aftosa (zona con↔sin vacunación). No emite el DT-e (eso es SIGSA, requiere clave fiscal ARCA); informa qué se exige.',
    inputSchema: {
      type: 'object',
      properties: {
        provincia_origen: { type: 'string', description: 'Provincia de origen (opcional)' },
        provincia_destino: { type: 'string', description: 'Provincia de destino (opcional)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const org = typeof args.provincia_origen === 'string' ? zonaAftosaDe(args.provincia_origen) : null
      const dst = typeof args.provincia_destino === 'string' ? zonaAftosaDe(args.provincia_destino) : null
      let barrera = ''
      if (org && dst && org.estado !== dst.estado && (org.estado === 'sin_vacunacion' || dst.estado === 'sin_vacunacion')) {
        barrera = `⚠ El movimiento ${org.provincia} → ${dst.provincia} cruza la barrera zoosanitaria de aftosa (zona con vacunación ↔ zona sin vacunación): tiene requisitos diferenciales estrictos. Consultar a SENASA/Ente antes de mover.\n\n`
      } else if (org && dst) {
        barrera = `${org.provincia} → ${dst.provincia}: ambas ${org.estado === 'sin_vacunacion' ? 'en zona sin vacunación' : 'en zona con vacunación'} (sin cruce de barrera de aftosa).\n\n`
      }
      const reqs = REQUISITOS_MOVIMIENTO.map((r) => {
        const f = fuentesDe(r.fuentes).map((x) => x.norma).join(', ')
        return `● ${r.concepto} [${f}]\n  ${r.regla}`
      }).join('\n')
      return ok(`Requisitos para mover hacienda bovina (SENASA)\n\n${barrera}${reqs}\n\n${SANIDAD_DISCLAIMER}`)
    },
  },
  {
    name: 'sanidad_renspa',
    description:
      'Valida y decodifica un código RENSPA (Registro Nacional Sanitario de Productores Agropecuarios): 17 caracteres, formato 00.000.0.00000.00. Devuelve los segmentos (provincia, departamento, jurisdicción de oficina local, establecimiento y productor) y explica qué identifica. NO consulta la vigencia en vivo (la base de SENASA está tras clave fiscal ARCA); para verificar vigencia remite a la consulta pública oficial.',
    inputSchema: {
      type: 'object',
      properties: {
        renspa: { type: 'string', description: 'Código RENSPA, con o sin puntos (ej. 01.234.5.67890.12)' },
      },
      required: ['renspa'],
      additionalProperties: false,
    },
    async run(args) {
      const d = decodeRenspa(String(args.renspa || ''))
      if (!d.valido) {
        return ok(
          `RENSPA inválido: ${d.error}\n` +
            `Formato oficial: 17 dígitos, 00.000.0.00000.00 (provincia · departamento · jurisdicción · establecimiento · productor).\n` +
            `Fuente: ${FUENTES.renspa_formato.url}`,
        )
      }
      return ok(
        `RENSPA ${d.normalizado} — estructura válida\n` +
          `Provincia (código SENASA): ${d.provincia}\n` +
          `Departamento/partido: ${d.departamento}\n` +
          `Jurisdicción (oficina local): ${d.jurisdiccion}\n` +
          `Establecimiento/predio: ${d.establecimiento}\n` +
          `Productor en el predio: ${d.productor}\n\n` +
          `Un RENSPA asocia productor + establecimiento + actividad; es la base para emitir el DT-e y registrar la vacunación.\n` +
          `Verificar VIGENCIA (dato en vivo, no expuesto por API): ${FUENTES.renspa_consulta.url}\n` +
          `Fuente del formato: ${FUENTES.renspa_formato.url}\n\n` +
          `Nota: se valida la ESTRUCTURA del código, no que el RENSPA exista o esté vigente.`,
      )
    },
  },
  {
    name: 'sanidad_dte_tropa',
    description:
      'Explica el DT-e (Documento de Tránsito electrónico) / número de tropa que ampara el movimiento de hacienda a remate o faena: qué es, qué requisitos hacen falta para emitirlo (RENSPA vigente, clave fiscal ARCA, vacunación al día) y cómo se encadena con los requisitos sanitarios. NO emite ni consulta un DT-e real (SIGSA está tras clave fiscal ARCA); es referencia. Para el detalle de requisitos por movimiento usá sanidad_requisitos_movimiento.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const f = fuentesDe(DTE_INFO.fuentes).map((x) => `${x.norma}: ${x.url}`).join('\n  ')
      return ok(
        `DT-e — Documento de Tránsito electrónico (número de tropa)\n\n` +
          `${DTE_INFO.que_es}\n\n` +
          `Emisión: ${DTE_INFO.emision}\n\n` +
          `Requisitos sanitarios: ${DTE_INFO.requisitos_sanitarios}\n\n` +
          `${DTE_INFO.no_publico}\n\n` +
          `Fuentes:\n  ${f}\n\n${SANIDAD_DISCLAIMER}`,
      )
    },
  },
  {
    name: 'buenas_practicas',
    description:
      'Buenas Prácticas Ganaderas (BPG) para la producción de vacunos de carne, resumidas de la Guía de la Red BPA (2019). Sin argumento lista los 14 temas (organización, personal, establecimiento, instalaciones, suelo, agua, forrajes, estiércol, residuos, cambio climático, manejo de rodeo, alimentación, salud animal, bienestar animal). Con un tema, devuelve cómo implementarlo (secciones y prácticas). Son voluntarias — para lo sanitario OBLIGATORIO usá sanidad_plan / sanidad_requisitos_movimiento.',
    inputSchema: {
      type: 'object',
      properties: {
        tema: { type: 'string', description: 'Slug o nombre del tema (ej. "salud-animal", "manejo-rodeo", "agua"); sin este arg lista los 14' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const q = typeof args.tema === 'string' ? args.tema.toLowerCase().trim() : ''
      if (!q) {
        const lista = BPG_TEMAS.map((t) => `${String(t.n).padStart(2, '0')}. ${t.titulo} [${t.slug}] — ${t.resumen}`).join('\n')
        return ok(`Buenas Prácticas Ganaderas (BPG) — 14 temas:\n${lista}\n\nPedí un tema por su slug o nombre para ver cómo implementarlo.\nFuente: ${BPG_FUENTE.titulo} (${BPG_FUENTE.autor}, ${BPG_FUENTE.anio}).`)
      }
      const t = BPG_TEMAS.find((x) => x.slug === q || x.titulo.toLowerCase() === q || x.titulo.toLowerCase().includes(q) || x.slug.includes(q))
      if (!t) return fail(`Tema no encontrado. Temas: ${BPG_TEMAS.map((x) => x.slug).join(', ')}.`)
      const cuerpo = t.secciones
        .map((s) => `▸ ${s.subtitulo}\n${s.practicas.map((p) => `  - ${p}`).join('\n')}`)
        .join('\n\n')
      return ok(
        `Buenas Prácticas Ganaderas — ${t.titulo} (${t.bloque})\n\n${t.intro}\n\n${cuerpo}\n\n` +
          `Fuente: ${BPG_FUENTE.titulo} (${BPG_FUENTE.autor}, ${BPG_FUENTE.anio}). Resumen — no reemplaza la guía completa. https://www.consignatarias.com.ar/buenas-practicas/${t.slug}`,
      )
    },
  },
  {
    name: 'valuar_tropa',
    description:
      '¿Cuánto valen 350 novillos en Formosa? Valúa una tropa de hacienda a precio MAG del día: total en ARS y en USD (blue y oficial), valor por cabeza y fuente fechada. GRATIS con cupo diario por origen; sin cupo, la misma consulta cuesta US$0,05 en USDC vía x402: https://www.consignatarias.com.ar/api/x402/valuar-tropa. Params: categoria, cabezas, kg_promedio (opcional, si no se asume el peso típico de venta), provincia (opcional).',
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: Object.keys(KG_DEFAULT), description: 'Categoría MAG' },
        cabezas: { type: 'number', description: 'Cantidad de animales (1 a 100.000)' },
        kg_promedio: { type: 'number', description: 'Peso vivo promedio en kg (opcional; default: peso típico de venta de la categoría)' },
        provincia: { type: 'string', description: 'Provincia (opcional; la referencia de precio es nacional MAG)' },
      },
      required: ['categoria', 'cabezas'],
      additionalProperties: false,
    },
    async run(args, req) {
      const rl = await enforceRateLimit({ action: 'mcp_valuacion', identity: `ip:${clientIp(req)}`, limit: 5, windowSeconds: 86_400 })
      if (!rl.ok) return fail(cupoValuacionMsg('valuar-tropa', 'US$0,05'))
      try {
        return ok(
          valuarTropa({
            categoria: String(args.categoria || ''),
            cabezas: Number(args.cabezas),
            kgPromedio: args.kg_promedio != null ? Number(args.kg_promedio) : undefined,
            provincia: args.provincia ? String(args.provincia) : undefined,
          }).texto,
        )
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'Argumentos inválidos.')
      }
    },
  },
  {
    name: 'valuar_arrendamiento_campo',
    description:
      '¿Cuánto cuesta arrendar un campo de 3.500 has en Corrientes? Canon de arrendamiento ganadero al índice oficial del MAG (haciinfo000013): anual y mensual, en ARS y USD. Con kg_ha_anio pactado da el canon exacto; sin él, escenarios de 40 a 100 kg/ha/año. GRATIS con cupo diario por origen; sin cupo, US$0,10 en USDC vía x402: https://www.consignatarias.com.ar/api/x402/valuar-arrendamiento. Params: hectareas, kg_ha_anio (opcional), provincia (opcional).',
    inputSchema: {
      type: 'object',
      properties: {
        hectareas: { type: 'number', description: 'Superficie en hectáreas (1 a 1.000.000)' },
        kg_ha_anio: { type: 'number', description: 'Canon pactado en kg de novillo por ha por año (opcional; sin él se responden escenarios)' },
        provincia: { type: 'string', description: 'Provincia (opcional; el canon por zona/aptitud se pacta, no hay valor oficial provincial)' },
      },
      required: ['hectareas'],
      additionalProperties: false,
    },
    async run(args, req) {
      const rl = await enforceRateLimit({ action: 'mcp_valuacion', identity: `ip:${clientIp(req)}`, limit: 5, windowSeconds: 86_400 })
      if (!rl.ok) return fail(cupoValuacionMsg('valuar-arrendamiento', 'US$0,10'))
      try {
        return ok(
          valuarArrendamiento({
            hectareas: Number(args.hectareas),
            kgHaAnio: args.kg_ha_anio != null ? Number(args.kg_ha_anio) : undefined,
            provincia: args.provincia ? String(args.provincia) : undefined,
          }).texto,
        )
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'Argumentos inválidos.')
      }
    },
  },
  {
    name: 'quiero_comprar',
    description:
      '"Quiero comprar 300 terneros en Corrientes" → te devuelve YA los próximos remates programados que matchean (fecha, consignataria, lugar, link) y deja tu búsqueda activa: te avisamos por email o webhook de cada remate nuevo que matchee. GRATIS. Params: categoria (terneros|novillos|vaquillonas|vacas|toros|mixto — acepta sinónimos), cabezas (opcional), provincia (opcional), email y/o webhook_url (al menos uno, para los avisos).',
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: 'Qué busca comprar (terneros, novillos, vaquillonas, vacas, toros, mixto)' },
        cabezas: { type: 'number', description: 'Cuántas cabezas busca (opcional)' },
        provincia: { type: 'string', description: 'Dónde (opcional, ej. "Corrientes")' },
        email: { type: 'string', description: 'Email para los avisos de remates que matcheen' },
        webhook_url: { type: 'string', description: 'Webhook https para avisos programáticos (POST remate.matched)' },
        notas: { type: 'string', description: 'Detalle libre (raza, peso, condición, plazo…)' },
      },
      required: ['categoria'],
      additionalProperties: false,
    },
    async run(args, req) {
      const categoria = normalizarCategoria(args.categoria)
      if (!categoria) return fail(`Categoría no reconocida. Usá: ${CATEGORIAS_DEMANDA.join(', ')} (o sinónimos: ternero, vaca, reproductores…).`)
      const cabezas = args.cabezas != null && Number.isFinite(Number(args.cabezas)) && Number(args.cabezas) > 0 ? Math.min(Math.round(Number(args.cabezas)), 100_000) : null
      const provincia = args.provincia ? String(args.provincia).trim() : null
      const email = typeof args.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email.trim()) ? args.email.trim().toLowerCase() : null
      let webhookUrl: string | null = null
      if (typeof args.webhook_url === 'string' && args.webhook_url.trim()) {
        const w = args.webhook_url.trim()
        try {
          const host = new URL(w).hostname.toLowerCase()
          if (w.startsWith('https://') && host !== 'localhost' && !/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) webhookUrl = w
        } catch { /* inválida → null */ }
      }

      // Sin contacto: igual devolvemos el matching (valor inmediato) + cómo activar el aviso.
      if (!email && !webhookUrl) {
        const matches = matchRemates(categoria, provincia)
        return ok(
          `Remates programados que matchean (${categoria}${provincia ? `, ${provincia}` : ''}):\n\n${formatMatches(matches)}\n\n` +
            `Para que te avisemos de cada remate NUEVO que matchee, repetí la llamada con tu email o webhook_url. Calendario completo: https://www.consignatarias.com.ar/remates`,
        )
      }

      const rl = await enforceRateLimit({ action: 'demanda_compra', identity: `ip:${clientIp(req)}`, limit: 5, windowSeconds: 86_400 })
      if (!rl.ok) return fail('Demasiadas búsquedas creadas hoy desde este origen. Probá mañana.')

      try {
        const { id, matches } = await crearDemanda({
          categoria,
          cabezas,
          provincia,
          email,
          webhookUrl,
          origen: 'mcp',
          originIp: clientIp(req),
          notas: args.notas ? String(args.notas).slice(0, 500) : null,
        })
        return ok(
          `Búsqueda #${id} activa: ${cabezas ? `${cabezas.toLocaleString('es-AR')} cab de ` : ''}${categoria}${provincia ? ` en ${provincia}` : ''}. ` +
            `Te avisamos ${email && webhookUrl ? 'por email y webhook' : email ? 'por email' : 'al webhook'} de cada remate nuevo que matchee.\n\n` +
            `Remates programados que YA matchean:\n\n${formatMatches(matches)}`,
        )
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'No se pudo registrar la búsqueda.')
      }
    },
  },
  {
    name: 'contratar_pro_consignataria',
    description:
      'Cotiza y explica cómo activar PRO Consignataria pagando en USDC (x402): perfil destacado, badge PRO, video del último remate y leads en consignatarias.com.ar. Mismo producto que en /planes (ARS 45.000/mes), cotizado al dólar blue del día. Esta tool NO cobra: devuelve el monto exacto y el endpoint x402 para pagar. Params: slug (consignataria del directorio, usá buscar_consignataria si no lo sabés), meses (1-12, default 1).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug de la consignataria en el directorio' },
        meses: { type: 'number', description: 'Meses a contratar (1-12, default 1)' },
      },
      required: ['slug'],
      additionalProperties: false,
    },
    async run(args) {
      const firma = validarSlugPro(args.slug)
      if (!firma) {
        return fail('slug inválido: tiene que ser una consignataria del directorio. Encontrala con buscar_consignataria o en https://www.consignatarias.com.ar/consignatarias')
      }
      let meses: number
      try {
        meses = proMeses(args.meses)
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'meses inválido.')
      }
      const ars = proArsMensual() * meses
      const cents = cotizarProUsdCents(meses)
      const usd = (cents / 100).toFixed(2)
      const pagoDisponible = Boolean(getX402Config())
      return ok(
        `PRO Consignataria — ${firma.nombre} (${firma.canonical})\n\n` +
          `${meses} mes${meses > 1 ? 'es' : ''}: ARS ${ars.toLocaleString('es-AR')} ≈ US$${usd} en USDC (al blue del día)\n` +
          `Incluye: perfil destacado en el directorio, badge PRO, video del último remate embebido y leads.\n\n` +
          (pagoDisponible
            ? `Para pagar con USDC (x402): GET https://www.consignatarias.com.ar/api/x402/pro?slug=${firma.canonical}&meses=${meses} — ` +
              `la respuesta 402 trae el monto exacto y las instrucciones (scheme "exact", header X-PAYMENT); cualquier cliente x402-aware lo resuelve. ` +
              `La activación es inmediata al liquidarse el pago.\n\n`
            : '') +
          `También en pesos con tarjeta/débito: https://www.consignatarias.com.ar/consignatarias/${firma.canonical}/activar`,
      )
    },
  },
  {
    name: 'crear_alerta_precio',
    description:
      'Crea una alerta: cuando el precio de una categoría cruza el umbral, avisa a tu webhook https (POST price.threshold_crossed). Única tool de escritura (el resto lee). GRATIS sin API key (hasta 3 alertas activas por origen); con key Enterprise (Bearer cnsg_live_… o param api_key) sin límite. Params: categoria (inmag=índice diario; resto semanal), umbral ARS/kg vivo, direccion above|below (def above), webhook_url. Devuelve id y precio.',
    inputSchema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: ['inmag', ...CATEGORY_VALUES.filter((c) => c !== 'inmag')] },
        umbral: { type: 'number', description: 'Umbral en ARS/kg vivo (ej. 5000)' },
        direccion: { type: 'string', enum: ['above', 'below'], description: 'Cruzar hacia arriba o abajo (default above)' },
        webhook_url: { type: 'string', description: 'URL https pública que recibe el POST cuando cruza' },
        api_key: { type: 'string', description: 'API key del plan (cnsg_live_...). Opcional si ya la pasás por el header Authorization: Bearer.' },
      },
      required: ['categoria', 'umbral', 'webhook_url'],
      additionalProperties: false,
    },
    async run(args, req) {
      // Auth OPCIONAL: con key (header Bearer o arg api_key) no hay límites; sin key,
      // free tier: hasta 3 alertas activas por IP de origen. Una key INVÁLIDA sigue
      // siendo error (typo ≠ free tier: el caller cree estar autenticado).
      let authReq = req
      const apiKeyArg = typeof args.api_key === 'string' ? args.api_key.trim() : ''
      if (!req.headers.get('authorization') && apiKeyArg) {
        const headers = new Headers(req.headers)
        headers.set('authorization', apiKeyArg.toLowerCase().startsWith('bearer ') ? apiKeyArg : `Bearer ${apiKeyArg}`)
        authReq = new NextRequest(req.url, { headers })
      }
      const hasCreds = Boolean(authReq.headers.get('authorization'))
      let userId: string | null = null
      if (hasCreds) {
        const auth = await authenticate(authReq)
        if (!auth.ok) {
          let reason = ''
          try { const b = await auth.response.json(); reason = b?.error?.message || '' } catch { /* ignore */ }
          return fail(
            `${reason || 'API key inválida.'}\n\nLa key que pasaste no autentica. Reintentá sin key (free tier: 3 alertas activas) ` +
              `o gestioná tu key en https://www.consignatarias.com.ar/cuenta/api-keys`,
          )
        }
        userId = auth.key.userId
      }
      const categoria = String(args.categoria || '').toLowerCase()
      const umbral = Number(args.umbral)
      const direccion = args.direccion === 'below' ? 'below' : 'above'
      const webhook = String(args.webhook_url || '').trim()
      if (!isValidCategory(categoria)) return fail(`Categoría inválida. Válidas: ${CATEGORY_VALUES.join(', ')}`)
      if (!Number.isFinite(umbral) || umbral <= 0) return fail('Umbral inválido.')
      let host = ''
      try { host = new URL(webhook).hostname.toLowerCase() } catch { return fail('webhook_url inválida.') }
      if (!webhook.startsWith('https://') || host === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
        return fail('webhook_url debe ser una URL https pública.')

      const service = requireServiceClient()
      const ip = clientIp(req)
      if (!userId) {
        // Free tier: 3 alertas activas por IP + freno de abuso (10 creaciones/día).
        const rl = await enforceRateLimit({ action: 'mcp_alerta_free', identity: `ip:${ip}`, limit: 10, windowSeconds: 86_400 })
        if (!rl.ok) return fail('Demasiadas creaciones de alerta hoy desde este origen. Probá mañana o usá una API key Enterprise (sin límites): https://www.consignatarias.com.ar/cuenta/api-keys')
        const { count } = await service
          .from('price_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('origin_ip', ip)
        if ((count ?? 0) >= 3) {
          return fail(
            'Límite del free tier: 3 alertas activas por origen. Con una API key Enterprise no hay límite ' +
              '(Bearer cnsg_live_… o param api_key) → https://www.consignatarias.com.ar/cuenta/api-keys',
          )
        }
      }
      let current: number | null = null
      try { current = await getCurrentPrice(service, categoria) } catch { /* best-effort */ }
      const { data, error } = await service
        .from('price_alerts')
        .insert({ user_id: userId, origin_ip: userId ? null : ip, webhook_url: webhook, category: categoria, threshold: umbral, direction: direccion, last_value: current, status: 'active', source: 'api' })
        .select('id')
        .single()
      if (error) return fail('No se pudo crear la alerta.')
      return ok(
        `Alerta creada (#${data.id}). Te aviso al webhook cuando el ${categoryLabel(categoria)} ` +
          `${direccion === 'above' ? 'cruce' : 'baje de'} ${fmt(umbral)}. Precio hoy: ${current != null ? fmt(current) : 's/d'}.` +
          (userId ? '' : '\n\nFree tier: hasta 3 alertas activas por origen. ¿Más alertas + históricos bulk + soporte? Key Enterprise: https://www.consignatarias.com.ar/planes'),
      )
    },
  },
]

// ── JSON-RPC 2.0 handler ─────────────────────────────────────────────────────
// ── Prompts (plantillas reutilizables que el cliente MCP ofrece al usuario) ──
// Exponer prompts reales (no lista vacía) sube el score en los scoring-engines de
// MCP y le da a los agentes flujos listos. Cada uno arma un mensaje que instruye al
// modelo a usar las tools de arriba. Curados del catálogo de 55 preguntas.
type McpPrompt = {
  name: string
  description: string
  arguments: Array<{ name: string; description: string; required?: boolean }>
  build: (a: Record<string, string>) => string
}

const PROMPTS: McpPrompt[] = [
  {
    name: 'precio_novillo_hoy',
    description: 'Precio del novillo hoy (INMAG) en pesos y dólares, con su variación.',
    arguments: [],
    build: () => 'Decime cuánto está el novillo hoy en el Mercado Agroganadero, en pesos y en dólares, y cómo varió respecto de la semana pasada. Usá las tools de consignatarias.',
  },
  {
    name: 'panorama_mercado',
    description: 'Panorama del mercado ganadero hoy: precio, dólar, remates de la semana y consignatarias más activas.',
    arguments: [],
    build: () => 'Armá un panorama del mercado ganadero argentino de hoy usando las tools de consignatarias: precio del novillo (INMAG) en ARS y USD, contexto macro (dólar/maíz/faena), remates de esta semana y las consignatarias más activas por cabezas operadas en Cañuelas.',
  },
  {
    name: 'valuar_tropa',
    description: 'Cuánto vale una tropa de hacienda hoy, en pesos y dólares.',
    arguments: [
      { name: 'categoria', description: 'Categoría (novillos, terneros, vacas…)', required: true },
      { name: 'cabezas', description: 'Cantidad de animales', required: true },
      { name: 'provincia', description: 'Provincia (opcional)', required: false },
    ],
    build: (a) => `¿Cuánto valen ${a.cabezas || ''} ${a.categoria || 'novillos'}${a.provincia ? ` en ${a.provincia}` : ''} hoy, en pesos y en dólares? Usá valuar_tropa de consignatarias.`,
  },
  {
    name: 'arrendar_campo',
    description: 'Cuánto cuesta arrendar un campo ganadero, al índice oficial del MAG.',
    arguments: [
      { name: 'hectareas', description: 'Superficie en hectáreas', required: true },
      { name: 'provincia', description: 'Provincia (opcional)', required: false },
    ],
    build: (a) => `¿Cuánto cuesta por año y por mes arrendar un campo ganadero de ${a.hectareas || ''} hectáreas${a.provincia ? ` en ${a.provincia}` : ''}? Usá valuar_arrendamiento_campo de consignatarias y mostrame los escenarios en pesos y dólares.`,
  },
  {
    name: 'novillo_en_dolares',
    description: 'Cuánto vale un novillo en dólares hoy, según su peso.',
    arguments: [{ name: 'kg', description: 'Peso del novillo en kg (default 460)', required: false }],
    build: (a) => `¿Cuánto vale un novillo de ${a.kg || '460'} kg en dólares hoy? Usá el INMAG y el dólar de las tools de consignatarias.`,
  },
  {
    name: 'actividad_consignataria',
    description: 'Cuántas cabezas operó una consignataria y a qué precio promedio, en un período.',
    arguments: [
      { name: 'firma', description: 'Nombre de la consignataria', required: true },
      { name: 'periodo', description: 'Período, ej. "este mes" (default: último mes)', required: false },
    ],
    build: (a) => `¿Cuántas cabezas operó la consignataria "${a.firma || ''}" en ${a.periodo || 'el último mes'} en el Mercado Agroganadero de Cañuelas, y a qué precio promedio? Usá actividad_consignatarias.`,
  },
  {
    name: 'ranking_consignatarias',
    description: 'Ranking de consignatarias por cabezas operadas en Cañuelas, con precio promedio.',
    arguments: [
      { name: 'periodo', description: 'Período (default: este mes)', required: false },
      { name: 'categoria', description: 'Categoría: NOVILLO, VACA, etc. (opcional)', required: false },
    ],
    build: (a) => `Rankeá las consignatarias por cabezas operadas en ${a.periodo || 'este mes'}${a.categoria ? `, categoría ${a.categoria}` : ''}, con su precio promedio. Usá actividad_consignatarias.`,
  },
  {
    name: 'calcular_arrendamiento',
    description: 'Calcula el canon de arrendamiento con el índice novillo del mes.',
    arguments: [
      { name: 'hectareas', description: 'Cantidad de hectáreas', required: true },
      { name: 'kg_ha', description: 'Kilos de novillo por hectárea pactados (aclarar si es por mes o por año)', required: true },
    ],
    build: (a) => `Calculá el canon de arrendamiento de ${a.hectareas || ''} hectáreas a ${a.kg_ha || ''} kg de novillo por hectárea, con el índice de arrendamiento del mes. Usá calcular_arrendamiento.`,
  },
  {
    name: 'remates_provincia',
    description: 'Calendario de remates de hacienda en una provincia.',
    arguments: [{ name: 'provincia', description: 'Provincia', required: true }],
    build: (a) => `¿Qué remates de hacienda hay próximamente en ${a.provincia || ''}? Dame fecha, consignataria, tipo y cabezas estimadas. Usá list_remates.`,
  },
  {
    name: 'vender_ahora_o_esperar',
    description: 'Análisis de si conviene vender ahora o esperar, según el histórico en USD.',
    arguments: [{ name: 'categoria', description: 'Categoría (default: novillo)', required: false }],
    build: (a) => `¿Conviene vender ${a.categoria || 'el novillo'} ahora o esperar? Compará el precio actual contra su histórico en dólares reales (últimos 12 meses) con las tools de consignatarias. Aclarar que no es una recomendación financiera.`,
  },
  {
    name: 'valuar_lote',
    description: 'Valúa un lote de hacienda con el precio de hoy.',
    arguments: [
      { name: 'cabezas', description: 'Cantidad de cabezas', required: true },
      { name: 'kg', description: 'Peso promedio por cabeza', required: true },
      { name: 'categoria', description: 'Categoría (default: novillo)', required: false },
    ],
    build: (a) => `¿Cuánto vale un lote de ${a.cabezas || ''} ${a.categoria || 'novillos'} de ${a.kg || ''} kg cada uno, con el precio de hoy? Usá el INMAG / precios por categoría de consignatarias.`,
  },
  {
    name: 'reporte_semanal',
    description: 'Reporte semanal del mercado ganadero, listo para publicar.',
    arguments: [],
    build: () => 'Armá un reporte semanal del mercado ganadero argentino, listo para publicar: precio del novillo (INMAG) en ARS y USD con su variación, precios por categoría, contexto macro, remates destacados de la semana y consignatarias más activas. Usá las tools de consignatarias y citá la fuente.',
  },
]

// Todas las respuestas MCP llevan MCP-Protocol-Version (spec 2026-07-28, routing-headers).
function mcpHeaders(pv?: string): Record<string, string> {
  return { 'Cache-Control': 'no-store', 'MCP-Protocol-Version': negotiateProtocolVersion(pv) }
}
function rpcResult(id: unknown, result: unknown, pv?: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: mcpHeaders(pv) })
}
function rpcError(id: unknown, code: number, message: string, pv?: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: mcpHeaders(pv) })
}

// ── Observabilidad ───────────────────────────────────────────────────────────
// Cada request MCP deja rastro en ops_events (fire-and-forget, mismo canal que el
// API REST). Sin esto no hay forma de saber si un agente AI consulta el server.
function reqMeta(req: NextRequest) {
  return {
    ua: req.headers.get('user-agent')?.slice(0, 200) ?? null,
    ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || null,
    has_auth: !!req.headers.get('authorization'),
  }
}
// Nunca logueamos la api_key: la redactamos de los argumentos de la tool.
function redactArgs(args: unknown): Record<string, unknown> | null {
  if (!args || typeof args !== 'object') return null
  const clone: Record<string, unknown> = { ...(args as Record<string, unknown>) }
  if ('api_key' in clone) clone.api_key = '[redacted]'
  return clone
}
function logMcp(opts: { method?: string; ok: boolean; startedAt: number; meta?: Record<string, unknown> }) {
  void logEvent({
    eventType: 'mcp_call',
    status: opts.ok ? 'ok' : 'error',
    route: '/api/mcp',
    statusCode: opts.ok ? 200 : 400,
    latencyMs: Date.now() - opts.startedAt,
    metadata: { method: opts.method ?? null, ...(opts.meta ?? {}) },
  })
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const rmeta = reqMeta(req)
  // Versión que viaja en el header MCP-Protocol-Version (spec 2026-07-28). Se refleja
  // en el header de cada respuesta vía mcpHeaders(pv).
  const pv = req.headers.get('mcp-protocol-version') || undefined
  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> }
  try {
    msg = await req.json()
  } catch {
    logMcp({ method: 'parse_error', ok: false, startedAt, meta: rmeta })
    return rpcError(null, -32700, 'Parse error', pv)
  }
  const { id, method, params } = msg

  // Notificaciones (sin id) → 202 sin body. Se loguea igual: es señal de cliente vivo.
  if (id === undefined || id === null) {
    logMcp({ method: method ?? 'notification', ok: true, startedAt, meta: rmeta })
    return new NextResponse(null, { status: 202, headers: mcpHeaders(pv) })
  }

  switch (method) {
    case 'initialize': {
      // Negociación: la que pida el cliente si la soportamos; si no, la más nueva
      // no posterior a la pedida. Preferimos el protocolVersion del body; si falta,
      // el del header.
      const requested = (params?.protocolVersion as string) || pv
      const negotiated = negotiateProtocolVersion(requested)
      logMcp({ method: 'initialize', ok: true, startedAt, meta: { ...rmeta, client: params?.clientInfo ?? null, protocol: negotiated } })
      return rpcResult(id, {
        protocolVersion: negotiated,
        capabilities: { tools: {}, prompts: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'Datos e infraestructura del mercado ganadero argentino como tools MCP.\n' +
          '• Mercado: get_indice_novillo (índice INMAG DIARIO, ponderado por volumen) y get_precios_hacienda (precios por categoría, observación SEMANAL) son métricas distintas — no las compares 1:1; además get_inmag_historico, get_precios_detallados, get_contexto_macro y get_indice_liquidacion (% hembras, liquidación vs retención).\n' +
          '• Directorio y remates: buscar_consignataria, actividad_consignatarias, buscar_frigorifico, list_remates.\n' +
          '• Herramientas: calcular_arrendamiento.\n' +
          '• Sanidad SENASA (dato regulatorio, con la resolución citada): sanidad_plan, sanidad_calendario_aftosa, sanidad_requisitos_movimiento, sanidad_renspa (valida/decodifica RENSPA), sanidad_dte_tropa (DT-e / número de tropa).\n' +
          '• Buenas Prácticas Ganaderas (14 temas, Guía Red BPA): buenas_practicas.\n' +
          '• Valuaciones: valuar_tropa ("¿cuánto valen 350 novillos en Formosa?") y valuar_arrendamiento_campo ("¿cuánto cuesta arrendar 3.500 has en Corrientes?") — total en ARS y USD con fuente fechada. Gratis con cupo diario; sin cupo, la misma consulta se paga por request en USDC real (x402 en red Base mainnet, centavos: US$0,05-0,10) en /api/x402/valuar-tropa y /api/x402/valuar-arrendamiento.\n' +
          '• Alertas: crear_alerta_precio avisa a tu webhook cuando el precio cruza tu umbral. GRATIS sin key (3 alertas activas por origen); con API key Enterprise sin límite.\n' +
          '• PRO Consignataria pagable en USDC: contratar_pro_consignataria cotiza (ARS 45.000/mes al blue del día) y da el endpoint x402 (/api/x402/pro) — activación inmediata del perfil destacado al liquidarse el pago.\n' +
          '• Comprar hacienda: quiero_comprar ("quiero comprar 300 terneros en Corrientes") devuelve YA los remates programados que matchean y deja la búsqueda activa — avisamos por email/webhook de cada remate nuevo que matchee. Gratis.\n' +
          'Todos los tools son públicos y de lectura salvo crear_alerta_precio (escritura, free tier). Key Enterprise (Bearer cnsg_live_... o param api_key) para alertas ilimitadas, históricos bulk y soporte: https://www.consignatarias.com.ar/cuenta/api-keys',
      }, negotiated)
    }
    case 'ping':
      logMcp({ method: 'ping', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, {}, pv)
    case 'tools/list':
      logMcp({ method: 'tools/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: TOOL_TITLES[t.name] ?? t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: toolAnnotations(t),
        })),
      }, pv)
    case 'tools/call': {
      const name = params?.name as string
      const tool = TOOLS.find((t) => t.name === name)
      if (!tool) {
        logMcp({ method: 'tools/call', ok: false, startedAt, meta: { ...rmeta, tool: name ?? null, error: 'unknown_tool' } })
        return rpcError(id, -32602, `Tool desconocida: ${name}`, pv)
      }
      const args = (params?.arguments as Record<string, unknown>) || {}
      try {
        const result = await tool.run(args, req)
        logMcp({ method: 'tools/call', ok: !result.isError, startedAt, meta: { ...rmeta, tool: name, args: redactArgs(args), is_error: result.isError ?? false } })
        return rpcResult(id, result, pv)
      } catch (err) {
        console.error('[mcp] tool error', name, err)
        logMcp({ method: 'tools/call', ok: false, startedAt, meta: { ...rmeta, tool: name, args: redactArgs(args), error: 'exception' } })
        return rpcResult(id, { content: [{ type: 'text', text: 'Error interno ejecutando la tool.' }], isError: true }, pv)
      }
    }
    // Somos un server tools-only, pero los crawlers de registries/scoring probean
    // estas capabilities estándar. Antes caían al default → -32601 (400), lo que baja
    // el score de compatibilidad. Respondemos con listas vacías (spec-correcto).
    case 'prompts/list':
      logMcp({ method: 'prompts/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, {
        prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description, arguments: p.arguments })),
      }, pv)
    case 'prompts/get': {
      const pname = params?.name as string
      const prompt = PROMPTS.find((p) => p.name === pname)
      if (!prompt) {
        logMcp({ method: 'prompts/get', ok: false, startedAt, meta: { ...rmeta, error: 'unknown_prompt', prompt: pname ?? null } })
        return rpcError(id, -32602, `Prompt desconocido: ${pname}`, pv)
      }
      const pargs = (params?.arguments as Record<string, string>) || {}
      logMcp({ method: 'prompts/get', ok: true, startedAt, meta: { ...rmeta, prompt: pname } })
      return rpcResult(id, {
        description: prompt.description,
        messages: [{ role: 'user', content: { type: 'text', text: prompt.build(pargs) } }],
      }, pv)
    }
    case 'resources/list':
      logMcp({ method: 'resources/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, { resources: [] }, pv)
    case 'resources/templates/list':
      logMcp({ method: 'resources/templates/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, { resourceTemplates: [] }, pv)

    default:
      logMcp({ method: method ?? 'unknown', ok: false, startedAt, meta: { ...rmeta, error: 'unsupported_method' } })
      return rpcError(id, -32601, `Método no soportado: ${method}`, pv)
  }
}

// No ofrecemos stream server→cliente (tool-server stateless): GET → 405, pero anunciamos
// el descubrimiento (server-card) en el header para los crawlers que hacen probe por GET.
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method Not Allowed. Usá POST (JSON-RPC MCP).',
      transport: 'streamable-http',
      protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
      discovery: 'https://www.consignatarias.com.ar/.well-known/mcp/server.json',
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
        'MCP-Protocol-Version': LATEST_PROTOCOL_VERSION,
        Link: '</.well-known/mcp/server.json>; rel="mcp-server-card"',
      },
    },
  )
}
