'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Phone, Mail, MapPin, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import LeadActivity from '@/components/admin/LeadActivity'
import { computeSpread, spreadReading } from '@/lib/leads/spread'
import type { ActivityRow } from '@/lib/leads/activity'
import { pendienteVerificacion } from '@/lib/agente/verificacion'
import {
  LEAD_STATUSES,
  siguientePaso,
  STATUS_META,
  ars,
  fmtFecha,
  intentLabel,
  origenDe,
  pareceTest,
  queBits,
  ubicacion,
  waLink,
  type Lead,
} from './model'

type PatchBody = { status?: string; routed_to_slug?: string; notes?: string; fee_ars?: number }

/** Campo de texto que guarda al salir (blur) o con Enter, y se resincroniza si el lead cambia. */
function useCampo(valor: string) {
  const [v, setV] = useState(valor)
  useEffect(() => setV(valor), [valor])
  return [v, setV] as const
}

export default function LeadDetail({
  lead: l,
  activity,
  saving,
  error,
  onPatch,
  onActivity,
  onClose,
}: {
  lead: Lead
  activity: ActivityRow[]
  saving: boolean
  error?: string | null
  onPatch: (body: PatchBody) => void
  onActivity: (rows: ActivityRow[]) => void
  onClose: () => void
}) {
  const [slug, setSlug] = useCampo(l.routed_to_slug || '')
  const [fee, setFee] = useCampo(l.fee_ars != null ? String(Math.round(l.fee_ars)) : '')
  const [notas, setNotas] = useCampo(l.notes || '')

  const wa = waLink(l.phone, `Hola ${l.name.split(' ')[0]}, te escribimos de Consignatarias por tu consulta.`)
  const sp = computeSpread(l.category, l.desired_price_ars)
  const next = siguientePaso(l)
  const sinVerificar = pendienteVerificacion(l)
  const meta = STATUS_META[l.status] ?? STATUS_META.new
  const ubic = ubicacion(l)
  const bits = queBits(l)

  const guardarSlug = () => {
    const t = slug.trim()
    if (t !== (l.routed_to_slug || '')) onPatch({ routed_to_slug: t })
  }
  const guardarFee = () => {
    const d = fee.replace(/\D/g, '')
    if (d && Number(d) !== Math.round(l.fee_ars ?? -1)) onPatch({ fee_ars: Number(d) })
  }
  const guardarNotas = () => {
    const t = notas.trim()
    if (t !== (l.notes || '')) onPatch({ notes: t })
  }
  const enterGuarda = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  return (
    <div className="space-y-4 px-panel py-3">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={l.intent === 'vender' ? 'positive' : l.intent === 'comprar' ? 'accent' : 'neutral'}>{intentLabel(l.intent)}</Badge>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {pareceTest(l) && <Badge tone="warning">¿Prueba?</Badge>}
          </div>
          <h2 className="mt-1.5 text-lg font-terminal leading-tight text-ink">{l.name}</h2>
          <p className="text-xxs text-zinc-500 tabular-nums">
            #{l.id} · {fmtFecha(l.created_at)} ·{' '}
            {l.origen?.href ? (
              <a href={l.origen.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {origenDe(l)}
              </a>
            ) : (
              origenDe(l)
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-zinc-500 hover:text-ink" aria-label="Cerrar detalle" title="Cerrar (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Contacto */}
      <div className="flex flex-wrap gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="terminal-btn-primary gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
        {l.phone && (
          <a href={`tel:${l.phone}`} className="terminal-btn gap-1.5 normal-case tracking-normal">
            <Phone className="h-3.5 w-3.5" /> {l.phone}
          </a>
        )}
        {l.email && (
          <a href={`mailto:${l.email}`} className="terminal-btn max-w-full gap-1.5 normal-case tracking-normal">
            <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{l.email}</span>
          </a>
        )}
        {!l.phone && !l.email && <p className="text-xxs text-negative">Sin teléfono ni email.</p>}
      </div>
      {l.phone && !wa && <p className="-mt-2 text-xxs text-zinc-500">El teléfono no parece un celular argentino válido; WhatsApp no abriría.</p>}

      {/* Qué pide */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-data">
        <div className="col-span-2">
          <dt className="text-xxs uppercase tracking-wider text-zinc-500">Qué</dt>
          <dd className="text-zinc-300">{bits.length ? bits.join(' · ') : '—'}</dd>
          {sp && (
            <dd className={`text-xxs ${sp.spreadPct > 3 ? 'text-warning' : 'text-positive'}`}>
              {sp.spreadPct >= 0 ? '+' : ''}
              {sp.spreadPct.toFixed(0)}% vs. mercado ({ars(sp.marketPrice)}/kg) — {spreadReading(sp.spreadPct)}
            </dd>
          )}
        </div>
        {ubic && (
          <div className="col-span-2">
            <dt className="text-xxs uppercase tracking-wider text-zinc-500">Dónde</dt>
            <dd className="flex items-center gap-1 text-zinc-300">
              <MapPin className="h-3.5 w-3.5 text-zinc-500" /> {ubic}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xxs uppercase tracking-wider text-zinc-500">Operación est.</dt>
          <dd className="tabular-nums text-zinc-300">{ars(l.estimated_value_ars)}</dd>
        </div>
        <div>
          <dt className="text-xxs uppercase tracking-wider text-zinc-500">Fee {l.fee_pct}%</dt>
          <dd className="tabular-nums text-positive">{ars(l.fee_ars)}</dd>
        </div>
      </dl>

      {l.message && (
        <blockquote className="whitespace-pre-line break-words border-l-2 border-terminal-border pl-3 text-data text-zinc-300">
          {l.message}
        </blockquote>
      )}

      {/* Trabajo */}
      <div className="space-y-3 border-t border-terminal-border pt-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xxs uppercase tracking-wider text-zinc-500">Estado</span>
            <select
              value={l.status}
              onChange={(e) => onPatch({ status: e.target.value })}
              disabled={saving}
              className="terminal-input py-1.5 text-sm"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          {next && (
            <button type="button" onClick={() => onPatch({ status: next })} disabled={saving} className="terminal-btn disabled:opacity-40">
              {sinVerificar ? 'Contacto verificado → al agente' : `Pasar a ${STATUS_META[next].label.toLowerCase()}`}
            </button>
          )}
          {l.status !== 'discarded' && (
            <button
              type="button"
              onClick={() => onPatch({ status: 'discarded' })}
              disabled={saving}
              className="terminal-btn hover:border-negative hover:text-negative disabled:opacity-40"
            >
              Descartar
            </button>
          )}
          {saving && <span className="pb-2 text-xxs text-zinc-500">guardando…</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xxs uppercase tracking-wider text-zinc-500">Rutear a (slug de la firma)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={guardarSlug}
              onKeyDown={enterGuarda}
              placeholder="slug-de-la-firma"
              className="terminal-input py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xxs uppercase tracking-wider text-zinc-500">Fee real ($)</span>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              onBlur={guardarFee}
              onKeyDown={enterGuarda}
              inputMode="numeric"
              placeholder="al cerrar"
              className="terminal-input py-1.5 text-sm tabular-nums"
            />
          </label>
        </div>
        <p className="-mt-2 text-xxs text-zinc-500">Cargar un slug pasa el lead a Ruteado.</p>

        <label className="flex flex-col gap-1">
          <span className="text-xxs uppercase tracking-wider text-zinc-500">Notas</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={guardarNotas}
            rows={2}
            placeholder="Notas de ruteo…"
            className="terminal-input text-sm"
          />
        </label>

        {error && (
          <p role="alert" className="text-xxs text-negative">
            {error}
          </p>
        )}
      </div>

      <LeadActivity key={l.id} leadId={l.id} initial={activity} onLogged={onActivity} defaultOpen />
    </div>
  )
}
