'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'

interface Stats {
  consignatarias: number
  remates: number
  aiRefsMes: number
  firmsCitadas: number
}
interface Citada {
  slug: string
  nombre: string
  refs: number
  engines: string
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

/* Conversación simulada: un productor le pregunta a una IA y aparecen firmas.
   Muestra, no dice. Los nombres son reales (los que las IAs ya citaron). */
function Chat({ firm, cited }: { firm?: Firm; cited: string[] }) {
  const nombres = firm
    ? [firm.nombre, ...cited.filter((n) => n !== firm.nombre)].slice(0, 3)
    : cited.slice(0, 3)
  const msgs: Array<{ kind: 'u' | 'a' | 't'; body: ReactNode }> = [
    { kind: 'u', body: <>Tengo 180 novillos para invernada por {firm?.provincia ? firm.provincia : 'Corrientes'}. ¿Con qué consignataria los remato?</> },
    { kind: 't', body: <>buscar_consignataria()</> },
    {
      kind: 'a',
      body: (
        <>
          Por esa zona rematan invernada, entre otras:{' '}
          {nombres.map((n, i) => (
            <span key={n}>
              <strong className={i === 0 && firm ? 'text-amber-300' : 'text-zinc-100'}>{n}</strong>
              {i < nombres.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </>
      ),
    },
    { kind: 'u', body: <>¿Y cuándo es la próxima?</> },
    {
      kind: 'a',
      body: (
        <>
          {firm ? firstName(firm.nombre) : nombres[0]?.replace(/\s+(SA|SRL).*$/i, '')} tiene remate esta semana. Te
          dejo el catálogo y la hora.
        </>
      ),
    },
  ]
  return (
    <div className="cs-chat terminal-panel rounded-xl p-4 sm:p-6 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-terminal-border">
        <span className="h-2 w-2 rounded-full bg-positive animate-pulse" aria-hidden="true" />
        <span className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">
          Un productor, recién, en su teléfono
        </span>
      </div>
      {msgs.map((m, i) => {
        const delay = { transitionDelay: `${0.2 + i * 0.6}s` } as const
        if (m.kind === 't')
          return (
            <div
              key={i}
              className="cx-m inline-flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/[0.07] px-2 py-0.5 text-xxs font-mono text-sky-300"
              style={delay}
            >
              ⚡ {m.body}
            </div>
          )
        if (m.kind === 'u')
          return (
            <div key={i} className="cx-m flex justify-end" style={delay}>
              <div className="max-w-[85%] rounded-lg rounded-br-sm bg-zinc-800 px-3.5 py-2 text-sm text-zinc-100">{m.body}</div>
            </div>
          )
        return (
          <div key={i} className="cx-m flex" style={delay}>
            <div className="max-w-[90%] rounded-lg rounded-tl-sm border border-terminal-border bg-black/30 px-3.5 py-2.5 text-sm text-zinc-300 leading-relaxed">
              {m.body}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Scroll-to-discover para CONSIGNATARIAS — evocativa, no declarativa. Muestra el
 * momento (un productor le pregunta a una IA y una firma aparece) y deja que el
 * valor se infiera. Personalizable por slug (ABM).
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

  const citedNames = citadas.map((c) => c.nombre)

  return (
    <div ref={rootRef} className="cs-root">
      <style>{`
        .cs-scene .cs-in{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
        .cs-scene.on .cs-in{opacity:1;transform:none}
        .cs-scene.on .cs-in.d1{transition-delay:.12s}
        .cs-scene.on .cs-in.d2{transition-delay:.24s}
        .cs-chat .cx-m{opacity:0;transform:translateY(10px);transition:opacity .5s ease,transform .5s ease}
        .cs-scene.on .cs-chat .cx-m{opacity:1;transform:none}
        @media (prefers-reduced-motion:reduce){
          .cs-scene .cs-in,.cs-scene .cs-chat .cx-m{opacity:1;transform:none;transition:none}
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="min-h-[70vh] flex flex-col justify-center max-w-2xl mx-auto px-4 pt-10 pb-6">
        {firm && (
          <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-600 mb-3">{firm.nombre}</div>
        )}
        <h1 className="text-4xl md:text-5xl font-heading text-zinc-100 leading-[1.08] mb-4">
          El productor ya no busca en la guía. <span className="text-amber-400">Pregunta.</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-8">Y en la respuesta, aparece una consignataria.</p>
        <div className="text-zinc-700 text-xxs font-terminal animate-pulse">↓</div>
      </section>

      {/* ── La escena (la demostración) ── */}
      <section className="cs-scene min-h-[90vh] flex flex-col justify-center max-w-2xl mx-auto px-4 py-12">
        <div className="cs-in">
          <Chat firm={firm} cited={citedNames} />
        </div>
        <p className="cs-in d2 text-zinc-500 text-sm mt-6 max-w-xl">
          No es una demo. Esa respuesta se arma con el dato de consignatarias.com.ar — el que ChatGPT y Copilot ya
          consultan del mercado.
        </p>
      </section>

      {/* ── El reveal (quién ya aparece) ── */}
      <section className="cs-scene min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-4 py-12 border-t border-terminal-border">
        <h2 className="cs-in text-2xl md:text-3xl font-heading text-zinc-100 mb-4">
          {firm && firm.aiCitas ? (
            <>Y a {firstName(firm.nombre)} ya la nombraron.</>
          ) : (
            <>Algunas firmas ya aparecen.</>
          )}
        </h2>
        {firm && firm.aiCitas ? (
          <p className="cs-in d1 text-zinc-400 text-base max-w-xl mb-6">
            {firm.aiEngines || 'Una IA'} recomendó a {firstName(firm.nombre)}{' '}
            <span className="text-zinc-100">{firm.aiCitas}</span>
            {firm.aiCitas === 1 ? ' vez' : ' veces'} el último mes. Sin que hicieras nada.
          </p>
        ) : (
          <p className="cs-in d1 text-zinc-400 text-base max-w-xl mb-6">
            El último mes, las IAs nombraron a estas — sin que pagaran, sin que hicieran nada. Salió del dato.
          </p>
        )}
        <div className="cs-in d1 flex flex-wrap gap-2 mb-2 max-w-xl">
          {citadas.slice(0, 10).map((c) => (
            <span
              key={c.slug}
              className={`text-xxs font-terminal border rounded-[2px] px-2 py-1 ${
                firm && c.slug === firm.slug ? 'border-amber-500/50 text-amber-300' : 'border-terminal-border text-zinc-400'
              }`}
            >
              {c.nombre}
            </span>
          ))}
        </div>
      </section>

      {/* ── El giro: que seas vos ── */}
      <section className="cs-scene min-h-[75vh] flex flex-col justify-center max-w-2xl mx-auto px-4 py-12 border-t border-terminal-border">
        <p className="cs-in text-xxs font-terminal uppercase tracking-widest text-amber-400 mb-3">Consignataria PRO</p>
        <h2 className="cs-in d1 text-2xl md:text-3xl font-heading text-zinc-100 mb-4">Que seas vos la que aparece.</h2>
        <p className="cs-in d1 text-zinc-400 text-base max-w-xl mb-8">
          Ponemos tu firma y tus remates adelante — en el sitio, en la respuesta de las IAs, y en el mail del
          productor. Vos rematás; que el mercado te encuentre lo hacemos nosotros.
        </p>
        <div className="cs-in d2 flex flex-wrap gap-3 items-center">
          <Link
            href="/planes#consignataria"
            className="terminal-btn"
            style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24' }}
          >
            Probar gratis →
          </Link>
          <span className="text-zinc-600 text-xxs font-terminal">ARS 45.000/mes · sin permanencia</span>
        </div>
        <p className="cs-in d2 text-zinc-700 text-xxs mt-8">
          Ya sos {stats.consignatarias} en el directorio. Pronto, tu CRM de remates.
        </p>
      </section>
    </div>
  )
}
