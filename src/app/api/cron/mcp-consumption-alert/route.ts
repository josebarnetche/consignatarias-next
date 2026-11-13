import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMcpConsumptionAlert, type McpConsumptionEvent } from '@/lib/email'
import { esProxyLLM, isNoise, resolverCliente } from '@/lib/mcp-alert-cliente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Alerta el PRIMER consumo MCP real e identificable: un `tools/call` cuyo
 * cliente tiene nombre (no un crawler anónimo ni una prueba). Es el único
 * evento del MCP que vale la pena seguir — el resto es discovery/ruido.
 *
 * ⚠️ El clientInfo SOLO se registra en `initialize`; las filas `tools/call`
 * nunca traen `metadata.client` (0 de 13.550 en 60 días al 02-11-2026). Hasta
 * esta versión la alerta lo buscaba ahí y daba `real_found: 0` por diseño.
 * Ahora el nombre se resuelve por `origen` contra su `initialize`, con el
 * user-agent como respaldo (ver `resolverCliente`).
 *
 * Dedup por watermark: guarda el id máximo procesado como un evento marcador
 * (`mcp_alert_watermark`) en ops_events; cada corrida sólo mira ids nuevos.
 * Auth: header x-cron-secret / ?secret= (= CRON_SECRET). Schedule: GitHub Actions.
 */

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\r\n$/, '').trim()
  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()

  // 1) Watermark: mayor id ya procesado.
  const { data: wm } = await supabase
    .from('ops_events')
    .select('metadata')
    .eq('event_type', 'mcp_alert_watermark')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  const watermark = Number((wm?.metadata as { max_id?: number } | null)?.max_id ?? 0)

  // 2) tools/call nuevos (id > watermark).
  const { data: rows, error } = await supabase
    .from('ops_events')
    .select('id, created_at, metadata')
    .eq('event_type', 'mcp_call')
    .filter('metadata->>method', 'eq', 'tools/call')
    .gt('id', watermark)
    .order('id', { ascending: true })
    .limit(1000)
  if (error) {
    console.error('mcp-consumption-alert: query failed', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const all = rows ?? []
  const newMaxId = all.reduce((m, r) => Math.max(m, r.id as number), watermark)

  // 3) clientInfo por origen: sale de los `initialize` de esos mismos orígenes.
  const origenes = [
    ...new Set(
      all
        .map((r) => ((r.metadata ?? {}) as Record<string, unknown>).origen)
        .filter((o): o is string => typeof o === 'string' && /^[0-9a-f]{8,64}$/i.test(o)),
    ),
  ]
  const clientePorOrigen = new Map<string, { name: string; version: string | null }>()
  for (let i = 0; i < origenes.length; i += 100) {
    const lote = origenes.slice(i, i + 100)
    const { data: inits, error: initErr } = await supabase
      .from('ops_events')
      .select('metadata')
      .eq('event_type', 'mcp_call')
      .filter('metadata->>method', 'eq', 'initialize')
      .filter('metadata->>origen', 'in', `(${lote.join(',')})`)
      .order('id', { ascending: false })
      .limit(1000)
    if (initErr) {
      // REGLA verificador-no-traga-errores: si no pudo mirar, no avanza el watermark.
      console.error('mcp-consumption-alert: initialize lookup failed', initErr)
      return NextResponse.json({ error: 'db_error_initialize' }, { status: 500 })
    }
    for (const row of inits ?? []) {
      const md = (row.metadata ?? {}) as Record<string, unknown>
      const c = (md.client ?? null) as { name?: string; version?: string } | null
      const o = md.origen as string | undefined
      if (o && c?.name?.trim() && !clientePorOrigen.has(o)) {
        clientePorOrigen.set(o, { name: c.name.trim(), version: c.version ?? null })
      }
    }
  }

  // 4) Filtrar: sólo cliente NOMBRADO y no-ruido (los escaneos `probe` tampoco cuentan).
  const real: McpConsumptionEvent[] = []
  for (const r of all) {
    const md = (r.metadata ?? {}) as Record<string, unknown>
    if (md.probe === true || esProxyLLM(md.args)) continue
    const client = resolverCliente(md, clientePorOrigen)
    const name = client?.name
    if (!name || isNoise(name)) continue
    real.push({
      tool: (md.tool as string) ?? 'desconocida',
      client: name,
      version: client?.version ?? null,
      at: new Date(r.created_at as string).toISOString(),
      args: md.args == null ? null : typeof md.args === 'string' ? md.args : JSON.stringify(md.args),
    })
  }

  let emailed = false
  if (real.length > 0) {
    const res = await sendMcpConsumptionAlert(real)
    emailed = res.success
    if (!res.success) console.error('mcp-consumption-alert: email failed', res.error)
  }

  // 5) Avanzar el watermark (aunque no haya "reales", para no re-escanear ruido).
  if (newMaxId > watermark) {
    await supabase.from('ops_events').insert({
      event_type: 'mcp_alert_watermark',
      status: 'ok',
      route: '/api/cron/mcp-consumption-alert',
      metadata: { max_id: newMaxId, real_found: real.length, emailed, scanned: all.length, origenes_resueltos: clientePorOrigen.size },
    })
  }

  return NextResponse.json({
    ok: true,
    scanned: all.length,
    watermark_from: watermark,
    watermark_to: newMaxId,
    real_consumption: real.length,
    emailed,
  })
}
