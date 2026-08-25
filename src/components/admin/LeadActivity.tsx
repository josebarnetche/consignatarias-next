'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Mail, Users, StickyNote, ArrowRight, Send, Loader2 } from 'lucide-react'
import {
  HUMAN_KINDS,
  KIND_LABEL,
  OUTCOME_LABEL,
  ACTIVITY_OUTCOMES,
  type ActivityRow,
  type ActivityKind,
  type ActivityOutcome,
} from '@/lib/leads/activity'

/**
 * Bitácora de un lead dentro de /admin/leads.
 *
 * El estado dice DÓNDE está el negocio; esto dice QUÉ se hizo. Está pensado para
 * cargarse en diez segundos después de cortar una llamada: tipo, resultado, una
 * línea de texto, enter. Si hay que pensar cómo llenarlo, no se llena.
 */

const KIND_ICON: Record<string, typeof Phone> = {
  llamada: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  reunion: Users,
  nota: StickyNote,
  estado: ArrowRight,
  ruteo: ArrowRight,
  sistema: ArrowRight,
}

const OUTCOME_CLS: Record<string, string> = {
  interesado: 'bg-emerald-500/20 text-emerald-300',
  contesto: 'bg-sky-500/20 text-sky-300',
  cerrado: 'bg-emerald-500/20 text-emerald-300',
  pendiente: 'bg-amber-500/20 text-amber-300',
  sin_respuesta: 'bg-zinc-600/20 text-zinc-400',
  no_interesa: 'bg-red-500/20 text-red-300',
}

function fmt(s: string) {
  return new Date(s).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function LeadActivity({
  leadId,
  initial,
  onLogged,
}: {
  leadId: number
  initial: ActivityRow[]
  /** Para que la lista de arriba pueda refrescar contadores sin recargar todo. */
  onLogged?: (rows: ActivityRow[]) => void
}) {
  const [rows, setRows] = useState<ActivityRow[]>(initial)
  const [abierto, setAbierto] = useState(false)
  const [kind, setKind] = useState<ActivityKind>('llamada')
  const [outcome, setOutcome] = useState<ActivityOutcome | ''>('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El trabajo humano es lo que importa contar; los cambios de estado los escribe
  // el sistema solo y no dicen nada sobre si alguien movió el negocio.
  const humanas = rows.filter((r) => HUMAN_KINDS.includes(r.kind)).length

  async function registrar() {
    if (!texto.trim() && !outcome) {
      setError('Escribí qué pasó o elegí un resultado')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/leads/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, kind, outcome: outcome || null, body: texto.trim() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || 'No se pudo registrar')
        return
      }
      setRows(j.activity || [])
      onLogged?.(j.activity || [])
      setTexto('')
      setOutcome('')
    } catch {
      setError('No se pudo registrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
      >
        <span>{abierto ? '▾' : '▸'} Historial</span>
        {rows.length > 0 && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
            {rows.length}
          </span>
        )}
        {humanas === 0 && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
            sin trabajo registrado
          </span>
        )}
      </button>

      {abierto && (
        <div className="mt-3 space-y-3">
          {/* Alta rápida */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ActivityKind)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500/60"
            >
              {HUMAN_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ActivityOutcome | '')}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500/60"
            >
              <option value="">— resultado —</option>
              {ACTIVITY_OUTCOMES.map((o) => (
                <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
              ))}
            </select>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !enviando) registrar() }}
              placeholder="qué pasó — ej: lo llamé, sigue con los 40 novillitos, quiere vender en septiembre"
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-sky-500/60"
            />
            <button
              onClick={registrar}
              disabled={enviando}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Registrar
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Timeline */}
          {rows.length === 0 ? (
            <p className="text-xs text-zinc-600">
              Todavía no hay nada registrado. Cargá acá lo que hagas con este lead —
              llamadas, respuestas, a quién se lo pasaste.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r) => {
                const Icon = KIND_ICON[r.kind] ?? StickyNote
                const delSistema = !HUMAN_KINDS.includes(r.kind)
                return (
                  <li
                    key={r.id}
                    className={`flex gap-2.5 rounded-lg border px-2.5 py-2 ${
                      delSistema
                        ? 'border-zinc-800/60 bg-zinc-900/40'
                        : 'border-zinc-800 bg-zinc-900/80'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${delSistema ? 'text-zinc-600' : 'text-sky-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-medium ${delSistema ? 'text-zinc-500' : 'text-zinc-200'}`}>
                          {KIND_LABEL[r.kind]}
                        </span>
                        {r.outcome && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${OUTCOME_CLS[r.outcome] ?? 'bg-zinc-700/30 text-zinc-400'}`}>
                            {OUTCOME_LABEL[r.outcome]}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-600">{fmt(r.created_at)}</span>
                        {r.actor && <span className="text-[10px] text-zinc-600">· {r.actor}</span>}
                      </div>
                      {r.body && (
                        <p className={`mt-0.5 break-words text-sm ${delSistema ? 'text-zinc-500' : 'text-zinc-300'}`}>
                          {r.body}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
