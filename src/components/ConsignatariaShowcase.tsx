'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

interface Stats {
  consignatarias: number
  remates: number
  aiRefsMes: number
  firmsCitadas: number
}
interface Citada {
  nombre: string
  refs: number
}

/** Firma para la versión PERSONALIZADA (/para-consignatarias/[slug]). */
export interface Firm {
  nombre: string
  slug: string
  provincia?: string | null
  magCabezas?: number | null
  aiCitas?: number | null
  aiEngines?: string | null
}

function firstName(n: string): string {
  return n.replace(/\s+(SA|S\.A\.|SRL|S\.R\.L\.|SACA|SC L|SCL|y Cia\.?|y Compañía).*$/i, '').trim() || n
}

/**
 * Scroll-to-discover para CONSIGNATARIAS (distinta de la de dev en /mcp).
 * Producto: destacá y publicitá tus remates + medí tu presencia en las IAs.
 * Lead con el dato sorpresa (las IAs YA citan consignatarias). Personalizable
 * por slug (ABM). Reveals con IntersectionObserver + CSS (respeta reduced-motion).
 */
export default function ConsignatariaShowcase({
  stats,
  citadas,
  firm,
}: {
  stats: Stats
  citadas: Citada[]
  firm?: Firm
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add('on')
      },
      { threshold: 0.2 },
    )
    root.querySelectorAll('.cs-scene').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const CTA = (
    <div className="flex flex-wrap gap-3 items-center">
      <Link
        href="/planes#consignataria"
        className="terminal-btn text-center"
        style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24' }}
      >
        Probar PRO gratis →
      </Link>
      <span className="text-zinc-600 text-xxs font-terminal">ARS 45.000/mes · prueba gratis · sin permanencia</span>
    </div>
  )

  return (
    <div ref={rootRef} className="cs-root">
      <style>{`
        .cs-scene .cs-in{opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s ease}
        .cs-scene.on .cs-in{opacity:1;transform:none}
        .cs-scene.on .cs-in.d1{transition-delay:.1s}
        .cs-scene.on .cs-in.d2{transition-delay:.2s}
        .cs-scene.on .cs-in.d3{transition-delay:.3s}
        .cs-scene.on .cs-in.d4{transition-delay:.4s}
        .cs-chip{opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s ease}
        .cs-scene.on .cs-chip{opacity:1;transform:none}
        @media (prefers-reduced-motion:reduce){
          .cs-scene .cs-in,.cs-scene .cs-chip{opacity:1;transform:none;transition:none}
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="min-h-[60vh] flex flex-col justify-center max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="text-xxs font-terminal uppercase tracking-widest text-sky-400 mb-3">
          {firm ? `● Para ${firm.nombre}` : '● Para consignatarias y casas de remate'}
        </div>
        <h1 className="text-4xl md:text-5xl font-heading text-zinc-100 leading-[1.05] mb-4">
          {firm ? `${firstName(firm.nombre)}: ` : ''}
          Publicitá tus remates.{' '}
          <span className="text-amber-400">Donde el productor —y las IAs— ya miran.</span>
        </h1>
        <p className="text-zinc-400 text-base max-w-2xl mb-6">
          consignatarias.com.ar es el dato de referencia del mercado ganadero. Con PRO tus remates se{' '}
          <span className="text-zinc-200">destacan</span> en el sitio, salen por{' '}
          <span className="text-zinc-200">email</span> a la base de productores, y{' '}
          <span className="text-zinc-200">medís cuánto te citan las IAs</span>.
        </p>
        {CTA}
        <div className="text-zinc-700 text-xxs font-terminal mt-10 animate-pulse">↓ mirá lo que ya está pasando</div>
      </section>

      {/* ── 01 · El hook: las IAs ya citan consignatarias ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">01 · Lo que ya está pasando</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Las IAs ya recomiendan consignatarias.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-5">
          Cuando un productor le pregunta a ChatGPT o Copilot por una firma, la respuesta sale de nuestro dato. El
          último mes consultaron el mercado{' '}
          <span className="text-sky-300 font-terminal">{stats.aiRefsMes.toLocaleString('es-AR')}</span> veces y citaron
          a <span className="text-sky-300 font-terminal">{stats.firmsCitadas}</span> consignatarias:
        </p>
        <div className="cs-in d2 flex flex-wrap gap-2 mb-5">
          {citadas.slice(0, 12).map((c, i) => (
            <span
              key={c.nombre}
              className="cs-chip text-xxs font-terminal text-zinc-300 border border-terminal-border rounded-[2px] px-2 py-1"
              style={{ transitionDelay: `${0.25 + i * 0.06}s` }}
            >
              {c.nombre}
              {c.refs > 1 && <span className="text-sky-400"> ·{c.refs}</span>}
            </span>
          ))}
        </div>
        {firm ? (
          firm.aiCitas ? (
            <div className="cs-in d3 rounded-[2px] border border-amber-500/40 bg-amber-500/[0.05] px-4 py-3 text-data">
              <span className="text-amber-300">Y a vos ya te citaron:</span> {firm.aiEngines || 'una IA'} recomendó a{' '}
              <span className="text-zinc-100">{firstName(firm.nombre)}</span>{' '}
              <span className="text-sky-300 font-terminal">{firm.aiCitas}</span>{firm.aiCitas === 1 ? ' vez' : ' veces'} el último mes.
            </div>
          ) : (
            <div className="cs-in d3 rounded-[2px] border border-sky-500/30 bg-sky-500/[0.04] px-4 py-3 text-data">
              <span className="text-zinc-200">{firstName(firm.nombre)}</span> todavía no apareció en una respuesta de IA
              este mes. Con PRO te posicionamos para que empiece a pasar — y te lo medimos.
            </div>
          )
        ) : (
          <p className="cs-in d3 text-zinc-500 text-sm max-w-2xl">
            ¿La tuya estuvo? <span className="text-amber-300">Con PRO te lo medimos mes a mes</span> — cuántas veces te
            citó cada IA y qué buscaban.
          </p>
        )}
      </section>

      {/* ── 02 · Publicitá tus remates ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-amber-400 mb-2">02 · Tu remate, adelante</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Destacá y publicitá cada remate.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-5">
          Tu próximo remate no se pierde entre {stats.remates}+: se pone adelante y se comunica.
        </p>
        <div className="cs-in d2 grid sm:grid-cols-3 gap-3 mb-6">
          {[
            ['Destacado en el calendario', 'Arriba en “hoy” y “esta semana”, con tu marca.'],
            ['Por email a la base', 'Cada remate sale a los productores registrados.'],
            ['En tu perfil + IAs', 'Optimizado para que lo encuentren en Google y las IAs.'],
          ].map(([t, d]) => (
            <div key={t} className="terminal-panel px-3 py-3" style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
              <div className="text-amber-300 text-data mb-0.5">{t}</div>
              <div className="text-zinc-500 text-xxs">{d}</div>
            </div>
          ))}
        </div>
        {/* mockup: tu remate destacado */}
        <div className="cs-in d3 terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.35)' }}>
          <div className="terminal-panel-header" style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}>
            Calendario · remate destacado
          </div>
          <div className="px-panel py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sky-300 font-terminal text-data">Tu próximo remate</div>
              <div className="text-zinc-300 text-data truncate">{firm ? firm.nombre : 'Tu Consignataria'}</div>
              <div className="text-zinc-600 text-xxs">{firm?.provincia || 'Tu plaza'} · enviado por email a la base</div>
            </div>
            <span className="text-amber-300 text-xxs border border-amber-500/40 rounded-[2px] px-1.5 py-0.5 shrink-0">DESTACADO</span>
          </div>
        </div>
      </section>

      {/* ── 03 · Perfil destacado + medido ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">03 · Tu perfil trabaja para vos</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Perfil destacado. Y sabés quién te mira.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-5">
          Aparecés primero en el directorio, con badge, y medís tu presencia: quién te mira, de qué zona, y cuánto te
          citan las IAs.
        </p>
        {/* mockup: tu consignataria destacada */}
        <div
          className="cs-in d2 terminal-panel mb-3"
          style={{ borderColor: 'rgba(251,191,36,0.4)', boxShadow: '0 0 24px rgba(251,191,36,0.06)' }}
        >
          <div className="terminal-panel-header" style={{ color: '#fbbf24', borderBottomColor: 'rgba(251,191,36,0.25)' }}>
            Directorio · destacada
          </div>
          <div className="px-panel py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 font-terminal text-lg shrink-0">
              {(firm ? firm.nombre : 'TC').slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-100 text-data truncate">{firm ? firm.nombre : 'Tu Consignataria'}</span>
                <span className="text-amber-300 text-xxs border border-amber-500/40 rounded-[2px] px-1">★ PRO</span>
              </div>
              <div className="text-zinc-500 text-xxs">{firm?.provincia || 'Tu provincia'} · perfil destacado</div>
            </div>
          </div>
        </div>
        {/* mini panel de medición IA */}
        <div className="cs-in d3 terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.3)' }}>
          <div className="terminal-panel-header" style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}>
            Tu presencia en IAs · este mes
          </div>
          <div className="px-panel py-3 flex items-center gap-6">
            <div>
              <div className="text-sky-300 font-terminal tabular-nums text-2xl">{firm?.aiCitas ?? '—'}</div>
              <div className="text-zinc-600 text-xxs">citas de IA</div>
            </div>
            <div className="text-zinc-500 text-xxs">
              {firm?.aiEngines ? `desde ${firm.aiEngines}` : 'ChatGPT · Copilot · Gemini'}
              <br />
              medido mes a mes, sin humo.
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap: CRM (teaser) ── */}
      <section className="cs-scene min-h-[55vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">Lo que viene</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">Pronto: tu CRM de remates.</h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl">
          Cargá quién compró qué lote, armá tu catálogo y gestioná tus ventas — todo en un lugar. PRO va a ser la
          herramienta con la que operás, no solo donde te publicitás.
        </p>
      </section>

      {/* ── CTA final ── */}
      <section className="cs-scene max-w-3xl mx-auto px-4 py-16 border-t border-terminal-border text-center">
        <h2 className="cs-in text-2xl md:text-3xl font-heading text-zinc-100 mb-3">Publicitá tu próximo remate.</h2>
        <p className="cs-in d1 text-zinc-500 text-sm mb-6">Prueba gratis · sin permanencia · ARS 45.000/mes.</p>
        <div className="cs-in d2 flex flex-wrap gap-3 justify-center">
          <Link
            href="/planes#consignataria"
            className="terminal-btn"
            style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24' }}
          >
            Probar PRO gratis →
          </Link>
          <Link href="/consignatarias" className="terminal-btn text-zinc-400">
            Ver el directorio
          </Link>
        </div>
      </section>
    </div>
  )
}
