'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackCTA } from '@/lib/analytics'

interface LiveHeroProps {
  consignatarias: number
  remates: number
  enVivo: number
  enVivoConfirmed: number
  heads: number
  inmag: number
  inmagChange: number
  usdBlue: number
  frigorificos: number
  provincias: number
  dateLabel: string
}

const ar = (n: number, d = 0) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

function prefersReduced() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Cuenta hasta `target`. SSR/hidratación renderizan el valor final (sin flash de 0,
 *  sin mismatch); la animación arranca post-mount y se saltea con reduced-motion. */
function useCountUp(target: number, duration = 850) {
  const [val, setVal] = useState(target)
  useEffect(() => {
    if (prefersReduced()) { setVal(target); return }
    const start = target * 0.9
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 4) // ease-out-quart
      setVal(start + (target - start) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

export default function LiveHero(p: LiveHeroProps) {
  const inmag = useCountUp(p.inmag)
  const up = p.inmagChange >= 0
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Stagger con clases delay-* ESTÁTICAS (Tailwind no genera clases armadas en runtime).
  const DELAY: Record<number, string> = { 0: '', 60: 'delay-75', 120: 'delay-100', 180: 'delay-200', 240: 'delay-300' }
  const reveal = (d: number) =>
    `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
    } ${DELAY[d] ?? ''}`

  return (
    <div className="relative z-10 max-w-5xl">
      {/* dateline */}
      <div className={`flex items-center gap-2.5 mb-7 ${reveal(0)}`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" />
        </span>
        <span className="text-[11px] font-terminal uppercase tracking-[0.22em] text-zinc-500">
          Mercado Agroganadero · en vivo · {p.dateLabel}
        </span>
      </div>

      {/* headline broadsheet */}
      <h1 className={`text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-normal text-zinc-100 tracking-[-0.03em] leading-[0.98] mb-7 ${reveal(60)}`}>
        Los <span className="text-amber-400">consignatarios</span>{' '}
        <span className="text-zinc-500">que mueven el mercado argentino.</span>
      </h1>

      <p className={`text-base md:text-lg text-zinc-400 mb-9 max-w-2xl leading-relaxed ${reveal(120)}`}>
        {p.consignatarias} consignatarias en {p.provincias} provincias: quién opera, qué
        especialidad, qué plazas cubre, qué dicen los productores. El precio es importante;
        el consignatario es la decisión.
      </p>

      {/* readout vivo — no card grid: línea de mercado tipo tape */}
      <div className={`mb-9 ${reveal(180)}`}>
        <Link href="/mercado/inmag" className="group inline-flex items-end gap-3">
          <span className="text-[11px] font-terminal uppercase tracking-[0.18em] text-zinc-500 mb-2">
            Cierre INMAG
          </span>
          <span className="font-terminal tabular-nums text-4xl md:text-5xl text-zinc-100 leading-none group-hover:text-white transition-colors">
            ${ar(inmag)}
          </span>
          <span className="text-zinc-600 text-sm mb-1.5 font-terminal">/kg</span>
          <span
            className="mb-1.5 font-terminal tabular-nums text-sm"
            style={{ color: up ? '#34d399' : '#f87171' }}
          >
            {up ? '▲' : '▼'} {Math.abs(p.inmagChange).toFixed(1)}%
          </span>
        </Link>
        {/* fila mono compacta: el resto del mercado de un vistazo */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-terminal text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300 transition-colors">
            USD blue <span className="text-zinc-300 tabular-nums">${ar(p.usdBlue)}</span>
          </Link>
          <span className="text-zinc-800">|</span>
          <Link href="/remates" className="hover:text-zinc-300 transition-colors">
            <span className="text-zinc-300 tabular-nums">{ar(p.remates)}</span> remates · ~{ar(p.heads)} cab.
          </Link>
          <span className="text-zinc-800">|</span>
          <Link href="/frigorificos" className="hover:text-zinc-300 transition-colors">
            <span className="text-zinc-300 tabular-nums">{ar(p.frigorificos)}</span> plantas SENASA
          </Link>
          {p.enVivo > 0 && (
            <>
              <span className="text-zinc-800">|</span>
              <Link href="/remates/en-vivo" className="inline-flex items-center gap-1.5 text-[#f87171] hover:text-[#fca5a5] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse" />
                <span className="tabular-nums">{p.enVivo}</span> en vivo
              </Link>
            </>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className={`flex flex-col sm:flex-row flex-wrap gap-3 ${reveal(240)}`}>
        <Link
          href="/overview"
          onClick={() => trackCTA('acceder_terminal', 'hero')}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[#0b0b0e] bg-zinc-100 hover:bg-white transition-colors rounded py-3 px-6"
        >
          Acceder al Terminal
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
        <Link
          href="/consignatarias"
          onClick={() => trackCTA('ver_directorio', 'hero')}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-200 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-colors rounded py-3 px-6"
        >
          Ver el directorio
        </Link>
        {p.enVivo > 0 && (
          <Link
            href="/remates/en-vivo"
            onClick={() => trackCTA('en_vivo', 'hero')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-[#dc2626] hover:bg-[#ef4444] transition-colors rounded py-3 px-6"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {p.enVivo} en vivo
          </Link>
        )}
        <Link
          href="/remates/semana"
          onClick={() => trackCTA('calendario_semana', 'hero')}
          className="inline-flex items-center justify-center text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors py-3 px-3"
        >
          Calendario de la semana →
        </Link>
      </div>
    </div>
  )
}
