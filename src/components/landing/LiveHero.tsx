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
  /** Remates indexados en total (pasados + próximos), de remates.json. */
  rematesIndexados: number
  /** Bandas del Valor de Referencia publicables (lib/vr → getBandasPublicas). */
  bandas: Array<{ slug: string; categoria: string; p10: number; mediana: number; p90: number; lotes: number }>
  /** Lotes observados en la ventana vigente y su fecha final. */
  lotesVentana: number
  ventanaDias: number
}

const ar = (n: number, d = 0) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

function prefersReduced() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Cuenta hasta `target`. SSR/hidratación renderizan el valor final (sin flash de 0,
 *  sin mismatch); la animación arranca post-mount y se saltea con reduced-motion.
 *  Arranca en 0.85× para que el tick de entrada se PERCIBA (antes 0.9× casi no se
 *  movía), con ease-out-quart — sensación de terminal "en vivo" sin ser gimmick. */
function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(target)
  useEffect(() => {
    if (prefersReduced()) { setVal(target); return }
    const start = target * 0.85
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
  // Cadencia pareja de 80ms — waterfall uniforme (antes 75/100/200/300 saltaba).
  const DELAY: Record<number, string> = { 0: '', 60: 'delay-[80ms]', 120: 'delay-[160ms]', 180: 'delay-[240ms]', 240: 'delay-[320ms]' }
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

      {/* headline broadsheet — la promesa del producto en una línea (v1.211.0).
          Antes decía "Los consignatarios que mueven el mercado argentino": vendía el
          directorio, que es la superficie, no lo que se usa ni lo que se paga. */}
      <h1 className={`text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-normal text-zinc-100 tracking-[-0.03em] leading-[0.98] mb-7 ${reveal(60)}`}>
        Cuánto vale tu hacienda hoy,{' '}
        <span className="text-accent">medido en lo que realmente se vendió.</span>
      </h1>

      <p className={`text-base md:text-lg text-zinc-400 mb-9 max-w-2xl leading-relaxed ${reveal(120)}`}>
        El <strong className="text-zinc-200 font-medium">Valor de Referencia</strong> de cada categoría y peso sale de{' '}
        {ar(p.lotesVentana)} lotes vendidos en el Mercado Agroganadero en los últimos {p.ventanaDias} días, con el rango
        y los lotes a la vista. Cargá tu rodeo y seguilo gratis.
      </p>

      {/* readout vivo — no card grid: línea de mercado tipo tape */}
      <div className={`mb-9 ${reveal(180)}`}>
        {/* Las bandas del día: mediana grande, rango al lado, n abajo. Es el número que
            el productor viene a buscar, y ya no es un ratio sobre el INMAG. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 max-w-3xl">
          {p.bandas.slice(0, 4).map((b) => (
            <Link key={b.slug} href={`/vr/${b.slug}`} className="group block">
              <div className="text-[11px] font-terminal uppercase tracking-[0.18em] text-zinc-500 mb-1">{b.categoria}</div>
              <div className="font-terminal tabular-nums text-2xl md:text-3xl text-zinc-100 leading-none group-hover:text-white transition-colors">
                ${ar(b.mediana)}<span className="text-zinc-600 text-xs">/kg</span>
              </div>
              <div className="text-[11px] font-terminal tabular-nums text-zinc-500 mt-1">
                {ar(b.p10)}–{ar(b.p90)} · {ar(b.lotes)} lotes
              </div>
            </Link>
          ))}
        </div>
        {/* fila mono compacta: el resto del mercado de un vistazo */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-terminal text-zinc-500">
          <Link href="/mercado/inmag" className="hover:text-zinc-300 transition-colors">
            INMAG <span className="text-zinc-300 tabular-nums">${ar(inmag)}</span>{' '}
            <span style={{ color: up ? '#34d399' : '#f87171' }}>{up ? '▲' : '▼'} {Math.abs(p.inmagChange).toFixed(1)}%</span>
          </Link>
          <span className="text-zinc-800">|</span>
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

      {/* CTAs — una acción principal (valuar) y una de consulta (VR). Lo de vender
          (directorio, remates, calendario) va en una fila de enlaces: es el paso
          siguiente, no compite con la promesa. Antes había 5 botones. */}
      <div className={`flex flex-col sm:flex-row flex-wrap gap-3 ${reveal(240)}`}>
        <Link
          href="/mi-ganado"
          onClick={() => trackCTA('valuar_rodeo', 'hero', { context: 'landing-hero', variant: 'vr' })}
          className="group inline-flex items-center justify-center gap-2 text-sm font-medium text-[#0b0b0e] bg-accent hover:bg-sky-300 transition-colors rounded py-3 px-6"
        >
          Valuar mi rodeo gratis
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 ease-out group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
        <Link
          href="/vr"
          onClick={() => trackCTA('ver_vr', 'hero', { context: 'landing-hero', variant: 'vr' })}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-200 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-colors rounded py-3 px-6"
        >
          Ver el Valor de Referencia
        </Link>
      </div>
      <div className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 ${reveal(240)}`}>
        <span>¿Querés vender?</span>
        <Link
          href="/consignatarias"
          onClick={() => trackCTA('ver_directorio', 'hero', { context: 'landing-hero', variant: 'vr' })}
          className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-white hover:decoration-zinc-400 transition-colors"
        >
          {p.consignatarias} consignatarias
        </Link>
        <Link
          href="/remates/semana"
          onClick={() => trackCTA('calendario_semana', 'hero', { context: 'landing-hero', variant: 'default' })}
          className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-white hover:decoration-zinc-400 transition-colors"
        >
          Remates de la semana
        </Link>
      </div>
    </div>
  )
}
