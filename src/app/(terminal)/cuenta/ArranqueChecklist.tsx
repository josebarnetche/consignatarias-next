'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Checklist de arranque con celebración: cada paso completado brilla
 * (chispitas) y el karma se actualiza EN VIVO (count-up + aviso de nivel).
 * Con 3 de 4 pasos el usuario sale de Novato → Productor (+20 pts por paso).
 *
 * Los pasos que se completan en otras páginas (hacienda, alerta, marcas) se
 * celebran al volver: comparamos contra el último estado visto (localStorage).
 */

type ItemKey = 'hacienda' | 'alerta' | 'newsletter' | 'marcas'

interface Props {
  email: string
  initial: Record<ItemKey, boolean>
}

interface KarmaResp {
  loggedIn: boolean
  score?: number
  level?: string
  nextLevel?: string | null
  toNext?: number
}

const SEEN_KEY = 'cnsg-arranque-seen-v1'

const ITEMS: Array<{ key: ItemKey; label: string; sub: string; href: string }> = [
  { key: 'hacienda', label: 'Cargá tu hacienda en Mi Ganado', sub: 'Tu stock valuado al INMAG de cada día, como una cartera.', href: '/mi-ganado' },
  { key: 'alerta', label: 'Activá el aviso semanal de valor', sub: 'Cada lunes, cuánto vale tu hacienda y cuánto cambió.', href: '/mi-ganado' },
  { key: 'newsletter', label: 'Recibí el resumen semanal', sub: 'INMAG, remates y lo que movió el mercado, cada semana en tu mail.', href: '' },
  { key: 'marcas', label: 'Marcá los remates que te interesan', sub: 'Seguí remates y marcá en cuáles estuviste — arma tu historial.', href: '/remates' },
]

/** Chispitas: 8 partículas + anillo, una sola pasada. */
function Burst({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span className="burst-ring" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <span
            key={i}
            className="burst-p"
            style={{
              ['--tx' as string]: `${Math.cos(a) * 22}px`,
              ['--ty' as string]: `${Math.sin(a) * 22}px`,
              animationDelay: `${i * 18}ms`,
            }}
          />
        )
      })}
    </span>
  )
}

function useCountUp(target: number, durationMs = 700): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const firstRef = useRef(true)
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      fromRef.current = target
      setVal(target)
      return
    }
    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return val
}

export default function ArranqueChecklist({ email, initial }: Props) {
  const [items, setItems] = useState<Record<ItemKey, boolean>>(initial)
  const [karma, setKarma] = useState<KarmaResp | null>(null)
  const [bursts, setBursts] = useState<Set<ItemKey>>(new Set())
  const [levelUp, setLevelUp] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const prevLevelRef = useRef<string | null>(null)

  const displayScore = useCountUp(karma?.score ?? 0)
  const doneCount = (Object.keys(items) as ItemKey[]).filter((k) => items[k]).length

  const burstOn = useCallback((key: ItemKey, delayMs = 0) => {
    setTimeout(() => {
      setBursts((prev) => new Set(prev).add(key))
      setTimeout(() => {
        setBursts((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }, 1100)
    }, delayMs)
  }, [])

  const fetchKarma = useCallback(async (): Promise<KarmaResp | null> => {
    try {
      const r = await fetch('/api/me/karma', { credentials: 'include' })
      if (!r.ok) return null
      const d = (await r.json()) as KarmaResp
      if (d.loggedIn) {
        // Detectar subida de nivel EN VIVO (contra el nivel anterior conocido).
        if (prevLevelRef.current && d.level && d.level !== prevLevelRef.current && (d.score ?? 0) > 0) {
          setLevelUp(d.level)
        }
        prevLevelRef.current = d.level ?? null
        setKarma(d)
      }
      return d
    } catch {
      return null
    }
  }, [])

  // Al montar: karma + celebrar los pasos completados desde la última visita.
  useEffect(() => {
    fetchKarma().then((d) => {
      let seen: { items?: Partial<Record<ItemKey, boolean>>; level?: string } = {}
      try {
        seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
      } catch { /* primer uso */ }

      let delay = 250
      for (const it of ITEMS) {
        if (initial[it.key] && !seen.items?.[it.key]) {
          burstOn(it.key, delay)
          delay += 250
        }
      }
      // Subió de nivel entre visitas → celebrarlo también.
      if (seen.level && d?.level && d.level !== seen.level) setLevelUp(d.level)

      localStorage.setItem(SEEN_KEY, JSON.stringify({ items: initial, level: d?.level ?? seen.level }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function subscribeNewsletter() {
    if (items.newsletter || busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'cuenta-checklist' }),
      })
      if (r.ok) {
        const next = { ...items, newsletter: true }
        setItems(next)
        burstOn('newsletter')
        const d = await fetchKarma() // el score sube en vivo (+20, y nivel si corresponde)
        localStorage.setItem(SEEN_KEY, JSON.stringify({ items: next, level: d?.level ?? undefined }))
      }
    } catch { /* reintenta con otro click */ } finally {
      setBusy(false)
    }
  }

  return (
    <div className="terminal-panel mb-8 relative">
      <style>{`
        .burst-p{position:absolute;width:5px;height:5px;border-radius:1px;background:#38bdf8;opacity:0;animation:burst-fly .9s cubic-bezier(.2,.7,.3,1) forwards}
        .burst-p:nth-child(odd){background:#fbbf24;width:4px;height:4px}
        @keyframes burst-fly{0%{transform:translate(0,0) scale(.4);opacity:0}12%{opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:0}}
        .burst-ring{position:absolute;width:22px;height:22px;border-radius:9999px;border:1.5px solid rgba(56,189,248,.8);opacity:0;animation:burst-ring .8s ease-out forwards}
        @keyframes burst-ring{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.4);opacity:0}}
        .levelup-shine{background:linear-gradient(100deg,rgba(56,189,248,.06) 20%,rgba(56,189,248,.22) 50%,rgba(56,189,248,.06) 80%);background-size:220% 100%;animation:shine 1.6s ease-in-out 2}
        @keyframes shine{0%{background-position:180% 0}100%{background-position:-80% 0}}
        @media (prefers-reduced-motion:reduce){.burst-p,.burst-ring{animation:none;opacity:0}.levelup-shine{animation:none}}
      `}</style>

      <div className="terminal-panel-header flex items-center justify-between">
        <span>Empezá por acá</span>
        <span className="text-xxs font-terminal tabular-nums">
          <span className="text-zinc-500">{doneCount}/4 · </span>
          {karma?.loggedIn ? (
            <span className="text-sky-300">{displayScore} pts · {karma.level}</span>
          ) : (
            <span className="text-zinc-600">karma…</span>
          )}
        </span>
      </div>

      {levelUp && (
        <div className="levelup-shine flex items-center gap-2 px-panel py-2.5 border-b border-terminal-border">
          <span className="text-sky-300 text-sm">★</span>
          <span className="text-sm text-sky-300 font-terminal">¡Subiste a {levelUp}!</span>
          <span className="text-xxs text-zinc-500">Tu reputación de productor crece con lo que aportás.</span>
        </div>
      )}

      <div className="divide-y divide-terminal-border">
        {ITEMS.map((it) => {
          const done = items[it.key]
          const circle = (
            <span className="relative flex-shrink-0" aria-hidden="true">
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-xxs transition-colors duration-300 ${
                  done ? 'border-positive/40 bg-positive/10 text-positive' : 'border-zinc-700 text-transparent'
                }`}
              >
                ✓
              </span>
              <Burst active={bursts.has(it.key)} />
            </span>
          )
          const body = (
            <div className="flex-1 min-w-0">
              <div className={`text-sm transition-colors ${done ? 'text-zinc-300' : 'text-zinc-200'}`}>{it.label}</div>
              <div className="text-xxs text-zinc-500">{it.sub}</div>
            </div>
          )

          if (it.key === 'newsletter') {
            return (
              <div key={it.key} className="flex items-center gap-3 px-panel py-3">
                {circle}
                {body}
                {done ? (
                  <span className="text-xxs text-positive font-terminal uppercase tracking-wider flex-shrink-0">Activo</span>
                ) : (
                  <button
                    onClick={subscribeNewsletter}
                    disabled={busy}
                    className="flex-shrink-0 text-xxs font-terminal uppercase tracking-wider text-zinc-950 bg-accent hover:bg-sky-300 disabled:opacity-60 rounded-sm px-3 py-1.5 transition-colors"
                  >
                    {busy ? '…' : 'Activar'}
                  </button>
                )}
              </div>
            )
          }
          return (
            <Link key={it.key} href={it.href} className="flex items-center gap-3 px-panel py-3 hover:bg-sky-500/[0.04] transition-colors group">
              {circle}
              {body}
              <span className="text-zinc-600 group-hover:text-sky-400 text-xs font-mono flex-shrink-0 transition-colors">→</span>
            </Link>
          )
        })}
      </div>

      {karma?.loggedIn && karma.level === 'Novato' && (
        <div className="px-panel py-2 border-t border-terminal-border">
          <p className="text-xxs text-zinc-500">
            Cada paso suma <span className="text-zinc-300">+20 de karma</span> — con 3 de 4 pasás a{' '}
            <span className="text-sky-300">Productor</span>.
          </p>
        </div>
      )}
    </div>
  )
}
