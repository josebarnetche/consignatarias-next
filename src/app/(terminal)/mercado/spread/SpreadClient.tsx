'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema } from '@/components/seo/JsonLd'
import { ProReveal, HeroNumber, StatPill } from '@/components/pro'

interface SpreadData {
  novilloArs: number
  novilloUsd: number
  cornUsd: number
  usdBlue: number
  spread: number
  profitabilityThreshold: number
  isProfitable: boolean
  lastUpdate: string
}

const FROM = '/mercado/spread'

export default function SpreadClient() {
  const [data, setData] = useState<SpreadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/market/spread')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as SpreadData
        if (!cancelled) setData(json)
      } catch (e) {
        console.error('Failed to fetch spread data:', e)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const faqs = [
    {
      question: '¿Qué es la relación maíz/novillo?',
      answer: 'Es el cociente entre el precio del kilogramo vivo de novillo y el precio del kilogramo de maíz. Indica cuántos kilos de maíz se necesitan para comprar un kilo de novillo vivo.',
    },
    {
      question: '¿Por qué es importante para los feedlots?',
      answer: 'El maíz representa el 73% de los costos directos de un feedlot. Cuando la relación supera 12:1, el engorde a corral es rentable. Por debajo, los márgenes se comprimen o desaparecen.',
    },
    {
      question: '¿Cómo se calcula?',
      answer: 'Se divide el precio del novillo (en USD/kg) por el precio del maíz (en USD/kg). Usamos INMAG para el novillo y el precio FOB MAGyP para el maíz, convertido con dólar blue.',
    },
    {
      question: '¿Cada cuánto se actualiza?',
      answer: 'Los precios se actualizan diariamente. INMAG se publica cada día hábil, el maíz FOB se actualiza según cotización de mercado.',
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/spread" sectionName="Relación Maíz/Novillo" />
      <FAQPageSchema items={faqs} />
      <DatasetSchema
        name="Relación Maíz/Novillo Argentina"
        description="Indicador de rentabilidad feedlot: ratio entre precio de novillo INMAG y maíz FOB. Actualizado diariamente."
        url="https://www.consignatarias.com.ar/mercado/spread"
        keywords={['relación maíz novillo', 'rentabilidad feedlot', 'spread ganadero', 'costo engorde']}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span>/</span>
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span>/</span>
          <span className="text-zinc-300">Relación Maíz/Novillo</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
            Relación Maíz/Novillo
          </h1>
          <p className="text-zinc-400 text-sm">
            Indicador de rentabilidad para feedlots argentinos. Actualizado diariamente.
          </p>
        </div>

        {/* ── GANCHO GRATIS: el indicador público (real, indexable) ───────── */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : error || !data ? (
            <div className="text-center py-8 text-zinc-500">
              No pudimos cargar la relación en este momento.{' '}
              <button
                onClick={() => window.location.reload()}
                className="text-amber-400 hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {/* Main spread indicator */}
              <div className="flex flex-col items-center mb-6">
                <div className="text-6xl font-bold font-terminal tabular-nums text-amber-400 mb-2">
                  {data.spread.toFixed(1)}:1
                </div>
                <div
                  className={`text-sm font-medium px-3 py-1 rounded ${
                    data.isProfitable
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {data.isProfitable ? '✓ Rentable para feedlots' : '✗ Margen comprimido'}
                </div>
                <div className="text-zinc-500 text-xs mt-2">
                  Umbral de rentabilidad: {data.profitabilityThreshold}:1
                </div>
              </div>

              {/* Component breakdown — número-hero por componente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded p-4">
                  <HeroNumber
                    label="Novillo (INMAG)"
                    value={`$${data.novilloArs.toLocaleString('es-AR')}`}
                    sub={`ARS/kg vivo · ≈ USD ${data.novilloUsd.toFixed(2)}/kg`}
                    tone="neutral"
                    size="text-xl"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded p-4">
                  <HeroNumber
                    label="Maíz FOB"
                    value={`USD ${data.cornUsd.toFixed(0)}`}
                    sub={`USD/tonelada · ≈ USD ${(data.cornUsd / 1000).toFixed(4)}/kg`}
                    tone="neutral"
                    size="text-xl"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded p-4">
                  <HeroNumber
                    label="Dólar Blue"
                    value={`$${data.usdBlue.toLocaleString('es-AR')}`}
                    sub="ARS/USD · dolarapi.com"
                    tone="neutral"
                    size="text-xl"
                  />
                </div>
              </div>

              {/* Interpretation — gancho de lectura pública */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4">
                <div className="text-amber-400 font-medium mb-2">📊 Interpretación</div>
                <p className="text-zinc-300 text-sm">
                  Con una relación de <strong>{data.spread.toFixed(1)}:1</strong>, se necesitan{' '}
                  <strong>{data.spread.toFixed(1)} kg de maíz</strong> para comprar 1 kg de novillo vivo.
                  {data.isProfitable ? (
                    <> El margen actual es <span className="text-emerald-400">favorable</span> para la operación de feedlots.</>
                  ) : (
                    <> El margen está <span className="text-red-400">comprimido</span>. Analizar costos antes de ingresar hacienda.</>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── CAPA PRO: la DECISIÓN "¿conviene engordar ahora?" ──────────── */}
        {!loading && !error && data && (
          <div className="mb-6">
            <ProReveal
              from={FROM}
              title="¿Conviene engordar ahora?"
              benefit="El veredicto operativo: a cuántos puntos estás del umbral, el margen de seguridad real, y hacia dónde empuja el mercado esta semana."
              placeholder={<DecisionPlaceholder />}
            >
              <DecisionPanel data={data} />
            </ProReveal>
          </div>
        )}

        {/* Feedlot economics explainer (público) */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-zinc-300 font-medium mb-3">¿Por qué importa esta relación?</h2>
          <div className="text-zinc-400 text-sm space-y-2">
            <p>• El <strong>maíz representa el 73%</strong> de los costos directos de un feedlot.</p>
            <p>• Un ciclo de engorde típico dura <strong>~130 días</strong>.</p>
            <p>• Cuando la relación cae por debajo de <strong>12:1</strong>, los márgenes se comprimen o se vuelven negativos.</p>
          </div>
          {data?.lastUpdate && (
            <div className="text-zinc-600 text-xs mt-4 text-right">
              Última actualización: {data.lastUpdate}
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-zinc-200 font-medium mb-1">{faq.question}</h3>
                <p className="text-zinc-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/mercado" className="text-amber-400 hover:underline">
            ← Ver Mercado
          </Link>
          <Link href="/mercado/liniers" className="text-amber-400 hover:underline">
            Precios Liniers →
          </Link>
          <Link href="/calculadora" className="text-amber-400 hover:underline">
            Calculadora →
          </Link>
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── PRO DECISION PANEL ─────────────────────────────
 * Built ONLY from real live numbers already on the page (spread, threshold).
 * No invented per-head margin, no feed-conversion assumptions: the decision
 * layer is the *distance to the umbral* + the *margen de seguridad* — the read
 * that turns the public ratio into a go / no-go.
 * ------------------------------------------------------------------------- */
function DecisionPanel({ data }: { data: SpreadData }) {
  const distance = data.spread - data.profitabilityThreshold // ratio points vs umbral (real)
  const marginPct = (distance / data.profitabilityThreshold) * 100 // margen de seguridad % (real)
  const above = distance >= 0

  // "Holgura" = qué tan lejos del umbral, en 0–100, para el StatPill.
  // 0 puntos = umbral exacto (50); cada punto de spread ≈ 8.3% de holgura.
  // Es una escala de lectura, no un dato fabricado: deriva de la distancia real.
  const holgura = Math.max(0, Math.min(100, 50 + distance * (50 / 6)))

  const verdict = above
    ? distance >= 2
      ? { tone: 'positive' as const, label: 'ENGORDAR', color: '#34d399' }
      : { tone: 'warning' as const, label: 'ENGORDAR CON CAUTELA', color: '#fbbf24' }
    : { tone: 'negative' as const, label: 'NO INGRESAR HACIENDA', color: '#f87171' }

  return (
    <div className="space-y-5">
      {/* Veredicto-hero */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <HeroNumber
          label="Veredicto operativo"
          value={verdict.label}
          sub={
            above
              ? `Estás ${distance.toFixed(1)} pts por encima del umbral ${data.profitabilityThreshold}:1`
              : `Estás ${Math.abs(distance).toFixed(1)} pts por debajo del umbral ${data.profitabilityThreshold}:1`
          }
          tone={verdict.tone}
          size="text-2xl"
        />
        <HeroNumber
          label="Margen de seguridad"
          value={`${marginPct >= 0 ? '+' : ''}${marginPct.toFixed(1)}%`}
          sub={`Relación ${data.spread.toFixed(1)}:1 vs ${data.profitabilityThreshold}:1`}
          tone={verdict.tone}
          size="text-2xl"
        />
      </div>

      {/* Holgura vs umbral */}
      <div className="space-y-3 pt-1">
        <StatPill
          label="Holgura sobre el umbral de rentabilidad"
          value={Math.round(holgura)}
          tone="percentile"
        />
        <StatPill
          label="Maíz como % del costo directo del feedlot"
          value={73}
          tone="warning"
        />
      </div>

      {/* La decisión, en una frase */}
      <div
        className="rounded p-4 text-sm"
        style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.25)' }}
      >
        <div className="text-zinc-200 leading-relaxed">
          {above ? (
            distance >= 2 ? (
              <>
                A <strong>{data.spread.toFixed(1)}:1</strong> el corral trabaja con{' '}
                <strong style={{ color: verdict.color }}>{marginPct.toFixed(0)}% de aire</strong> sobre el
                punto de equilibrio. Con el maíz pesando el 73% del costo, el engorde resiste una suba del
                grano antes de comprometer el margen: <strong>conviene ingresar hacienda</strong> mientras la
                relación se sostenga por encima de {data.profitabilityThreshold}:1.
              </>
            ) : (
              <>
                Estás apenas <strong>{distance.toFixed(1)} pts</strong> sobre el umbral. El margen existe pero
                es <strong style={{ color: verdict.color }}>fino</strong>: una suba del maíz o una baja del
                novillo te cruza a terreno negativo. <strong>Engordá solo con costo de compra cerrado</strong> y
                grano asegurado.
              </>
            )
          ) : (
            <>
              A <strong>{data.spread.toFixed(1)}:1</strong> estás <strong style={{ color: verdict.color }}>por
              debajo del equilibrio</strong>: cada kilo engordado destruye margen. La decisión clara es{' '}
              <strong>no ingresar hacienda nueva</strong> hasta que la relación recupere {data.profitabilityThreshold}:1,
              o asegurar maíz a precio antes de cualquier compra.
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* Non-real placeholder shown blurred to free/anon users — carries NO real
 * PRO read (verdict / margin). Just the shape of the panel. */
function DecisionPlaceholder() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="h-2.5 w-28 bg-zinc-800 rounded-sm mb-2" />
          <div className="h-7 w-40 bg-zinc-700 rounded-sm" />
        </div>
        <div>
          <div className="h-2.5 w-24 bg-zinc-800 rounded-sm mb-2" />
          <div className="h-7 w-24 bg-zinc-700 rounded-sm" />
        </div>
      </div>
      <div className="space-y-3 pt-1">
        {[78, 73].map((w, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="h-2.5 bg-zinc-800 rounded-sm" style={{ width: '45%' }} />
            <div className="flex-1 max-w-xs h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
              <div className="h-full bg-zinc-700" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="h-16 rounded bg-zinc-900/60 border border-zinc-800" />
    </div>
  )
}
