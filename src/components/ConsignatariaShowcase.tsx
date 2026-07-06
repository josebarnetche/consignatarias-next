'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import MagPulse from '@/components/MagPulse'

interface Stats {
  consignatarias: number
  remates: number
  operaciones: number
  aiPorMes: number
}

/**
 * Scroll-to-discover para CONSIGNATARIAS (distinta de la de dev en /mcp).
 * Frame: autoridad del dato de referencia + discovery (IA/Google) + herramientas
 * PRO. Sin overpromise de "miles de productores" (la base directa es chica).
 * Reveals con IntersectionObserver + CSS (respeta prefers-reduced-motion).
 */
export default function ConsignatariaShowcase({ stats }: { stats: Stats }) {
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
          ● Para consignatarias y casas de remate
        </div>
        <h1 className="text-4xl md:text-5xl font-heading text-zinc-100 leading-[1.05] mb-4">
          El mercado ganadero, <span className="text-sky-400">medido</span>. Y tu firma, en el centro.
        </h1>
        <p className="text-zinc-400 text-base max-w-2xl mb-6">
          consignatarias.com.ar es el observatorio del mercado de referencia: precios, remates y el dato de
          Cañuelas operación por operación. Es lo que productores, IAs y toda la cadena consultan. Sumá tu firma.
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

      {/* ── Escena 3: con PRO, tu firma se destaca ── */}
      <section className="cs-scene min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-amber-400 mb-2">03 · PRO Consignataria</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-3">
          Con PRO, tu firma no pasa desapercibida.
        </h2>
        <p className="cs-in d2 text-zinc-400 text-sm max-w-2xl mb-6">
          Es alcance, no «pagá por aparecer»: tus remates llegan más lejos y tu perfil trabaja para vos.
        </p>
        <div className="cs-in d3 grid sm:grid-cols-2 gap-3 mb-6">
          {[
            ['Cada remate, por email', 'Tu próximo remate sale a la base de productores registrados.'],
            ['Badge dorado + perfil destacado', 'Aparecés primero en el directorio y en las búsquedas.'],
            ['Analytics de tu perfil', 'Cuántos te miran, de qué zona, qué remates traccionan.'],
            ['Landing propia + QR', 'Una página tuya para compartir catálogos, con QR para el papel.'],
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
