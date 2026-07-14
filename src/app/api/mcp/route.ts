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
 * tools/call. Los tools de lectura son públicos; `crear_alerta_precio` requiere una
 * API key de un plan (Authorization: Bearer cnsg_live_..., mismo sistema que el API REST).
 */

const SERVER_INFO = { name: 'consignatarias', version: '1.0.0' }
// Versiones del protocolo MCP que soportamos. Somos tools-only + stateless, así que
// la compatibilidad es hacia adelante: negociamos la que pida el cliente si la conocemos,
// si no devolvemos la última. LATEST se emite además en el header MCP-Protocol-Version
// de cada respuesta (lo exige el spec 2026-07-28 — "routing-headers").
const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-06-18', '2025-03-26'] as const
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]
const PROTOCOL_VERSION = LATEST_PROTOCOL_VERSION

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
  const readOnly = !t.requiresAuth
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
      'Serie histórica del Índice Novillo (INMAG), ARS/kg vivo (MAG/Cañuelas) — TENDENCIA. Devuelve valor inicial y final, variación %, mínimo, máximo, nº de ruedas y una muestra (~8 puntos). Índice DIARIO ponderado por volumen. Param dias: ventana atrás (default 30, mín 2, máx 730). Valor de HOY → get_indice_novillo; por categoría (semanal) → get_precios_hacienda, no comparar 1:1.',
    inputSchema: {
      type: 'object',
      properties: {
        dias: { type: 'number', description: 'Ventana en días hacia atrás (default 30, máx 730)' },
      },
      additionalProperties: false,
    },
    async run(args) {
      const dias = Math.min(Math.max(typeof args.dias === 'number' ? args.dias : 30, 2), 730)
      const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
      const service = requireServiceClient()
      const { data, error } = await service
        .from('mag_inmag_history')
        .select('date, inmag_value')
        .gte('date', desde)
        .order('date', { ascending: true })
      if (error) return fail('Error leyendo el histórico INMAG.')
      const rows = (data || []).filter((r) => r.inmag_value != null) as Array<{ date: string; inmag_value: number }>
      if (rows.length === 0) return ok(`Sin datos INMAG en los últimos ${dias} días.`)
      const vals = rows.map((r) => Number(r.inmag_value))
      const first = vals[0], last = vals[vals.length - 1]
      const min = Math.min(...vals), max = Math.max(...vals)
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0
      // muestra: hasta ~8 puntos espaciados
      const step = Math.max(1, Math.floor(rows.length / 8))
      const sample = rows.filter((_, i) => i % step === 0 || i === rows.length - 1)
      return ok(
        `INMAG — últimos ${dias} días (${rows.length} ruedas, ARS/kg vivo)\n` +
          `Inicio (${rows[0].date}): ${fmt(first)} → Hoy (${rows[rows.length - 1].date}): ${fmt(last)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%)\n` +
          `Mínimo: ${fmt(min)} · Máximo: ${fmt(max)}\n\nSerie:\n` +
          sample.map((r) => `  ${r.date}: ${fmt(Number(r.inmag_value))}`).join('\n') +
          '\n\n' + JSON.stringify({ dias, inicio: first, fin: last, change_pct: Math.round(changePct * 10) / 10, min, max, ruedas: rows.length }),
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
      'Índice de Liquidación: participación de HEMBRAS (vacas + vaquillonas) en la hacienda operada en el Mercado Agroganadero (Cañuelas) — indicador ADELANTADO de liquidación (descarga de vientres) vs. retención (armado de rodeo). Sin args. Devuelve la lectura fresca de Cañuelas (mensual, 2026→) y el contexto histórico de la faena de hembras NACIONAL (1998-2019). Ojo: Cañuelas corre estructuralmente por encima de la faena nacional — no comparar 1:1.',
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
        kg_ha: { type: 'number', description: 'Kg de novillo por hectárea por mes (típico 3-6)' },
        hectareas: { type: 'number', description: 'Cantidad de hectáreas' },
        precio_novillo: { type: 'number', description: 'Precio del novillo ARS/kg (default: INMAG actual)' },
      },
      required: ['kg_ha', 'hectareas'],
      additionalProperties: false,
    },
    async run(args) {
      const kgHa = Number(args.kg_ha)
      const hectareas = Number(args.hectareas)
      // Índice oficial del MAG para arrendamientos (haciinfo000013), si el scrape lo trajo.
      const oficial = (prices as { arrendamientoOficial?: { index: number; date: string; periodIndex?: number | null } }).arrendamientoOficial
      const custom = Number.isFinite(Number(args.precio_novillo)) && Number(args.precio_novillo) > 0
      const precio = custom ? Number(args.precio_novillo) : (oficial?.index ?? prices.inmag.current)
      const fuentePrecio = custom
        ? 'precio provisto'
        : oficial
          ? `índice oficial de arrendamiento MAG ${oficial.date}`
          : 'INMAG del día'
      if (!Number.isFinite(kgHa) || kgHa <= 0 || !Number.isFinite(hectareas) || hectareas <= 0)
        return fail('kg_ha y hectareas deben ser números positivos.')
      const canonMensual = kgHa * hectareas * precio
      const canonAnual = canonMensual * 12
      const canonHaMes = kgHa * precio
      return ok(
        `Arrendamiento — ${kgHa} kg novillo/ha/mes · ${hectareas} ha · ${fmt(precio)}/kg (${fuentePrecio})\n` +
          `Canon mensual: ${fmt(canonMensual)}\n` +
          `Canon anual: ${fmt(canonAnual)}\n` +
          `Por hectárea/mes: ${fmt(canonHaMes)}\n\n` +
          JSON.stringify({ canon_mensual: Math.round(canonMensual), canon_anual: Math.round(canonAnual), canon_ha_mes: Math.round(canonHaMes), kg_ha: kgHa, hectareas, precio_novillo: precio, fuente_precio: fuentePrecio, indice_arrendamiento_oficial: oficial ?? null }) +
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
    name: 'crear_alerta_precio',
    description:
      'Crea una alerta: cuando el precio de una categoría cruza el umbral, avisa a tu webhook https (POST price.threshold_crossed). Única tool de escritura (el resto lee). REQUIERE API key Enterprise (Bearer cnsg_live_… o param api_key; alta en /cuenta/api-keys). Params: categoria (inmag=índice diario; resto semanal), umbral ARS/kg vivo, direccion above|below (def above), webhook_url. Devuelve id y precio.',
    requiresAuth: true,
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
      // Auth: header Authorization: Bearer cnsg_live_..., o el arg api_key como fallback
      // (algunos clientes MCP no mandan headers custom fácil — hacerlo descubrible por schema).
      let authReq = req
      const apiKeyArg = typeof args.api_key === 'string' ? args.api_key.trim() : ''
      if (!req.headers.get('authorization') && apiKeyArg) {
        const headers = new Headers(req.headers)
        headers.set('authorization', apiKeyArg.toLowerCase().startsWith('bearer ') ? apiKeyArg : `Bearer ${apiKeyArg}`)
        authReq = new NextRequest(req.url, { headers })
      }
      const auth = await authenticate(authReq)
      if (!auth.ok) {
        let reason = ''
        try { const b = await auth.response.json(); reason = b?.error?.message || '' } catch { /* ignore */ }
        return fail(
          `${reason || 'No autorizado.'}\n\nCómo autenticar (elegí una):\n` +
            `1) Header del cliente MCP: "headers": { "Authorization": "Bearer cnsg_live_..." }\n` +
            `2) El parámetro api_key de esta tool.\n` +
            `Gestioná tu key en https://www.consignatarias.com.ar/cuenta/api-keys · planes en https://www.consignatarias.com.ar/planes`,
        )
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
      let current: number | null = null
      try { current = await getCurrentPrice(service, categoria) } catch { /* best-effort */ }
      const { data, error } = await service
        .from('price_alerts')
        .insert({ user_id: auth.key.userId, webhook_url: webhook, category: categoria, threshold: umbral, direction: direccion, last_value: current, status: 'active', source: 'api' })
        .select('id')
        .single()
      if (error) return fail('No se pudo crear la alerta.')
      return ok(
        `Alerta creada (#${data.id}). Te aviso al webhook cuando el ${categoryLabel(categoria)} ` +
          `${direccion === 'above' ? 'cruce' : 'baje de'} ${fmt(umbral)}. Precio hoy: ${current != null ? fmt(current) : 's/d'}.`,
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
      { name: 'kg_ha', description: 'Kilos de novillo por hectárea pactados', required: true },
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
  const v = pv && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(pv) ? pv : LATEST_PROTOCOL_VERSION
  return { 'Cache-Control': 'no-store', 'MCP-Protocol-Version': v }
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
      // Negociación: si el cliente pide una versión que soportamos, la devolvemos; si no,
      // la última. Preferimos el protocolVersion del body; si falta, el del header.
      const requested = (params?.protocolVersion as string) || pv
      const negotiated =
        requested && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION
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
          'Todas son de lectura y públicas, salvo crear_alerta_precio, que REQUIERE API key de un plan Enterprise: pasala por el header Authorization: Bearer cnsg_live_... o por el parámetro api_key. Alta en https://www.consignatarias.com.ar/cuenta/api-keys',
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
