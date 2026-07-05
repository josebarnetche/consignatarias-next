'use client'

import { useEffect, useRef } from 'react'

/**
 * "Scroll para descubrir" — cada tool del MCP demostrado como una conversación
 * real: pregunta del usuario → tool call → respuesta con LOS DATOS DEL DÍA
 * (nunca inventados; vienen del server). Las escenas se animan al entrar en
 * viewport (IntersectionObserver + CSS; respeta prefers-reduced-motion).
 */

export interface ShowcaseData {
  fecha: string
  inmag: { current: string; changePct: string; up: boolean }
  /** Conversación épica: lote de 40 novillos valuado al día */
  lote: { cab: string; kgTotal: string; ars: string; usd: string; ytdPct: string; weekPct: string }
  cats: Array<{ name: string; price: string; change: string }>
  spark: { points: string; fromDate: string; toDate: string; periodPct: string }
  macro: { blue: string; maiz: string; spread: string }
  remates: Array<{ fecha: string; hora: string; nombre: string; lugar: string }>
  consignatarias: Array<{ nombre: string; zona: string }>
  arriendo: { kgHa: string; precio: string; porHaAnio: string }
}

function Scene({
  n, tool, icon, pregunta, children,
}: {
  n: number
  tool: string
  icon: string
  pregunta: string
  children: React.ReactNode
}) {
  return (
    <div className="mcp-scene" data-scene>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center select-none" aria-hidden="true">
          <img src={`/marca/iconos-color/${icon}.png`} alt="" className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
        </span>
        <code className="text-sky-300 font-mono text-sm">{tool}</code>
        <span className="ml-auto text-xxs font-terminal text-zinc-600 tabular-nums">{String(n).padStart(2, '0')}/08</span>
      </div>
      <div className="terminal-panel rounded-xl p-4 sm:p-5 space-y-3">
        <div className="sc-user flex justify-end">
          <div className="max-w-[85%] rounded-lg rounded-br-sm bg-zinc-800 px-3.5 py-2 text-sm text-zinc-100">{pregunta}</div>
        </div>
        <div className="sc-typing flex gap-1 pl-1" aria-hidden="true">
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
        <div className="sc-tool inline-flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/[0.07] px-2 py-0.5 text-xxs font-mono text-sky-300">
          <span className="sc-spark">⚡</span> {tool}()
        </div>
        <div className="sc-resp rounded-lg rounded-tl-sm border border-terminal-border bg-black/30 px-3.5 py-3 text-sm text-zinc-300">
          {children}
        </div>
      </div>
    </div>
  )
}

function ExtendedChat({ d }: { d: ShowcaseData }) {
  const msgs: Array<{ kind: 'u' | 'a' | 't'; body: React.ReactNode }> = [
    { kind: 'u', body: <>Tengo un lote de {d.lote.cab} novillos de ~450 kg. ¿Cuánto vale hoy?</> },
    { kind: 't', body: <>get_indice_novillo()</> },
    {
      kind: 'a',
      body: (
        <>
          Al INMAG de hoy (<strong className="text-zinc-100">${d.inmag.current}/kg</strong>), tus{' '}
          {d.lote.kgTotal} kg valen{' '}
          <strong className="text-positive">${d.lote.ars}</strong>{' '}
          <span className="text-zinc-500">≈ USD {d.lote.usd} al blue.</span>
        </>
      ),
    },
    { kind: 'u', body: <>¿Y cómo viene el mercado?</> },
    { kind: 't', body: <>get_inmag_historico()</> },
    {
      kind: 'a',
      body: (
        <>
          En lo que va del año el índice acumula <strong className="text-positive">{d.lote.ytdPct}</strong>;
          la última rueda marcó {d.lote.weekPct} semanal.
        </>
      ),
    },
    { kind: 'u', body: <>Avisame si el novillo pasa los $4.300.</> },
    { kind: 't', body: <>crear_alerta_precio()</> },
    {
      kind: 'a',
      body: (
        <>
          <span className="text-positive">✓</span> Listo — te aviso por email o webhook cuando el
          INMAG cruce <strong className="text-zinc-100">$4.300</strong>.
        </>
      ),
    },
  ]
  return (
    <div className="mcp-scene" data-scene>
      <div className="terminal-panel rounded-xl p-4 sm:p-6 space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 pb-2 border-b border-terminal-border">
          <span className="h-2 w-2 rounded-full bg-positive animate-pulse" aria-hidden="true" />
          <span className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">
            Tu asistente · conectado a consignatarias.com
          </span>
        </div>
        {msgs.map((m, i) => {
          const delay = { transitionDelay: `${0.25 + i * 0.55}s` }
          if (m.kind === 't')
            return (
              <div key={i} className="cx-m inline-flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/[0.07] px-2 py-0.5 text-xxs font-mono text-sky-300" style={delay}>
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
              <div className="max-w-[90%] rounded-lg rounded-tl-sm border border-terminal-border bg-black/30 px-3.5 py-2.5 text-sm text-zinc-300 leading-relaxed">{m.body}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function McpShowcase(d: ShowcaseData) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scenes = rootRef.current?.querySelectorAll('[data-scene]')
    if (!scenes?.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('on')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.35 },
    )
    scenes.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="space-y-10">
      <style>{`
        .mcp-scene .sc-user,.mcp-scene .sc-tool,.mcp-scene .sc-resp{opacity:0;transform:translateY(8px);transition:opacity .45s ease,transform .45s ease}
        .mcp-scene .sc-typing{opacity:0;transition:opacity .2s ease}
        .mcp-scene.on .sc-user{opacity:1;transform:none}
        .mcp-scene.on .sc-typing{animation:typin 1.1s ease .35s both}
        .mcp-scene.on .sc-tool{opacity:1;transform:none;transition-delay:1.15s}
        .mcp-scene.on .sc-resp{opacity:1;transform:none;transition-delay:1.5s}
        @keyframes typin{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0;height:0;margin:0}}
        .sc-typing .dot{width:5px;height:5px;border-radius:9999px;background:#71717a;animation:bounce 1s infinite}
        .sc-typing .dot:nth-child(2){animation-delay:.15s}.sc-typing .dot:nth-child(3){animation-delay:.3s}
        @keyframes bounce{0%,60%,100%{transform:none}30%{transform:translateY(-3px)}}
        .mcp-scene.on .sc-spark{display:inline-block;animation:sparkp 1.2s ease 1.15s both}
        @keyframes sparkp{0%{transform:scale(.5)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
        .mcp-scene.on .sc-line{stroke-dasharray:600;stroke-dashoffset:600;animation:draw 1.6s ease 1.8s forwards}
        @keyframes draw{to{stroke-dashoffset:0}}
        .mcp-scene .cx-m{opacity:0;transform:translateY(10px);transition:opacity .5s ease,transform .5s ease}
        .mcp-scene.on .cx-m{opacity:1;transform:none}
        @media (prefers-reduced-motion:reduce){
          .mcp-scene .cx-m{opacity:1;transform:none;transition:none}
          .mcp-scene .sc-user,.mcp-scene .sc-tool,.mcp-scene .sc-resp{opacity:1;transform:none;transition:none}
          .mcp-scene .sc-typing{display:none}
          .mcp-scene.on .sc-line{animation:none;stroke-dasharray:none}
          .sc-typing .dot,.mcp-scene.on .sc-spark{animation:none}
        }
      `}</style>

      <ExtendedChat d={d} />

      <p className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 text-center pt-2">
        Y tool por tool ↓
      </p>

      <Scene n={1} tool="get_indice_novillo" icon="indice" pregunta="¿A cuánto está el novillo hoy?">
        <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">INMAG · {d.fecha}</div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-mono font-medium text-zinc-50 tabular-nums">${d.inmag.current}</span>
          <span className={`text-sm font-mono tabular-nums ${d.inmag.up ? 'text-positive' : 'text-negative'}`}>
            {d.inmag.up ? '▲' : '▼'} {d.inmag.changePct}
          </span>
          <span className="text-xxs text-zinc-500">$/kg vivo · Mercado Agroganadero</span>
        </div>
      </Scene>

      <Scene n={2} tool="get_precios_hacienda" icon="bascula" pregunta="Pasame todas las categorías.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          {d.cats.map((c) => (
            <div key={c.name} className="flex items-baseline justify-between gap-2 border-b border-terminal-border/60 pb-1">
              <span className="text-xxs text-zinc-500 uppercase tracking-wider">{c.name}</span>
              <span className="font-mono tabular-nums text-zinc-100">${c.price}</span>
            </div>
          ))}
        </div>
      </Scene>

      <Scene n={3} tool="get_inmag_historico" icon="indice" pregunta="¿Cómo viene el índice este año?">
        <svg viewBox="0 0 300 70" className="w-full h-16" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={d.spark.points} fill="none" stroke="#34d399" strokeWidth="1.8" className="sc-line" />
        </svg>
        <div className="flex items-center justify-between text-xxs text-zinc-500 mt-1 tabular-nums">
          <span>{d.spark.fromDate}</span>
          <span className="text-positive font-mono">{d.spark.periodPct} en el período</span>
          <span>{d.spark.toDate}</span>
        </div>
      </Scene>

      <Scene n={4} tool="get_contexto_macro" icon="dolar-billete" pregunta="¿Dólar blue y maíz?">
        <div className="grid grid-cols-3 gap-4">
          <div><div className="text-xxs text-zinc-500 uppercase tracking-wider mb-0.5">USD blue</div><div className="font-mono tabular-nums text-zinc-100 text-lg">${d.macro.blue}</div></div>
          <div><div className="text-xxs text-zinc-500 uppercase tracking-wider mb-0.5">Maíz USD/tn</div><div className="font-mono tabular-nums text-zinc-100 text-lg">{d.macro.maiz}</div></div>
          <div><div className="text-xxs text-zinc-500 uppercase tracking-wider mb-0.5">Novillo/maíz</div><div className="font-mono tabular-nums text-zinc-100 text-lg">{d.macro.spread}</div></div>
        </div>
      </Scene>

      <Scene n={5} tool="list_remates" icon="calendario" pregunta="¿Qué remates vienen esta semana?">
        <div className="space-y-1.5">
          {d.remates.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-12 font-mono tabular-nums text-zinc-400">{r.fecha}</span>
              <span className="w-11 font-mono tabular-nums text-zinc-500">{r.hora}</span>
              <span className="flex-1 min-w-0 truncate text-zinc-200">{r.nombre}</span>
              <span className="hidden sm:inline text-xxs text-zinc-500">{r.lugar}</span>
            </div>
          ))}
        </div>
      </Scene>

      <Scene n={6} tool="buscar_consignataria" icon="casa-remates" pregunta="Buscame consignatarias que operen en Entre Ríos.">
        <div className="space-y-1.5">
          {d.consignatarias.map((c, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-sky-300">→</span>
              <span className="flex-1 min-w-0 truncate text-zinc-200">{c.nombre}</span>
              <span className="text-xxs text-zinc-500">{c.zona}</span>
            </div>
          ))}
        </div>
      </Scene>

      <Scene n={7} tool="calcular_arrendamiento" icon="arrendamiento" pregunta={`Un campo a ${d.arriendo.kgHa} kg/ha, ¿cuánto es hoy?`}>
        <div className="font-mono text-sm text-zinc-400">
          {d.arriendo.kgHa} kg × ${d.arriendo.precio}/kg
        </div>
        <div className="text-2xl font-mono font-medium text-zinc-50 tabular-nums mt-1">
          ${d.arriendo.porHaAnio} <span className="text-sm text-zinc-500">por ha/año</span>
        </div>
        <div className="text-xxs text-zinc-500 mt-1">Canon indexado al novillo INMAG del día.</div>
      </Scene>

      <Scene n={8} tool="crear_alerta_precio" icon="alerta" pregunta="Avisame si el novillo pasa los $4.500.">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-positive">✓</span>
          <span className="text-zinc-200">Alerta creada</span>
          <span className="ml-auto rounded border border-amber-400/60 px-1.5 py-0.5 text-xxs font-terminal uppercase tracking-wider text-amber-300">API key</span>
        </div>
        <div className="text-xxs text-zinc-500 mt-1.5 font-mono">novillo &gt; $4.500 → webhook + email</div>
      </Scene>
    </div>
  )
}
