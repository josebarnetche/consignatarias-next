import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authenticate } from '@/lib/api-auth'
import { logEvent } from '@/lib/ops'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import frigorificosData from '@/lib/data/frigorificos.json'
import { isValidCategory, categoryLabel, getCurrentPrice, CATEGORY_VALUES } from '@/lib/price-alerts'

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
const PROTOCOL_VERSION = '2025-06-18'

// ── Tools (wrappers finos sobre data/lógica existente) ───────────────────────
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }
interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresAuth?: boolean
  run: (args: Record<string, unknown>, req: NextRequest) => Promise<ToolResult>
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
      'Índice Novillo (INMAG) del Mercado Agroganadero argentino: precio de referencia hoy en ARS/kg vivo, con variación diaria, volumen y tendencia. Es el índice DIARIO ponderado por volumen del canal formal MAG (métrica distinta de los precios por categoría de get_precios_hacienda, que son observación semanal).',
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
      'Evolución histórica del Índice Novillo (INMAG) en ARS/kg vivo. Devuelve valor inicial/final, variación, mínimo y máximo del período, y una muestra de la serie. Sirve para tendencia.',
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
      'Precios de hacienda por categoría (novillos, novillitos, vaquillonas, vacas, toros, terneros) en ARS/kg vivo — observación SEMANAL del SIO/Mercado Agroganadero. Es una métrica distinta del índice INMAG diario (get_indice_novillo): no comparar 1:1. Sin argumento devuelve todas.',
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
      'Precios por SUBCATEGORÍA del Mercado Agroganadero (ej. "NOVILLOS Regular +430", "VACAS Conserva Buena") con mínimo, promedio y máximo en ARS/kg vivo. Más granular que get_precios_hacienda. Filtro opcional por grupo (novillos/novillitos/vaquillonas/vacas/toros).',
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
      'Contexto macro del mercado ganadero argentino: dólar blue y oficial (ARS), maíz FOB (USD/tn), y el spread novillo/maíz (kg de maíz que compra un kg de novillo — proxy de rentabilidad de feedlot).',
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
    name: 'list_remates',
    description:
      'Próximos remates de hacienda en Argentina. Filtros opcionales: provincia y límite. Devuelve fecha, consignataria, ubicación, categoría y transmisión en vivo si hay.',
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
      'Busca consignatarias/casas de remate del directorio argentino por nombre, localidad o provincia. Devuelve nombre, ubicación, categoría, contacto y el perfil en consignatarias.com.ar.',
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
      'Ranking de actividad de las consignatarias en el Mercado Agroganadero de Cañuelas (el mercado concentrador que fija el precio de referencia, ~12% de la faena nacional): cabezas operadas y precio promedio por firma en un período. Es el dato del mercado de REFERENCIA, no el total nacional (buena parte del ganado se opera fuera de Cañuelas).',
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
      'Busca frigoríficos habilitados MAGYP/SENASA (1.100+ plantas) por nombre, provincia o CUIT. Devuelve nombre, provincia, CUIT, matrícula y ciclo. Filtro por provincia.',
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
      'Calcula el canon de arrendamiento rural argentino en pesos: kg de novillo por hectárea × hectáreas × precio del novillo. Por defecto usa el ÍNDICE SUGERIDO PARA ARRENDAMIENTOS RURALES oficial del MAG (haciinfo000013); si no está disponible, el INMAG del día.',
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
    name: 'crear_alerta_precio',
    description:
      'Crea una alerta de precio por umbral: cuando el precio de una categoría cruza el valor dado, se notifica por webhook (POST price.threshold_crossed). REQUIERE API KEY de un plan Enterprise. Autenticá de una de dos formas: (a) header del cliente MCP "headers": {"Authorization": "Bearer cnsg_live_..."}, o (b) el parámetro api_key de esta tool. Conseguí la key en https://www.consignatarias.com.ar/cuenta/api-keys',
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
function rpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } })
}
function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: { 'Cache-Control': 'no-store' } })
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
  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> }
  try {
    msg = await req.json()
  } catch {
    logMcp({ method: 'parse_error', ok: false, startedAt, meta: rmeta })
    return rpcError(null, -32700, 'Parse error')
  }
  const { id, method, params } = msg

  // Notificaciones (sin id) → 202 sin body. Se loguea igual: es señal de cliente vivo.
  if (id === undefined || id === null) {
    logMcp({ method: method ?? 'notification', ok: true, startedAt, meta: rmeta })
    return new NextResponse(null, { status: 202 })
  }

  switch (method) {
    case 'initialize':
      logMcp({ method: 'initialize', ok: true, startedAt, meta: { ...rmeta, client: params?.clientInfo ?? null } })
      return rpcResult(id, {
        protocolVersion: (params?.protocolVersion as string) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'Datos del mercado ganadero argentino. get_indice_novillo = índice INMAG DIARIO (ponderado por volumen); get_precios_hacienda = precios por categoría, observación SEMANAL — son métricas distintas, no las compares 1:1. Tools de lectura públicas. crear_alerta_precio REQUIERE API key de un plan Enterprise: pasala por el header Authorization: Bearer cnsg_live_... (config "headers" del cliente MCP) o por el parámetro api_key de la tool. Key en https://www.consignatarias.com.ar/cuenta/api-keys',
      })
    case 'ping':
      logMcp({ method: 'ping', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, {})
    case 'tools/list':
      logMcp({ method: 'tools/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      })
    case 'tools/call': {
      const name = params?.name as string
      const tool = TOOLS.find((t) => t.name === name)
      if (!tool) {
        logMcp({ method: 'tools/call', ok: false, startedAt, meta: { ...rmeta, tool: name ?? null, error: 'unknown_tool' } })
        return rpcError(id, -32602, `Tool desconocida: ${name}`)
      }
      const args = (params?.arguments as Record<string, unknown>) || {}
      try {
        const result = await tool.run(args, req)
        logMcp({ method: 'tools/call', ok: !result.isError, startedAt, meta: { ...rmeta, tool: name, args: redactArgs(args), is_error: result.isError ?? false } })
        return rpcResult(id, result)
      } catch (err) {
        console.error('[mcp] tool error', name, err)
        logMcp({ method: 'tools/call', ok: false, startedAt, meta: { ...rmeta, tool: name, args: redactArgs(args), error: 'exception' } })
        return rpcResult(id, { content: [{ type: 'text', text: 'Error interno ejecutando la tool.' }], isError: true })
      }
    }
    // Somos un server tools-only, pero los crawlers de registries/scoring probean
    // estas capabilities estándar. Antes caían al default → -32601 (400), lo que baja
    // el score de compatibilidad. Respondemos con listas vacías (spec-correcto).
    case 'prompts/list':
      logMcp({ method: 'prompts/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, { prompts: [] })
    case 'resources/list':
      logMcp({ method: 'resources/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, { resources: [] })
    case 'resources/templates/list':
      logMcp({ method: 'resources/templates/list', ok: true, startedAt, meta: rmeta })
      return rpcResult(id, { resourceTemplates: [] })

    default:
      logMcp({ method: method ?? 'unknown', ok: false, startedAt, meta: { ...rmeta, error: 'unsupported_method' } })
      return rpcError(id, -32601, `Método no soportado: ${method}`)
  }
}

// No ofrecemos stream server→cliente (tool-server stateless): GET → 405.
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed. Usá POST (JSON-RPC MCP).' }, { status: 405 })
}
