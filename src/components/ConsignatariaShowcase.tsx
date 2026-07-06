'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import MagPulse from '@/components/MagPulse'

interface Stats {
  consignatarias: number
  remates: number
  operaciones: number
  aiPorMes: number
}

/** Firma para la versión PERSONALIZADA (/para-consignatarias/[slug]). */
export interface Firm {
  nombre: string
  slug: string
  provincia?: string | null
  proximoRemate?: { fecha: string; plaza?: string | null } | null
  magCabezas?: number | null
  magRank?: number | null
}

function firstName(n: string): string {
  return n.replace(/\s+(SA|S\.A\.|SRL|S\.R\.L\.|SACA|SC L|SCL|y Cia\.?|y Compañía).*$/i, '').trim() || n
}

/** Logos de redes que analizamos + potenciamos con PRO. */
function SocialRow() {
  const icons: Array<[string, string, ReactNode]> = [
    ['Instagram', '#E1306C', <path key="i" d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.26 2.2.43.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z" />],
    ['Facebook', '#1877F2', <path key="f" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />],
    ['WhatsApp', '#25D366', <path key="w" d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.3-4.8-4.2-4.9-4.4-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.7 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />],
    ['YouTube', '#FF0000', <path key="y" d="M23 12s0-3.3-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.4a2.5 2.5 0 0 0-1.8 1.8C1 8.7 1 12 1 12s0 3.3.4 4.8a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.4a2.5 2.5 0 0 0 1.8-1.8C23 15.3 23 12 23 12Zm-13 3V9l5.2 3Z" />],
    ['TikTok', '#e2e8f0', <path key="t" d="M16.5 2c.3 2 1.5 3.6 3.5 3.9v2.7c-1.4 0-2.6-.4-3.6-1.1v5.9c0 3-2.2 5.6-5.4 5.6a5.3 5.3 0 0 1-5.4-5.3 5.3 5.3 0 0 1 6.4-5.2v2.8a2.6 2.6 0 0 0-1-.2 2.5 2.5 0 1 0 2.5 2.5V2Z" />],
  ]
  return (
    <div className="flex flex-wrap items-center gap-4">
      {icons.map(([name, color, path]) => (
        <svg key={name} width="26" height="26" viewBox="0 0 24 24" fill={color} aria-label={name}>
          {path}
        </svg>
      ))}
    </div>
  )
}

/**
 * Scroll-to-discover para CONSIGNATARIAS (distinta de la de dev en /mcp).
 * Frame: autoridad del dato de referencia + discovery (IA/Google) + herramientas
 * PRO. Sin overpromise de "miles de productores" (la base directa es chica).
 * Reveals con IntersectionObserver + CSS (respeta prefers-reduced-motion).
 */
export default function ConsignatariaShowcase({ stats, firm }: { stats: Stats; firm?: Firm }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add('on')
      },
      { threshold: 0.25 },
    )
    root.querySelectorAll('.cs-scene').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="cs-root">
      <style>{`
        .cs-scene .cs-in{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
        .cs-scene.on .cs-in{opacity:1;transform:none}
        .cs-scene.on .cs-in.d1{transition-delay:.12s}
        .cs-scene.on .cs-in.d2{transition-delay:.24s}
        .cs-scene.on .cs-in.d3{transition-delay:.36s}
        .cs-scene.on .cs-in.d4{transition-delay:.48s}
        @media (prefers-reduced-motion:reduce){
          .cs-scene .cs-in{opacity:1;transform:none;transition:none}
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="min-h-[62vh] flex flex-col justify-center max-w-3xl mx-auto px-4 pt-10 pb-8">
        <div className="text-xxs font-terminal uppercase tracking-widest text-sky-400 mb-3">
          {firm ? `● Para ${firm.nombre}` : '● Para consignatarias y casas de remate'}
        </div>
        <h1 className="text-4xl md:text-5xl font-heading text-zinc-100 leading-[1.05] mb-4">
          {firm ? (
            <>
              {firstName(firm.nombre)}: ya estás en el mercado.{' '}
              <span className="text-amber-400">Con PRO, destacás.</span>
            </>
          ) : (
            <>
              El mercado ganadero, <span className="text-sky-400">medido</span>. Y tu firma, en el centro.
            </>
          )}
        </h1>
        <p className="text-zinc-400 text-base max-w-2xl mb-6">
          {firm ? (
            <>
              Tu firma ya figura en consignatarias.com.ar{firm.provincia ? ` (${firm.provincia})` : ''}, el
              observatorio del mercado de referencia. Con PRO analizamos tus redes y tu web, y te posicionamos donde
              el productor —y las IAs— miran.
            </>
          ) : (
            <>
              consignatarias.com.ar es el observatorio del mercado de referencia: precios, remates y el dato de
              Cañuelas operación por operación. Es lo que productores, IAs y toda la cadena consultan. Sumá tu firma.
            </>
          )}
        </p>
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
        <div className="text-zinc-700 text-xxs font-terminal mt-10 animate-pulse">↓ scrolleá para ver el mercado</div>
      </section>

      {/* ── Escena 1: la autoridad (el dato en vivo) ── */}
      <section className="cs-scene min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">01 · La autoridad</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          El mercado de referencia, operación por operación.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-6">
          Todos los días medimos qué operó cada consignatario en el Mercado Agroganadero de Cañuelas — el que fija
          el precio de la hacienda. Nadie más lo publica así. Este es el dato, en vivo:
        </p>
        {firm?.magCabezas ? (
          <div className="cs-in d2 mb-4 rounded-[2px] border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3 text-data">
            <span className="text-amber-300">Y a vos ya te medimos:</span>{' '}
            <span className="text-zinc-200">{firstName(firm.nombre)}</span> operó{' '}
            <span className="text-sky-300 font-terminal tabular-nums">{firm.magCabezas.toLocaleString('es-AR')}</span>{' '}
            cabezas en el último cierre registrado.
          </div>
        ) : null}
        <div className="cs-in d3">
          <MagPulse />
        </div>
        <div className="cs-in d4 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            [stats.consignatarias, 'consignatarias mapeadas'],
            ['2015', 'INMAG, serie completa'],
            [stats.remates, 'remates de todo el país'],
            ['1.100+', 'frigoríficos SENASA'],
          ].map(([n, l]) => (
            <div key={l as string} className="terminal-panel px-3 py-2">
              <div className="text-sky-300 font-terminal tabular-nums text-lg">{n}</div>
              <div className="text-zinc-600 text-xxs">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Escena 2: el discovery (dónde te buscan) ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">02 · El alcance</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Cuando alguien busca un remate, aparecemos nosotros.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-6">
          El productor de hoy busca en Google y le pregunta a una IA. Nuestro dato es el que citan. No prometemos
          una base de miles — te ponemos donde el mercado <span className="text-zinc-200">ya está mirando</span>.
        </p>
        <div className="cs-in d3 flex flex-wrap gap-3">
          <div className="terminal-panel px-4 py-3 flex-1 min-w-[180px]">
            <div className="text-sky-300 font-terminal tabular-nums text-2xl">+{stats.aiPorMes}</div>
            <div className="text-zinc-500 text-xxs">consultas de IA por mes sobre el mercado ganadero (ChatGPT, Copilot…)</div>
          </div>
          <div className="terminal-panel px-4 py-3 flex-1 min-w-[180px]">
            <div className="text-sky-300 font-terminal text-2xl">SEO + IA</div>
            <div className="text-zinc-500 text-xxs">INMAG, arrendamiento y remates rankean primeros — y las IAs los citan como fuente</div>
          </div>
        </div>
      </section>

      {/* ── Escena 3: ya aparecés → con PRO destacás (analizamos redes + web) ── */}
      <section className="cs-scene min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-amber-400 mb-2">03 · PRO Consignataria</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Ya aparecés. Con PRO, <span className="text-amber-400">destacás</span>.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-5">
          {firm ? `${firstName(firm.nombre)} ya está` : 'Tu firma ya está'} en el directorio. PRO no es «pagá por
          aparecer» — es que trabajemos para vos: <span className="text-zinc-200">analizamos tus redes y tu web</span>,
          y te posicionamos donde el mercado mira.
        </p>
        <div className="cs-in d2 flex items-center gap-4 mb-6 flex-wrap">
          <SocialRow />
          <span className="text-zinc-600 text-xxs">miramos y potenciamos tus redes</span>
        </div>
        <div className="cs-in d3 grid sm:grid-cols-2 gap-3 mb-6">
          {[
            ['Analizamos tus redes + tu web', 'Miramos tu Instagram, Facebook, WhatsApp, YouTube y tu sitio, y armamos tu presencia.'],
            ['Te posicionamos', 'Tu firma y tus remates, arriba en el directorio, en Google y donde citan las IAs.'],
            ['Cada remate, por email', 'Tu próximo remate sale a la base de productores.'],
            ['Analytics de tu perfil', 'Cuántos te miran, de qué zona, qué remates traccionan.'],
          ].map(([t, d]) => (
            <div key={t} className="terminal-panel px-4 py-3" style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
              <div className="text-amber-300 text-data mb-0.5">{t}</div>
              <div className="text-zinc-500 text-xxs">{d}</div>
            </div>
          ))}
        </div>
        <div className="cs-in d4">
          <Link
            href="/planes#consignataria"
            className="terminal-btn"
            style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24' }}
          >
            Probar PRO gratis · ARS 45.000/mes →
          </Link>
        </div>
      </section>

      {/* ── Escena 3b: mockups — tu consignataria + tu remate destacado ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">Así te ve el mercado con PRO</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-5">
          Tu consignataria, destacada. Tu remate, adelante.
        </h2>

        <div
          className="cs-in d2 terminal-panel mb-4"
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
              <div className="text-zinc-500 text-xxs">
                {firm?.provincia || 'Tu provincia'} · perfil destacado · aparece primero
              </div>
            </div>
          </div>
        </div>

        <div className="cs-in d3 terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.35)' }}>
          <div className="terminal-panel-header" style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}>
            Calendario · remate destacado
          </div>
          <div className="px-panel py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sky-300 font-terminal text-data">{firm?.proximoRemate?.fecha || 'Tu próximo remate'}</div>
              <div className="text-zinc-300 text-data truncate">{firm ? firm.nombre : 'Tu Consignataria'}</div>
              <div className="text-zinc-600 text-xxs">{firm?.proximoRemate?.plaza || 'Tu plaza'} · enviado por email a la base</div>
            </div>
            <span className="text-amber-300 text-xxs border border-amber-500/40 rounded-[2px] px-1.5 py-0.5 shrink-0">DESTACADO</span>
          </div>
        </div>
      </section>

      {/* ── Escena 4: y además, el intel ── */}
      <section className="cs-scene min-h-[70vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">04 · De regalo, inteligencia</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Y ves lo que opera la competencia.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-2">
          El mismo dato con el que medimos el mercado, para vos: cuántas cabezas y a qué precio movió cada firma en
          Cañuelas. En{' '}
          <Link href="/mercado/pulso" className="text-sky-300 hover:underline">
            el pulso del mercado
          </Link>{' '}
          lo ves en vivo.
        </p>
        <p className="cs-in d3 text-zinc-600 text-xxs">
          {stats.operaciones.toLocaleString('es-AR')} operaciones ya medidas · el dato del mercado de referencia (~12% nacional), no el total del país.
        </p>
      </section>

      {/* ── CTA final ── */}
      <section className="cs-scene max-w-3xl mx-auto px-4 py-16 border-t border-terminal-border text-center">
        <h2 className="cs-in text-2xl md:text-3xl font-heading text-zinc-100 mb-3">Sumá tu firma al mercado medido.</h2>
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
