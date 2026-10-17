'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Stat from '@/components/ui/Stat'
import type { LivePayload, LiveView } from '@/lib/admin/live'

/* ================================================================== */
/*  LiveActivityFeed — el comportamiento EN VIVO de /admin/overview.   */
/*  Pollea GET /api/admin/live cada 10 s; pinta instantáneo con        */
/*  `initial` (server). Soft-fail: si el fetch falla, mantiene lo      */
/*  último y avisa "sin conexión".                                     */
/*                                                                      */
/*  Compacto: 10 filas y "ver más". Si no hay nadie en los últimos     */
/*  5 min lo dice arriba y deja las vistas viejas plegadas.            */
/*                                                                      */
/*  CONTRATO: el link de edición es /admin/consignatarias?slug=<slug>. */
/* ================================================================== */

const POLL_MS = 10_000
const VISIBLE = 10
const nf = (n: number) => n.toLocaleString('es-AR')

function rowKey(v: LiveView): string {
  return `${v.viewedAt}|${v.type}|${v.slug}`
}

/** "hace Xs / X min / X h / X d" desde un ISO. */
function ago(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000))
  if (s < 60) return `hace ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export default function LiveActivityFeed({ initial }: { initial: LivePayload }) {
  const [data, setData] = useState<LivePayload>(initial)
  const [online, setOnline] = useState(true)
  const [expanded, setExpanded] = useState(false)
  // Tick para recalcular los "hace Xs" sin re-fetch.
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  // Claves ya vistas → para flashear sólo las realmente nuevas.
  const seenKeys = useRef<Set<string>>(new Set(initial.recent.map(rowKey)))
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const res = await fetch('/api/admin/live', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const next = (await res.json()) as LivePayload
        if (cancelled) return
        const fresh = new Set<string>()
        for (const v of next.recent) {
          const k = rowKey(v)
          if (!seenKeys.current.has(k)) fresh.add(k)
          seenKeys.current.add(k)
        }
        setData(next)
        setOnline(true)
        if (fresh.size) {
          setFlashKeys(fresh)
          window.setTimeout(() => {
            if (!cancelled) setFlashKeys(new Set())
          }, 600)
        }
      } catch {
        if (!cancelled) setOnline(false)
      }
    }
    const id = window.setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { counts, recent } = data
  const quiet = counts.v5m === 0
  // Sin nadie ahora: las filas viejas quedan plegadas hasta que se pidan.
  const showRows = !quiet || expanded
  const rows = expanded ? recent : recent.slice(0, VISIBLE)
  const last = recent[0]

  return (
    <section className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className={online ? 'status-dot-live' : 'status-dot-offline'} />
          Actividad
        </span>
        {!online && (
          <span className="normal-case tracking-normal text-xxs text-warning">sin conexión · muestra lo último</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-terminal-border">
        <div className="px-panel py-3">
          <Stat label="Activos · 5 min" value={nf(counts.v5m)} tone={quiet ? 'neutral' : 'live'} />
        </div>
        <div className="px-panel py-3">
          <Stat label="Vistas · 1 h" value={nf(counts.v1h)} />
        </div>
        <div className="px-panel py-3">
          <Stat label="Vistas · 24 h" value={nf(counts.v24h)} />
        </div>
      </div>

      {quiet && (
        <div className="px-panel py-3 flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border">
          <span className="text-data text-zinc-400 font-terminal">
            Nadie mirando perfiles en este momento.
            {last ? ` La última vista fue ${ago(last.viewedAt, nowMs)}.` : ' No hubo vistas en 24 h.'}
          </span>
          {recent.length > 0 && (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="text-xxs text-accent font-terminal">
              {expanded ? 'Ocultar' : `Ver las últimas ${recent.length}`}
            </button>
          )}
        </div>
      )}

      {showRows && recent.length > 0 && (
        <ul>
          {rows.map((v) => {
            const k = rowKey(v)
            return (
              <li
                key={k}
                className={`border-b border-terminal-border last:border-b-0 px-panel py-1.5 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:grid-cols-[5.5rem_7rem_minmax(0,1fr)_9rem_4rem] items-center gap-x-3 gap-y-0.5 ${
                  flashKeys.has(k) ? 'delta-flash-live' : ''
                }`}
              >
                <span className="text-xxs font-terminal tabular-nums text-zinc-500">{ago(v.viewedAt, nowMs)}</span>
                <span className="hidden sm:block">
                  <Badge tone={v.type === 'frigorifico' ? 'warning' : 'accent'}>
                    {v.type === 'frigorifico' ? 'Frigorífico' : 'Consignataria'}
                  </Badge>
                </span>
                <span className="min-w-0 flex items-center gap-2">
                  <Link
                    href={v.href}
                    className="text-data font-terminal text-ink hover:text-accent transition-colors truncate"
                    title={v.name}
                  >
                    {v.name}
                  </Link>
                  {v.type === 'consignataria' && (
                    <Link
                      href={`/admin/consignatarias?slug=${encodeURIComponent(v.slug)}`}
                      className="shrink-0 text-xxs font-terminal text-zinc-500 hover:text-accent transition-colors"
                      title="Editar consignataria"
                    >
                      editar
                    </Link>
                  )}
                </span>
                <span
                  className="hidden sm:block text-xxs font-terminal text-zinc-500 truncate"
                  title={v.referrerHost ?? 'directo'}
                >
                  {v.referrerHost ?? 'directo'}
                </span>
                <span className="text-xxs font-terminal text-zinc-500 text-right">
                  {v.device === 'Mobile' ? 'Móvil' : 'Desktop'}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {showRows && recent.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-panel py-2 border-t border-terminal-border text-xxs text-accent font-terminal text-left hover:bg-zinc-800/20"
        >
          {expanded ? 'Ver menos' : `Ver más (${recent.length - VISIBLE})`}
        </button>
      )}

      {recent.length === 0 && !quiet && (
        <div className="px-panel py-6 text-center text-data text-zinc-500 font-terminal">Sin vistas en 24 h.</div>
      )}
    </section>
  )
}
