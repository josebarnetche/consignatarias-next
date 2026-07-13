import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendMcpConsumptionAlert, type McpConsumptionEvent } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Alerta el PRIMER consumo MCP real e identificable: un `tools/call` cuyo
 * clientInfo trae un nombre (no un crawler anónimo ni una prueba). Es el único
 * evento del MCP que vale la pena seguir — el resto es discovery/ruido.
 *
 * Dedup por watermark: guarda el id máximo procesado como un evento marcador
 * (`mcp_alert_watermark`) en ops_events; cada corrida sólo mira ids nuevos.
 * Auth: header x-cron-secret / ?secret= (= CRON_SECRET). Schedule: GitHub Actions.
 */

// Nombres a ignorar: crawlers/scoring/probes conocidos + clientes de prueba propios.
const DENY_EXACT = new Set(
  [
    'audit', 'deploy-probe', 'glama-healthcheck-sim', 'jose-spec-check', 'a', 'test',
    'glama', 'siglume mcp router', 'glimind-probe', 'agent-tools.cloud', 'agent-lab',
    'mcpexplorerbot', 'mcpscoringengine', 'aisec-registry-probe', 'capability-probe',
    'prsm-mcp-graph', 'verifymcp-probe', 'mcp-indexer', 'mcp-rugpull-research',
    'mcp-spec-check', 'agent-seo', 'mcp',
  ].map((s) => s.toLowerCase()),
)
// Heurística: cualquier cosa que huela a herramienta automatizada.
const DENY_RX = /probe|crawler|scanner|scoring|registry|spec[-_ ]?check|health[-_ ]?check|indexer|router|discover|inspector|monitor|uptime|glimind|siglume|\btest\b|bot\b/i

function isNoise(name: string): boolean {
  const n = name.trim().toLowerCase()
  return DENY_EXACT.has(n) || DENY_RX.test(n)
}

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

  // 3) Filtrar: sólo clientInfo NOMBRADO y no-ruido.
  const real: McpConsumptionEvent[] = []
  for (const r of all) {
    const md = (r.metadata ?? {}) as Record<string, unknown>
    const client = (md.client ?? null) as { name?: string; version?: string } | null
    const name = client?.name?.trim()
    if (!name || isNoise(name)) continue
    real.push({
      tool: (md.tool as string) ?? 'desconocida',
      client: name,
      version: client?.version ?? null,
      at: new Date(r.created_at as string).toISOString(),
      args: (md.args as string) ?? null,
    })
  }

  let emailed = false
  if (real.length > 0) {
    const res = await sendMcpConsumptionAlert(real)
    emailed = res.success
    if (!res.success) console.error('mcp-consumption-alert: email failed', res.error)
  }

  // 4) Avanzar el watermark (aunque no haya "reales", para no re-escanear ruido).
  if (newMaxId > watermark) {
    await supabase.from('ops_events').insert({
      event_type: 'mcp_alert_watermark',
      status: 'ok',
      route: '/api/cron/mcp-consumption-alert',
      metadata: { max_id: newMaxId, real_found: real.length, emailed },
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
