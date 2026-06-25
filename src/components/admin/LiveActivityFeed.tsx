'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { LivePayload, LiveView } from '@/lib/admin/live'

/* ================================================================== */
/*  LiveActivityFeed                                                   */
/*  El módulo más importante del overview: el comportamiento EN VIVO   */
/*  de los usuarios. Pollea GET /api/admin/live cada ~10s y muestra    */
/*  las últimas ~30 vistas de perfil con "hace Xs/min", tipo, link a   */
/*  la ficha, host del referrer y dispositivo.                         */
/*                                                                      */
/*  Pinta instantáneo con `initial` (server-rendered). Soft-fail: si   */
/*  el fetch falla, mantiene lo último. Filas nuevas hacen un flash    */
/*  sutil (delta-flash-live). Sin loops de render.                     */
/* ================================================================== */

const POLL_MS = 10_000

function rowKey(v: LiveView): string {
  return `${v.viewedAt}|${v.type}|${v.slug}`
}

/** "hace Xs / Xmin / Xh" desde un ISO. */
function ago(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000))
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

export default function LiveActivityFeed({ initial }: { initial: LivePayload }) {
  const [data, setData] = useState<LivePayload>(initial)
  const [online, setOnline] = useState(true)
  // Tick para recalcular los "hace Xs" sin re-fetch.
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  // Claves ya vistas → para flashear sólo las realmente nuevas.
  const seenKeys = useRef<Set<string>>(new Set(initial.recent.map(rowKey)))
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set())

  // Poll del endpoint cada POLL_MS. Soft-fail: mantiene lo último.
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
        }
        next.recent.forEach((v) => seenKeys.current.add(rowKey(v)))

        setData(next)
        setOnline(true)
        if (fresh.size) {
          setFlashKeys(fresh)
          window.setTimeout(() => {
            if (!cancelled) setFlashKeys(new Set())
          }, 600)
        }
      } catch {
        if (!cancelled) setOnline(false) // soft-fail: no tocamos `data`
      }
    }

    const id = window.setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  // Reloj de 1s para los timestamps relativos (no re-fetch).
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { counts, recent } = data

  return (
    <div className="terminal-panel">
      {/* HEADER ---------------------------------------------------- */}
      <div className="terminal-panel-header flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={online ? 'status-dot-live' : 'status-dot-offline'} />
          <span className="text-zinc-200 text-label tracking-widest">EN VIVO</span>
          <span className="text-xxs text-zinc-600 font-terminal uppercase tracking-wider">
            actividad de usuarios
          </span>
        </div>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-xxs font-terminal text-live">
            {counts.v5m} activos · últimos 5 min
          </span>
          <span className="text-xxs font-terminal text-zinc-500">
            {counts.v1h}/h · {counts.v24h}/24h
          </span>
        </div>
      </div>

      {/* HEADER ROW (desktop) ------------------------------------- */}
      <div className="border-b border-terminal-border px-cell py-px2 hidden sm:flex items-center gap-0 bg-terminal-panel">
        <span className="w-[84px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Cuándo</span>
        <span className="w-[110px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Tipo</span>
        <span className="flex-1 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Perfil</span>
        <span className="w-[140px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal">Origen</span>
        <span className="w-[70px] flex-shrink-0 text-xxs font-medium uppercase tracking-wider text-zinc-500 font-terminal text-right">Disp.</span>
      </div>

      {/* ROWS ------------------------------------------------------ */}
      {recent.length === 0 ? (
        <div className="px-panel py-6 text-center">
          <span className="text-zinc-500 text-data font-terminal">Sin vistas en las últimas 24h</span>
          <p className="text-xxs text-zinc-600 font-terminal mt-1">
            Cada fila acá es un usuario viendo un perfil. Aparecen apenas haya tráfico.
          </p>
        </div>
      ) : (
        recent.map((v) => {
          const k = rowKey(v)
          const flash = flashKeys.has(k)
          return (
            <div
              key={k}
              className={`border-b border-terminal-border px-cell py-1.5 flex flex-wrap sm:flex-nowrap items-center gap-x-0 gap-y-1 rounded-[2px] ${
                flash ? 'delta-flash-live' : ''
              }`}
            >
              <span className="w-[84px] flex-shrink-0 text-xxs font-terminal tabular-nums text-zinc-500">
                {ago(v.viewedAt, nowMs)}
              </span>
              <span className="w-[110px] flex-shrink-0">
                <Badge tone={v.type === 'frigorifico' ? 'warning' : 'accent'}>
                  {v.type === 'frigorifico' ? 'FRIGORÍFICO' : 'CONSIGNAT.'}
                </Badge>
              </span>
              <span className="flex-1 min-w-0 basis-full sm:basis-auto flex items-center gap-2">
                <Link
                  href={v.href}
                  className="text-data font-terminal text-zinc-200 hover:text-accent transition-colors truncate"
                  title={v.name}
                >
                  {v.name}
                </Link>
                {v.type === 'consignataria' && (
                  <Link
                    href={`/admin/consignatarias?slug=${encodeURIComponent(v.slug)}`}
                    className="flex-shrink-0 text-xxs font-terminal text-zinc-600 hover:text-accent transition-colors"
                    title="Editar consignataria"
                  >
                    ✎ editar
                  </Link>
                )}
              </span>
              <span className="w-[140px] flex-shrink-0 text-xxs font-terminal text-zinc-500 truncate" title={v.referrerHost ?? 'directo'}>
                {v.referrerHost ?? 'directo'}
              </span>
              <span
                className={`w-[70px] flex-shrink-0 text-xxs font-terminal text-right ${
                  v.device === 'Mobile' ? 'text-accent' : 'text-zinc-500'
                }`}
              >
                {v.device === 'Mobile' ? 'Móvil' : 'Desktop'}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
