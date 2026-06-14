import type { Metadata } from 'next'
import Link from 'next/link'
import marketPrices from '@/lib/data/market-prices.json'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { HeroNumber } from '@/components/pro'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { PRO_TOOLS, upgradeHref, type ProTool } from '@/components/showcase/proTools'
import ProTourReveal from '@/components/showcase/ProTourReveal'

export const metadata: Metadata = {
  title: 'PRO Usuario — Las decisiones del que vende hacienda',
  description:
    'Tour de PRO Usuario: ¿vendo ahora?, neto en mano, comparador con medios de pago, spread maíz/novillo e histórico INMAG con estacionalidad. ARS $7.900/mes, sin permanencia.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/pro' },
  openGraph: {
    title: 'PRO Usuario — consignatarias.com.ar',
    description:
      'Las cinco decisiones del que vende hacienda. El gancho es libre; la lectura es PRO.',
    url: 'https://www.consignatarias.com.ar/pro',
    type: 'website',
  },
}

const fmt = (n: number, d = 0) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

const TOOL_BY_ID = Object.fromEntries(PRO_TOOLS.map((t) => [t.id, t])) as Record<string, ProTool>

export default function ProTourPage() {
  // Real data only (brand rule #1).
  const inmagToday = `$${fmt(marketPrices.inmag.current)}`
  const inmagChange = `${marketPrices.inmag.change >= 0 ? '+' : ''}${fmt(marketPrices.inmag.change, 1)}%`
  const inmagUp = marketPrices.inmag.change >= 0
  const usdBlue = `$${fmt(marketPrices.usdBlue.current)}`
  const consignatariasCount = getAllProfiles().length

  // Ancla de ROI en vivo: un camión jaula ≈ 30 novillos × 430 kg al INMAG de hoy.
  const cats = marketPrices.categories as Record<string, { current: number }>
  const novilloKg = cats.novillos?.current ?? marketPrices.inmag.current
  const valorCamion = `$${fmt(novilloKg * 430 * 30)}`
  const proPctCabeza = ((7900 / (novilloKg * 430)) * 100).toFixed(1)

  // Spread computed identically to /api/market/spread.
  const novilloUsdPerKg = marketPrices.inmag.current / marketPrices.usdBlue.current
  const cornUsdPerKg = marketPrices.corn.current / 1000
  const spreadRatioNum = novilloUsdPerKg / cornUsdPerKg
  const spreadProfitable = spreadRatioNum > 12
  const spreadRatio = fmt(spreadRatioNum, 1)

  return (
    <>
      <SectionBreadcrumbSchema section="pro" sectionName="PRO Usuario" />

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* HERO */}
        <header className="text-center space-y-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-terminal uppercase tracking-wider"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
            }}
          >
            PRO Usuario · ARS $7.900/mes
          </span>
          <h1 className="text-3xl md:text-4xl font-medium text-zinc-100 tracking-tight">
            Las cinco decisiones del que vende hacienda
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Cada herramienta te da algo gratis y sin registro —el valor de mercado, el índice de
            hoy, la relación del día—. Lo que cuesta es la <span className="text-zinc-200">lectura</span>:
            si conviene vender o aguantar, cuánto te queda neto, a quién venderle. Para productores,
            asesores, contadores y brokers.
          </p>
          <p className="text-zinc-300 text-sm max-w-2xl mx-auto leading-relaxed">
            Un camión de novillos hoy mueve <span className="text-zinc-100">≈ {valorCamion}</span>.
            PRO cuesta <span className="text-sky-400">$7.900/mes</span> ={' '}
            <span className="text-zinc-100">{proPctCabeza}% de una cabeza</span>. Mejorás tu venta
            un 0,01% y ya se pagó.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href={upgradeHref('/mercado/vender-ahora')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-sm font-medium rounded-lg transition-colors min-h-[40px]"
            >
              Desbloquear PRO — ARS $7.900/mes
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/planes?audience=productor&from=pro-tour"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-zinc-300 border border-terminal-border hover:border-zinc-600 rounded-lg transition-colors min-h-[40px]"
            >
              Ver todos los planes
            </Link>
          </div>
          <p className="text-zinc-600 text-xxs">
            Sin permanencia · Cancelás cuando quieras · Pago por Rebill
          </p>
          <p className="text-emerald-400/90 text-xxs">
            🎁 ¿No querés pagar a ciegas?{' '}
            <Link href="/mercado/vender-ahora" className="underline underline-offset-2 hover:text-emerald-300">
              Probá un veredicto completo gratis esta semana
            </Link>
          </p>
        </header>

        {/* TOOL 1 — ¿Vendo ahora? */}
        <ToolSection tool={TOOL_BY_ID['vender-ahora']} index={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <FreePanel label="Gratis · el dato">
              <HeroNumber
                label="INMAG hoy · novillo $/kg vivo"
                value={inmagToday}
                sub={
                  <span style={{ color: inmagUp ? '#34d399' : '#f87171' }}>
                    {inmagChange} vs. semana anterior
                  </span>
                }
                tone="accent"
                size="text-3xl"
              />
              <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                Multiplicás por los kilos de tu lote y ya tenés el valor a precio de mercado. Eso es
                libre.
              </p>
            </FreePanel>
            <ProTourReveal
              from="/mercado/vender-ahora"
              title="PRO · la decisión"
              benefit="El veredicto vender / aguantar, leído sobre el percentil del precio en dólares reales del último año."
            />
          </div>
        </ToolSection>

        {/* TOOL 2 — Neto en mano */}
        <ToolSection tool={TOOL_BY_ID['neto-en-mano']} index={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <FreePanel label="Gratis · el bruto">
              <HeroNumber
                label="Bruto novillo · $/kg vivo"
                value={inmagToday}
                sub="antes de comisión, gastos y flete"
                size="text-3xl"
              />
              <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                El precio bruto a INMAG lo calculás gratis. Pero del bruto al bolsillo hay un trecho.
              </p>
            </FreePanel>
            <ProTourReveal
              from="/calculadora"
              title="PRO · el neto real"
              benefit="Descontás comisión, gastos de venta y flete y ves el neto en mano: en ARS, en USD y en $/kg."
            />
          </div>
        </ToolSection>

        {/* TOOL 3 — Comparador */}
        <ToolSection tool={TOOL_BY_ID['comparador']} index={3}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <FreePanel label="Gratis · el directorio">
              <HeroNumber
                label="Consignatarias comparables"
                value={consignatariasCount.toLocaleString('es-AR')}
                sub="remates, provincias y tipos · lado a lado"
                size="text-3xl"
              />
              <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                Ponés varias consignatarias lado a lado y ves remates, provincias y tipos. Gratis.
              </p>
            </FreePanel>
            <ProTourReveal
              from="/comparar"
              title="PRO · a quién venderle"
              benefit="Medios de pago aceptados y plazos típicos de cobro de cada consignataria. La columna que decide a quién le conviene venderle."
            />
          </div>
        </ToolSection>

        {/* TOOL 4 — Spread maíz/novillo */}
        <ToolSection tool={TOOL_BY_ID['spread']} index={4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <FreePanel label="Gratis · la relación">
              <HeroNumber
                label="Relación maíz/novillo hoy"
                value={`${spreadRatio} : 1`}
                sub={
                  <span style={{ color: spreadProfitable ? '#34d399' : '#f87171' }}>
                    {spreadProfitable ? 'por encima del umbral 12:1' : 'por debajo del umbral 12:1'}
                  </span>
                }
                tone={spreadProfitable ? 'positive' : 'negative'}
                size="text-3xl"
              />
              <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                Kilos de maíz para comprar un kilo de novillo vivo. INMAG ÷ maíz FOB, al blue
                ({usdBlue}). El ratio es libre.
              </p>
            </FreePanel>
            <ProTourReveal
              from="/mercado/spread"
              title="PRO · el veredicto operativo"
              benefit="A cuántos puntos estás del umbral de rentabilidad, el margen de seguridad real y hacia dónde empuja el mercado esta semana."
            />
          </div>
        </ToolSection>

        {/* TOOL 5 — Histórico y estacionalidad */}
        <ToolSection tool={TOOL_BY_ID['historico']} index={5}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <FreePanel label="Gratis · hoy">
              <HeroNumber
                label="INMAG hoy · novillo $/kg"
                value={inmagToday}
                sub="el índice del día, siempre libre"
                size="text-3xl"
              />
              <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                El INMAG de hoy lo ve cualquiera. La serie completa para leer la estacionalidad, no.
              </p>
            </FreePanel>
            <ProTourReveal
              from="/mercado/inmag"
              title="PRO · la década completa"
              benefit="Histórico diario del INMAG descargable en CSV + estacionalidad mes×año: en qué momento del año conviene vender."
            />
          </div>
        </ToolSection>

        {/* HONESTY STRIP */}
        <div className="terminal-panel rounded-terminal">
          <div className="terminal-panel-header">Lo que no prometemos</div>
          <div className="px-panel py-5 text-zinc-400 text-data leading-relaxed space-y-2">
            <p>
              No adivinamos el precio de mañana ni te decimos qué hacer con tu plata. Lo que hacemos
              es darte la <span className="text-zinc-200">lectura estadística</span> del momento —el
              percentil del precio, la holgura del spread, la estacionalidad— sobre datos públicos y
              citables (INMAG, dólar blue, maíz FOB). La decisión final es tuya.
            </p>
            <p className="text-zinc-600 text-xxs">
              Todos los números de esta página son del día y salen de fuentes reales. Si un dato
              falta, lo marcamos; nunca lo inventamos.
            </p>
          </div>
        </div>

        {/* CTA FINAL */}
        <div className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-medium text-zinc-100 tracking-tight">
            Cinco decisiones por ARS $7.900 al mes
          </h2>
          <Link
            href={upgradeHref('/mercado/vender-ahora')}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-sm font-medium rounded-lg transition-colors min-h-[40px]"
          >
            Desbloquear PRO Usuario
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <p className="text-zinc-600 text-xxs">
            Sin permanencia · Cancelás cuando quieras desde tu cuenta
          </p>
        </div>
      </div>
    </>
  )
}

/* ---------- local presentational helpers ---------- */

function ToolSection({
  tool,
  index,
  children,
}: {
  tool: ProTool
  index: number
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`pro-${tool.id}`}>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-sky-400/60 font-terminal tabular-nums text-sm">
          0{index}
        </span>
        <div>
          <h2 id={`pro-${tool.id}`} className="text-zinc-100 text-lg font-medium tracking-tight">
            {tool.title}
          </h2>
          <p className="text-zinc-500 text-data">{tool.hook}</p>
        </div>
        <Link
          href={tool.href}
          className="ml-auto text-sky-400 text-xxs font-terminal uppercase tracking-wider hover:text-sky-300 transition-colors whitespace-nowrap self-center"
        >
          Abrir →
        </Link>
      </div>
      {children}
    </section>
  )
}

function FreePanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="terminal-panel rounded-terminal flex flex-col">
      <div className="terminal-panel-header text-zinc-400">{label}</div>
      <div className="px-panel py-5 flex-1">{children}</div>
    </div>
  )
}
