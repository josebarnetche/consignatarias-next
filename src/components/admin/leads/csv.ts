import { KIND_LABEL, OUTCOME_LABEL, type ActivityRow } from '@/lib/leads/activity'
import type { Lead } from './model'

/**
 * Export CSV — la copia local del pipeline. Columnas IDÉNTICAS a las del export
 * anterior (no cambiarlas: hay planillas que las leen por nombre).
 *
 * Una fila por ACTIVIDAD, no por lead: el lead solo dice dónde quedó; lo que hace
 * falta llevarse es el trabajo. Un lead sin actividad igual sale, con las columnas
 * de bitácora vacías, para que el export sea el pipeline completo y no sólo lo
 * que se trabajó.
 */
export function exportLeadsCsv(leads: Lead[], activity: Record<number, ActivityRow[]>) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const cols = [
    'lead_id', 'fecha_lead', 'estado', 'intent', 'categoria', 'cabezas', 'hectareas',
    'provincia', 'zona', 'nombre', 'telefono', 'email', 'mensaje', 'origen',
    'valor_estimado_ars', 'fee_ars', 'ruteado_a', 'notas',
    'act_fecha', 'act_tipo', 'act_resultado', 'act_detalle', 'act_actor',
  ]
  const filas: string[] = [cols.join(',')]

  for (const l of leads) {
    const base = [
      l.id, l.created_at, l.status, l.intent, l.category, l.head_count, l.hectareas,
      l.province, l.zona, l.name, l.phone, l.email, l.message, l.source,
      l.estimated_value_ars, l.fee_ars, l.routed_to_slug, l.notes,
    ]
    const acts = (activity[l.id] ?? []).slice().reverse() // cronológico en el archivo
    if (acts.length === 0) {
      filas.push([...base, '', '', '', '', ''].map(esc).join(','))
      continue
    }
    for (const a of acts) {
      filas.push(
        [...base, a.created_at, KIND_LABEL[a.kind] ?? a.kind, a.outcome ? OUTCOME_LABEL[a.outcome] : '', a.body, a.actor]
          .map(esc)
          .join(','),
      )
    }
  }

  // BOM para que Excel en Windows no rompa los acentos.
  const blob = new Blob(['﻿' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
