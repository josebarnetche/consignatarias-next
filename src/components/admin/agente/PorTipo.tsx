import { createAdminClient } from '@/lib/supabase-server'
import { AdminSection, AdminEmpty } from '@/components/admin/kit'
import Badge, { type BadgeTone } from '@/components/ui/Badge'
import { estimateOperation } from '@/lib/leads/routing'
import { canonEnPlata } from '@/lib/valuacion-campos'
import { tipoDeIntent, valuarLead, type Valuacion } from '@/lib/agente/tipos'
import { kgHaMesTipico, resumenPorTipo, type EstadoEnvio, type LeadAbierto } from '@/lib/agente/por-tipo'

/**
 * /admin/agente → "Por tipo de operación": la plata de los leads abiertos que el
 * agente trabaja y la que todavía no toca, con lo que la frena.
 */

const nf = (n: number) => n.toLocaleString('es-AR')
const ars = (n: number) => `$${nf(Math.round(n))}`
const ABIERTOS = ['new', 'needs_review', 'routed', 'contacted']

const ENVIO: Record<EstadoEnvio, { label: string; tone: BadgeTone }> = {
  sale: { label: 'Lo trabaja', tone: 'positive' },
  bloqueo_legal: { label: 'Bloqueo legal', tone: 'negative' },
  sin_comision: { label: 'Sin comisión definida', tone: 'warning' },
  sin_contraparte: { label: 'Sin contraparte', tone: 'neutral' },
}

interface LeadFila extends LeadAbierto {
  head_count: number | null
  category: string | null
  hectareas: number | null
}

export default async function PorTipo() {
  const db = createAdminClient()
  const [leadsQ, casosQ] = await Promise.all([
    db.from('producer_leads').select('id,intent,province,head_count,category,hectareas').in('status', ABIERTOS),
    db.from('agente_casos').select('lead_id,estado'),
  ])
  if (leadsQ.error) {
    return (
      <AdminSection title="Por tipo de operación">
        <AdminEmpty>No se pudieron leer los leads abiertos.</AdminEmpty>
      </AdminSection>
    )
  }
  const leads = (leadsQ.data ?? []) as LeadFila[]
  const casos = (casosQ.data ?? []) as Array<{ lead_id: number; estado: string }>
  const enAgente = new Set(casos.map((c) => c.lead_id))
  // Lo que el agente ya descartó o cerró no es plata a trabajar: así la tabla cuadra con "Potencial".
  const terminados = new Set(casos.filter((c) => ['descartado', 'dormido', 'retirado', 'cerrado'].includes(c.estado)).map((c) => c.lead_id))
  const precioNovilloKg = canonEnPlata(1, 1).referencia

  const valuar = (l: LeadAbierto): Valuacion | null => {
    const f = l as LeadFila
    if (tipoDeIntent(f.intent) === 'hacienda') {
      const e = estimateOperation({ headCount: f.head_count, category: f.category })
      return { tipo: 'hacienda', brutoArs: e.estimatedValueArs, comisionArs: e.feeArs }
    }
    return valuarLead(
      { intent: f.intent, hectareas: f.hectareas, head_count: f.head_count, category: f.category },
      { precioNovilloKg, pesoKg: () => 0, kgHaMesTipico: kgHaMesTipico(f.province) },
    )
  }
  const filas = resumenPorTipo(leads, enAgente, valuar, terminados)

  return (
    <AdminSection
      title="Por tipo de operación"
      action={<span className="text-xxs text-zinc-500 font-terminal">leads que se pueden trabajar · valores de referencia</span>}
      flush
    >
      {filas.length === 0 ? (
        <AdminEmpty>No hay leads abiertos de ningún tipo.</AdminEmpty>
      ) : (
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th className="num">Leads</th>
              <th className="num hidden sm:table-cell">En el agente</th>
              <th className="num hidden md:table-cell">Bruto de referencia</th>
              <th className="num">Comisión</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.tipo}>
                <td className="text-ink">{f.label}</td>
                <td className="num">{nf(f.leads)}</td>
                <td className="num hidden sm:table-cell">{nf(f.enAgente)}</td>
                <td className="num hidden md:table-cell text-zinc-400">
                  {f.brutoArs ? ars(f.brutoArs) : '—'}
                  {f.sinEstimar ? <span className="text-xxs text-zinc-500"> · {f.sinEstimar} sin datos</span> : null}
                </td>
                <td className="num">{f.comisionArs ? ars(f.comisionArs) : '—'}</td>
                <td>
                  <Badge tone={ENVIO[f.envio].tone}>{ENVIO[f.envio].label}</Badge>
                  {f.motivo && <div className="mt-1 text-xxs text-zinc-500 max-w-xs">{f.motivo}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminSection>
  )
}
