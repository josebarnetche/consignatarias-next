'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Phone, Mail, MapPin, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui'

interface Lead {
  id: number
  created_at: string
  intent: string
  category: string | null
  head_count: number | null
  province: string | null
  zona: string | null
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string | null
  estimated_value_ars: number | null
  fee_pct: number
  fee_ars: number | null
  status: string
  routed_to_slug: string | null
  notes: string | null
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  openFeePotential: number
  wonFee: number
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nuevo', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  routed: { label: 'Ruteado', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  contacted: { label: 'Contactado', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  won: { label: 'Ganado', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  lost: { label: 'Perdido', cls: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30' },
}
const INTENT_LABEL: Record<string, string> = {
  vender: 'Vender', comprar: 'Comprar', arrendar: 'Arrendar', consignar: 'Consignar', tasar: 'Tasar',
}
const NEXT_STATUS = ['new', 'routed', 'contacted', 'won', 'lost']

const ars = (n: number | null | undefined) => (n ? '$' + Math.round(n).toLocaleString('es-AR') : '—')
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leads')
      const j = await res.json()
      if (res.ok) { setLeads(j.leads || []); setStats(j.stats || null) }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function patch(id: number, body: Record<string, unknown>) {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      const j = await res.json()
      if (res.ok && j.lead) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...j.lead } : l)))
        load() // refresca stats
      }
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Leads de productores</h1>
          <p className="text-sm text-zinc-500">Máquina de lead-gen a performance · ruteá por WhatsApp, cobrás {leads[0]?.fee_pct ?? 1}% al cierre</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-500">Total leads</p>
            <p className="text-2xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-xs text-zinc-500">Vivos (new+ruteado+contactado)</p>
            <p className="text-2xl font-semibold text-sky-300">{(stats.byStatus.new || 0) + (stats.byStatus.routed || 0) + (stats.byStatus.contacted || 0)}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="flex items-center gap-1 text-xs text-zinc-500"><TrendingUp className="h-3 w-3" /> Fee potencial (vivos)</p>
            <p className="text-2xl font-semibold text-emerald-300">{ars(stats.openFeePotential)}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-zinc-500">Fee ganado</p>
            <p className="text-2xl font-semibold text-emerald-300">{ars(stats.wonFee)}</p>
          </div>
        </div>
      )}

      {loading && leads.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">Cargando…</p>
      ) : leads.length === 0 ? (
        <EmptyState icon="glifo-novillo" title="Todavía no hay leads" sub="Cuando un productor use las herramientas y pida ser contactado, aparece acá." />
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const meta = STATUS_META[l.status] || STATUS_META.new
            return (
              <div key={l.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                      <span className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{INTENT_LABEL[l.intent] || l.intent}</span>
                      {l.head_count ? <span className="text-xs text-zinc-500">{l.head_count.toLocaleString('es-AR')} cab{l.category ? ` · ${l.category}` : ''}</span> : l.category ? <span className="text-xs text-zinc-500">{l.category}</span> : null}
                      <span className="text-xs text-zinc-600">#{l.id} · {fmtDate(l.created_at)}{l.source ? ` · ${l.source}` : ''}</span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{l.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {l.phone && <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-sky-400"><Phone className="h-3.5 w-3.5" />{l.phone}</a>}
                      {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-sky-400"><Mail className="h-3.5 w-3.5" />{l.email}</a>}
                      {(l.zona || l.province) && <span className="flex items-center gap-1 text-zinc-400"><MapPin className="h-3.5 w-3.5" />{[l.zona, l.province].filter(Boolean).join(', ')}</span>}
                    </div>
                    {l.message && <p className="mt-2 border-l-2 border-zinc-700 pl-2 text-sm text-zinc-400">"{l.message}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Operación est.</p>
                    <p className="font-mono text-sm text-zinc-300">{ars(l.estimated_value_ars)}</p>
                    <p className="mt-1 text-xs text-zinc-500">Fee {l.fee_pct}%</p>
                    <p className="font-mono text-sm font-semibold text-emerald-400">{ars(l.fee_ars)}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
                  <select
                    value={l.status}
                    onChange={(e) => patch(l.id, { status: e.target.value })}
                    disabled={savingId === l.id}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500/60"
                  >
                    {NEXT_STATUS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                  <input
                    defaultValue={l.routed_to_slug || ''}
                    placeholder="rutear a (slug de firma)"
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (l.routed_to_slug || '')) patch(l.id, { routed_to_slug: v }) }}
                    className="w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500/60"
                  />
                  {l.status === 'won' && (
                    <input
                      defaultValue={l.fee_ars ?? ''}
                      placeholder="fee real $"
                      inputMode="numeric"
                      onBlur={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v) patch(l.id, { fee_ars: Number(v) }) }}
                      className="w-32 rounded-lg border border-emerald-700 bg-zinc-900 px-2 py-1.5 text-sm text-emerald-300 outline-none"
                    />
                  )}
                  <input
                    defaultValue={l.notes || ''}
                    placeholder="notas de ruteo…"
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (l.notes || '')) patch(l.id, { notes: v }) }}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-300 outline-none focus:border-sky-500/60"
                  />
                  {savingId === l.id && <span className="text-xs text-zinc-500">guardando…</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
