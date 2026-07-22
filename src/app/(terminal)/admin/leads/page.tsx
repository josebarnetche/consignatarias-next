'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Phone, Mail, MapPin, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { computeSpread } from '@/lib/leads/spread'

interface Lead {
  id: number
  created_at: string
  intent: string
  category: string | null
  head_count: number | null
  hectareas: number | null
  desired_price_ars: number | null
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

  // --- #3 Ritmo (funnel): leads por día (14d) + por origen ---
  const byDay = (() => {
    const map = new Map<string, number>()
    for (const l of leads) { const d = l.created_at.slice(0, 10); map.set(d, (map.get(d) || 0) + 1) }
    const days: Array<{ key: string; count: number }> = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today); dt.setDate(dt.getDate() - i)
      const key = dt.toISOString().slice(0, 10)
      days.push({ key, count: map.get(key) || 0 })
    }
    return days
  })()
  const maxDay = Math.max(1, ...byDay.map((d) => d.count))
  const bySource = (() => {
    const map = new Map<string, number>()
    for (const l of leads) { const s = l.source || '—'; map.set(s, (map.get(s) || 0) + 1) }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  })()

  // --- #4 Matching (comisionista): cruzar puntas opuestas de leads vivos ---
  const norm = (s: string | null) => (s || '').toLowerCase().trim()
  const alive = leads.filter((l) => ['new', 'routed', 'contacted'].includes(l.status))
  const cattleMatches: Array<{ s: Lead; b: Lead }> = []
  for (const s of alive.filter((l) => l.intent === 'vender')) {
    for (const b of alive.filter((l) => l.intent === 'comprar')) {
      if (s.category && b.category && norm(s.category) === norm(b.category)) cattleMatches.push({ s, b })
    }
  }
  const landMatches: Array<{ o: Lead; k: Lead }> = []
  for (const o of alive.filter((l) => l.intent === 'arrendar_ofrezco')) {
    for (const k of alive.filter((l) => l.intent === 'arrendar_busco')) {
      if (o.province && k.province && norm(o.province) === norm(k.province)) landMatches.push({ o, k })
    }
  }
  const hasMatches = cattleMatches.length > 0 || landMatches.length > 0

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

      {/* #3 Ritmo (funnel) — leads por día (14d) + por origen */}
      {leads.length > 0 && (
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Ritmo · últimos 14 días</p>
            <div className="flex items-end gap-1" style={{ height: 56 }}>
              {byDay.map((d) => (
                <div key={d.key} className="group relative flex-1" title={`${d.key}: ${d.count}`}>
                  <div
                    className={`w-full rounded-sm ${d.count > 0 ? 'bg-sky-500/70' : 'bg-zinc-800'}`}
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 52)}px` }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-600">{byDay.reduce((a, d) => a + d.count, 0)} leads en 14 días</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Por origen</p>
            <div className="flex flex-wrap gap-2">
              {bySource.map(([src, n]) => (
                <span key={src} className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-300">
                  {src} <span className="font-semibold text-sky-300">{n}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* #4 Matching (comisionista) — cruces posibles entre puntas opuestas */}
      {leads.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-amber-300">Cruces posibles · las dos puntas</p>
          {!hasMatches ? (
            <p className="text-sm text-zinc-500">Sin cruces todavía — hacen falta las dos puntas (comprador ↔ vendedor de la misma categoría, u ofrezco ↔ busco campo de la misma provincia).</p>
          ) : (
            <div className="space-y-2">
              {cattleMatches.map(({ s, b }, i) => (
                <div key={`c${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">VENDE</span>
                  <span className="text-white">{s.name}</span>
                  <span className="text-zinc-500">{s.head_count ? `${s.head_count} ${s.category}` : s.category}{s.desired_price_ars ? ` · pide ${ars(s.desired_price_ars)}` : ''}</span>
                  <span className="text-amber-400">↔</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">COMPRA</span>
                  <span className="text-white">{b.name}</span>
                  <span className="text-zinc-500">{b.category}{b.province ? ` · ${b.province}` : ''}</span>
                </div>
              ))}
              {landMatches.map(({ o, k }, i) => (
                <div key={`l${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">OFRECE campo</span>
                  <span className="text-white">{o.name}</span>
                  <span className="text-zinc-500">{o.hectareas ? `${o.hectareas} ha` : ''} · {o.province}</span>
                  <span className="text-amber-400">↔</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">BUSCA campo</span>
                  <span className="text-white">{k.name}</span>
                  <span className="text-zinc-500">{k.hectareas ? `${k.hectareas} ha` : ''} · {k.province}</span>
                </div>
              ))}
            </div>
          )}
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
                      {(() => {
                        const bits = [
                          l.head_count ? `${l.head_count.toLocaleString('es-AR')} cab` : null,
                          l.hectareas ? `${l.hectareas.toLocaleString('es-AR')} ha` : null,
                          l.category,
                          l.desired_price_ars ? `pide ${ars(l.desired_price_ars)}` : null,
                        ].filter(Boolean)
                        return bits.length ? <span className="text-xs text-zinc-500">{bits.join(' · ')}</span> : null
                      })()}
                      {(() => {
                        const sp = computeSpread(l.category, l.desired_price_ars)
                        if (!sp) return null
                        const over = sp.spreadPct > 3
                        return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${over ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`} title={`pide vs mercado ${ars(sp.marketPrice)}/kg`}>{sp.spreadPct >= 0 ? '+' : ''}{sp.spreadPct.toFixed(0)}% vs mercado</span>
                      })()}
                      <span className="text-xs text-zinc-600">#{l.id} · {fmtDate(l.created_at)}{l.source ? ` · ${l.source}` : ''}</span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{l.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {l.phone && <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-sky-400"><Phone className="h-3.5 w-3.5" />{l.phone}</a>}
                      {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-sky-400"><Mail className="h-3.5 w-3.5" />{l.email}</a>}
                      {(l.zona || l.province) && <span className="flex items-center gap-1 text-zinc-400"><MapPin className="h-3.5 w-3.5" />{[l.zona, l.province].filter(Boolean).join(', ')}</span>}
                    </div>
                    {l.message && <p className="mt-2 border-l-2 border-zinc-700 pl-2 text-sm text-zinc-400">&ldquo;{l.message}&rdquo;</p>}
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
