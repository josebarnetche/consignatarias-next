import { createAdminClient } from '@/lib/supabase-server'
import { AdminSection, AdminEmpty } from '@/components/admin/kit'
import { armarEmbudoMcp, BASE_MCP, type LlamadaMcp, type PedidoMcp } from '@/lib/agente/embudo-mcp'
import { fuenteDemanda } from '@/lib/agente/demanda'

/**
 * /admin/agente → "Del MCP a la operación". Uso de los últimos 7 días contra la
 * base del 22-10; pedidos desde la base, en rangos (src/lib/agente/embudo-mcp.ts).
 */

const nf = (n: number) => n.toLocaleString('es-AR')
const signo = (n: number) => `${n > 0 ? '+' : ''}${n}%`
const DESDE_BASE = '2026-10-22T00:00:00-03:00'
const PAGINA = 1000

async function llamadasSemana(db: ReturnType<typeof createAdminClient>): Promise<LlamadaMcp[] | null> {
  const desde = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const filas: LlamadaMcp[] = []
  // PostgREST corta en 1000 filas: se pagina (son ~1.500 tools/call por semana).
  for (let i = 0; i < 20; i++) {
    const { data, error } = await db
      .from('ops_events')
      .select('ip:metadata->>ip,ua:metadata->>ua,has_auth:metadata->has_auth,probe:metadata->>probe,tool:metadata->>tool,canonico:metadata->>canonico')
      .eq('event_type', 'mcp_call')
      .eq('metadata->>method', 'tools/call')
      .gte('created_at', desde)
      .order('id')
      .range(i * PAGINA, (i + 1) * PAGINA - 1)
    if (error) return null
    filas.push(...((data ?? []) as unknown as LlamadaMcp[]))
    if (!data || data.length < PAGINA) break
  }
  return filas
}

async function pedidosDesdeBase(db: ReturnType<typeof createAdminClient>): Promise<PedidoMcp[]> {
  const [mcpQ, demQ] = await Promise.all([
    db.from('producer_leads').select('id,status').like('source', 'mcp:%').gte('created_at', DESDE_BASE),
    db.from('demanda_compra').select('id').eq('origen', 'mcp').gte('created_at', DESDE_BASE),
  ])
  const demandas = (demQ.data ?? []).map((d) => fuenteDemanda(d.id))
  const { data: deDemanda } = demandas.length
    ? await db.from('producer_leads').select('id,status,source').in('source', demandas)
    : { data: [] as Array<{ id: number; status: string; source: string | null }> }
  const leads = [...(mcpQ.data ?? []), ...(deDemanda ?? [])]
  const { data: casos } = leads.length
    ? await db.from('agente_casos').select('lead_id,estado').in('lead_id', leads.map((l) => l.id))
    : { data: [] as Array<{ lead_id: number; estado: string }> }
  const caso = new Map((casos ?? []).map((c) => [c.lead_id, c.estado]))
  // Una demanda del MCP sin consentimiento no llega a ser lead: cuenta como pedido sin verificar.
  const sinLead = demandas.length - (deDemanda ?? []).length
  return [
    ...leads.map((l) => ({ status: l.status, caso: caso.get(l.id) ?? null })),
    ...Array.from({ length: sinLead }, () => ({ status: 'needs_review', caso: null })),
  ]
}

export default async function EmbudoMcp() {
  const db = createAdminClient()
  const [llamadas, pedidos] = await Promise.all([llamadasSemana(db), pedidosDesdeBase(db)])
  if (!llamadas) {
    return (
      <AdminSection title="Del MCP a la operación">
        <AdminEmpty>No se pudo leer el uso del MCP.</AdminEmpty>
      </AdminSection>
    )
  }
  const e = armarEmbudoMcp(llamadas, pedidos)
  const pasos = [
    { valor: nf(e.toolsCall), label: 'consultas reales · 7 días', sub: `${signo(e.vsBase.toolsCall)} vs base` },
    { valor: nf(e.origenes), label: 'orígenes distintos', sub: `${signo(e.vsBase.origenes)} vs base · ${nf(e.anonimas)} consultas de la integración anónima` },
    { valor: nf(e.puente), label: 'pedidos de operar', sub: 'market_match + cattle_buying_request' },
    { valor: e.pedidos, label: 'pedidos cargados', sub: `desde el ${BASE_MCP.fecha} · base ${BASE_MCP.pedidos}` },
    { valor: e.verificados, label: 'verificados', sub: 'el mail es de quien pide' },
    { valor: e.enOperacion, label: 'en operación', sub: 'el agente los ofrece o presentó' },
  ]
  return (
    <AdminSection title="Del MCP a la operación">
      <ol className="flex flex-wrap gap-x-6 gap-y-3">
        {pasos.map((p, i) => (
          <li key={p.label} className="font-terminal min-w-[8rem]">
            <div className="text-lg tabular-nums leading-none text-ink">
              {i > 0 && <span className="text-zinc-600 mr-1.5">→</span>}
              {p.valor}
            </div>
            <div className="text-xxs text-zinc-400 mt-1">{p.label}</div>
            <div className="text-xxs text-zinc-600">{p.sub}</div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xxs text-zinc-500 font-terminal">
        Sin escáneres. Base: semana del 12-10 en docs/mcp-medicion-base.md (orígenes por IP). Los pedidos van en rangos, no en conteos exactos.
      </p>
    </AdminSection>
  )
}
