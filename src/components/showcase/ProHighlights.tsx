import Link from 'next/link'
import { HeroNumber } from '@/components/pro'
import { PRO_TOOLS, type ProTool } from './proTools'

/**
 * Home "highlights PRO" section. Turns the 5 PRO Usuario tools from tepid copy
 * cards into protagonists: one hero card (¿Vendo ahora?) leading with a single
 * real number, four neutral-bordered panels behind it. Each card shows the FREE
 * gancho (real public data) and labels the gated PRO decision with an accent
 * badge — never the gated numbers, never fabricated ones (brand rule #1).
 *
 * Server component: receives pre-formatted, real values from page.tsx.
 */
export interface ProHighlightsData {
  /** INMAG today, $/kg vivo — pre-formatted es-AR string, e.g. "$4.236". */
  inmagToday: string
  /** INMAG weekly change, pre-formatted, e.g. "+3,8%". */
  inmagChange: string
  /** Whether the weekly change is positive (tone). */
  inmagUp: boolean
  /** Spread ratio today, pre-formatted, e.g. "13,7". */
  spreadRatio: string
  /** Whether spread is above the 12:1 profitability threshold. */
  spreadProfitable: boolean
  /** Count of consignatarias in the directory (real getAllProfiles().length). */
  consignatariasCount: number
}

const TOOL_BY_ID = Object.fromEntries(PRO_TOOLS.map((t) => [t.id, t])) as Record<string, ProTool>

function ProBadge() {
  return (
    <span className="text-[9px] font-terminal font-bold uppercase tracking-wider text-sky-400 border border-sky-400/40 bg-sky-400/10 rounded-sm px-1 py-0.5 leading-none">
      PRO
    </span>
  )
}

/** Card chrome shared by hero + secondary tiles. Hero gets the accent border. */
function ToolCard({
  tool,
  hero = false,
  children,
}: {
  tool: ProTool
  hero?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={tool.href}
      className={`group flex flex-col terminal-panel rounded-terminal transition-colors hover:border-sky-400/50 ${
        hero ? 'lg:row-span-2 lg:col-span-2' : ''
      }`}
      style={hero ? { borderColor: 'rgba(56, 189, 248, 0.4)' } : undefined}
    >
      <div
        className="terminal-panel-header flex items-center justify-between gap-2"
        style={hero ? { color: '#38bdf8' } : undefined}
      >
        <span className="truncate">{tool.title}</span>
        <ProBadge />
      </div>
      <div className={`px-panel ${hero ? 'py-5' : 'py-4'} flex flex-col gap-3 flex-1`}>
        {children}
        <p className="text-zinc-400 text-data leading-relaxed">{tool.hook}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-zinc-600 text-xxs font-terminal uppercase tracking-wider">
            <span className="text-zinc-400">{tool.freeLabel}</span>
            <span className="px-1.5 text-zinc-700">→</span>
            <span className="text-sky-400">{tool.proLabel}</span>
          </span>
          <span className="text-sky-400 text-xxs font-terminal uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Abrir →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function ProHighlights(data: ProHighlightsData) {
  const vender = TOOL_BY_ID['vender-ahora']
  const neto = TOOL_BY_ID['neto-en-mano']
  const comparador = TOOL_BY_ID['comparador']
  const spread = TOOL_BY_ID['spread']
  const historico = TOOL_BY_ID['historico']

  return (
    <section className="max-w-7xl mx-auto px-6 pb-32">
      {/* Header */}
      <div className="text-center mb-10">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-terminal uppercase tracking-wider mb-4"
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
          }}
        >
          PRO Usuario · ARS $7.900/mes
        </span>
        <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight mb-3">
          Las cinco decisiones del que vende hacienda
        </h2>
        <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
          No te damos un número suelto: te damos la decisión. Cuánto te queda neto, cuándo conviene
          vender y a quién. El gancho es libre; la lectura es PRO.
        </p>
      </div>

      {/* Grid: hero (¿Vendo ahora?) leads, 4 neutral tiles behind it. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {/* HERO — ¿Vendo ahora? leads with the single real number (INMAG hoy). */}
        <ToolCard tool={vender} hero>
          <HeroNumber
            label="INMAG hoy · novillo $/kg vivo"
            value={data.inmagToday}
            sub={
              <span style={{ color: data.inmagUp ? '#34d399' : '#f87171' }}>
                {data.inmagChange} vs. semana anterior
              </span>
            }
            tone="accent"
            size="text-4xl"
          />
          <p className="text-zinc-500 text-xxs leading-relaxed">
            El valor de tu lote a precio de mercado lo ves gratis. El veredicto —vender o aguantar,
            leído sobre el percentil en dólares reales— es PRO.
          </p>
        </ToolCard>

        {/* Neto en mano */}
        <ToolCard tool={neto}>
          <HeroNumber
            label="Bruto novillo · $/kg vivo"
            value={data.inmagToday}
            sub="comisión + gastos + flete a descontar"
            size="text-2xl"
          />
        </ToolCard>

        {/* Comparador */}
        <ToolCard tool={comparador}>
          <HeroNumber
            label="Consignatarias en el directorio"
            value={data.consignatariasCount.toLocaleString('es-AR')}
            sub="remates, provincias y tipos · gratis"
            size="text-2xl"
          />
        </ToolCard>

        {/* Spread maíz/novillo */}
        <ToolCard tool={spread}>
          <HeroNumber
            label="Relación maíz/novillo hoy"
            value={`${data.spreadRatio} : 1`}
            sub={
              <span style={{ color: data.spreadProfitable ? '#34d399' : '#f87171' }}>
                {data.spreadProfitable ? 'por encima del umbral 12:1' : 'por debajo del umbral 12:1'}
              </span>
            }
            tone={data.spreadProfitable ? 'positive' : 'negative'}
            size="text-2xl"
          />
        </ToolCard>

        {/* Histórico y estacionalidad */}
        <ToolCard tool={historico}>
          <HeroNumber
            label="INMAG hoy · novillo $/kg"
            value={data.inmagToday}
            sub="la década completa en CSV + mes×año · PRO"
            size="text-2xl"
          />
        </ToolCard>
      </div>

      {/* Single primary action for the section. */}
      <div className="text-center">
        <Link
          href="/pro"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-sm font-medium rounded-lg transition-colors min-h-[40px]"
        >
          Ver el tour PRO Usuario
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <p className="text-zinc-500 text-xxs mt-3">
          Sin permanencia · Cancelá cuando quieras · El gancho de cada herramienta es libre y sin
          registro
        </p>
      </div>
    </section>
  )
}
