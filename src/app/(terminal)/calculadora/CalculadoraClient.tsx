'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ProReveal, HeroNumber, StatPill } from '@/components/pro'
import LeadCapture from '@/components/leads/LeadCapture'
import { trackEvent, trackOutboundClick } from '@/lib/analytics'
import { requestAccountNudge } from '@/lib/account-nudge'

interface MarketPrices {
  inmag: { current: number; prev: number; change: number }
  categories: Record<string, { current: number; prev: number; change: number }>
  usdBlue: { current: number; prev: number; change: number }
}

interface LineItem {
  id: string
  categoria: string
  cabezas: number
  pesoPromedio: number
}

const CATEGORIAS = [
  { value: 'novillos', label: 'Novillos', defaultPeso: 450 },
  { value: 'novillitos', label: 'Novillitos', defaultPeso: 350 },
  { value: 'vaquillonas', label: 'Vaquillonas', defaultPeso: 320 },
  { value: 'vacas', label: 'Vacas', defaultPeso: 400 },
  { value: 'toros', label: 'Toros', defaultPeso: 550 },
  { value: 'terneros', label: 'Terneros', defaultPeso: 180 },
]

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function fmtCurrency(n: number): string {
  return '$' + fmt(n)
}

export default function CalculadoraClient({ prices }: { prices: MarketPrices }) {
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', categoria: 'novillos', cabezas: 10, pesoPromedio: 450 }
  ])
  const [showResult, setShowResult] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)

  // Net-back ("neto en mano") — PRO. Real commercial deductions only.
  const [comision, setComision] = useState(3) // % comisión consignatario (típico 2–4%)
  const [gastos, setGastos] = useState(2) // % gastos de comercialización (sellado, asociación, etc.)
  const [fletePorCabeza, setFletePorCabeza] = useState(0) // $/cabeza transporte a plaza

  function addItem() {
    setItems([...items, {
      id: Date.now().toString(),
      categoria: 'novillos',
      cabezas: 10,
      pesoPromedio: 450
    }])
  }

  function removeItem(id: string) {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id))
    }
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      // Update default peso when categoria changes
      if (field === 'categoria') {
        const cat = CATEGORIAS.find(c => c.value === value)
        if (cat) updated.pesoPromedio = cat.defaultPeso
      }
      return updated
    }))
  }

  const totals = useMemo(() => {
    let totalCabezas = 0
    let totalKilos = 0
    let totalValorARS = 0

    for (const item of items) {
      const precio = prices.categories[item.categoria]?.current || prices.inmag.current
      const kilos = item.cabezas * item.pesoPromedio
      const valor = kilos * precio

      totalCabezas += item.cabezas
      totalKilos += kilos
      totalValorARS += valor
    }

    const usd = prices.usdBlue.current > 0 ? prices.usdBlue.current : null
    const totalValorUSD = usd ? totalValorARS / usd : 0

    return { totalCabezas, totalKilos, totalValorARS, totalValorUSD }
  }, [items, prices])

  // Net-back: gross minus REAL commercial costs (commission, marketing, freight).
  // IVA (10.5% on hacienda en pie) is NOT subtracted — for a responsable inscripto
  // it is collected and remitted, neutral to take-home. Shown as info only.
  const netback = useMemo(() => {
    const bruto = totals.totalValorARS
    const comisionMonto = bruto * (comision / 100)
    const gastosMonto = bruto * (gastos / 100)
    const fleteMonto = fletePorCabeza * totals.totalCabezas
    const netoARS = Math.max(0, bruto - comisionMonto - gastosMonto - fleteMonto)
    const usd = prices.usdBlue.current > 0 ? prices.usdBlue.current : null
    const netoUSD = usd ? netoARS / usd : 0
    const netoPorKg = totals.totalKilos > 0 ? netoARS / totals.totalKilos : 0
    const brutoPorKg = totals.totalKilos > 0 ? bruto / totals.totalKilos : 0
    const ivaInfo = bruto * 0.105
    const descuentoPct = bruto > 0 ? ((bruto - netoARS) / bruto) * 100 : 0
    const retenidoPct = 100 - descuentoPct // % del bruto que te queda en mano
    return {
      bruto, comisionMonto, gastosMonto, fleteMonto, netoARS, netoUSD,
      netoPorKg, brutoPorKg, ivaInfo, descuentoPct, retenidoPct,
    }
  }, [totals, comision, gastos, fletePorCabeza, prices.usdBlue])

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault()

    // The calc itself — the engagement event (was completely untracked).
    trackEvent('calculadora_calculate', {
      categorias: items.map((i) => i.categoria).join(','),
      lineas: items.length,
      total_cabezas: totals.totalCabezas,
      total_kilos: totals.totalKilos,
      valor_bruto: totals.totalValorARS,
    })

    if (email && !emailSaved) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'calculadora' }),
        })
        setEmailSaved(true)
        // The conversion: a captured lead off the calculator.
        trackEvent('calculadora_lead', {
          source: 'calculadora',
          valor_bruto: totals.totalValorARS,
          total_cabezas: totals.totalCabezas,
        })
      } catch {
        // Continue anyway
      }
    }

    setShowResult(true)

    // Nudge-first: el resultado ya se mostró. Al anónimo lo invitamos (sin
    // obligarlo) a crear cuenta gratis para guardar el historial. El toast global
    // se autosuprime si ya está logueado o si fue pospuesto.
    requestAccountNudge({ reason: 'calc_result' })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/mercado" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Ver precios de mercado
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
          <span className="inline-flex w-9 h-9 rounded bg-zinc-100 items-center justify-center align-middle mr-2" aria-hidden="true">
            <img src="/marca/iconos-color/bascula.png" alt="" className="w-6 h-6" />
          </span>
          Calculadora de Precios de Hacienda
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Estimá el valor de tu tropa usando los precios INMAG actualizados. 
          Los valores son referenciales y pueden variar según calidad, ubicación y condiciones de venta.
        </p>
      </div>

      {/* Current prices banner */}
      <div className="terminal-panel mb-6">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Precios INMAG del día</span>
          <span className="text-xxs text-zinc-500">$/kg vivo</span>
        </div>
        <div className="px-panel py-3 grid grid-cols-3 sm:grid-cols-6 gap-4">
          {CATEGORIAS.map(cat => {
            const price = prices.categories[cat.value]
            return (
              <Link key={cat.value} href={`/mercado/${cat.value}`} className="text-center group">
                <div className="text-xxs text-zinc-500 uppercase group-hover:text-accent transition-colors">{cat.label}</div>
                <div className="text-sm text-zinc-200 font-mono group-hover:text-accent transition-colors">
                  {price ? fmtCurrency(price.current) : '—'}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleCalculate}>
        {/* Line items */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Tu hacienda</div>
          <div className="divide-y divide-terminal-border">
            {items.map((item, index) => (
              <div key={item.id} className="px-panel py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xxs text-zinc-500 font-terminal">#{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xxs text-red-400 hover:text-red-300 ml-auto"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">
                      Categoría
                    </label>
                    <select
                      value={item.categoria}
                      onChange={(e) => updateItem(item.id, 'categoria', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">
                      Cabezas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.cabezas}
                      onChange={(e) => updateItem(item.id, 'cabezas', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">
                      Peso prom. (kg)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={item.pesoPromedio}
                      onChange={(e) => updateItem(item.id, 'pesoPromedio', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-panel py-3 border-t border-terminal-border">
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-accent hover:text-accent-bright transition-colors"
            >
              + Agregar categoría
            </button>
          </div>
        </div>

        {/* Email capture */}
        {!emailSaved && (
          <div className="terminal-panel mb-6">
            <div className="terminal-panel-header">Tu email (opcional)</div>
            <div className="px-panel py-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500"
              />
              <p className="text-xxs text-zinc-500 mt-2">
                Recibí alertas cuando cambien los precios de las categorías que te interesan.
              </p>
            </div>
          </div>
        )}

        {/* Calculate button */}
        <button
          type="submit"
          className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors"
        >
          Calcular valor estimado
        </button>
      </form>

      {/* Result */}
      {showResult && (
        <div className="space-y-6 mt-6">
          {/* ── GANCHO GRATIS: valor estimado (data pública INMAG) ── */}
          <div className="terminal-panel">
            <div className="terminal-panel-header text-accent">Valor bruto estimado</div>
            <div className="px-panel py-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <HeroNumber label="Total cabezas" value={fmt(totals.totalCabezas)} />
                <HeroNumber label="Total kilos" value={`${fmt(totals.totalKilos)} kg`} />
              </div>

              <div className="border-t border-zinc-800 pt-6">
                <HeroNumber
                  label="Valor bruto estimado"
                  value={fmtCurrency(totals.totalValorARS)}
                  tone="positive"
                  size="text-3xl sm:text-4xl"
                  sub={
                    <>
                      ≈ USD {fmt(totals.totalValorUSD)}
                      {' · '}{fmtCurrency(netback.brutoPorKg)}/kg vivo
                      <span className="text-zinc-600"> · blue ${fmt(prices.usdBlue.current)}</span>
                    </>
                  }
                />
              </div>

              <p className="text-xxs text-zinc-600 mt-5">
                Bruto = kilos × precio INMAG por categoría. Es lo que vale tu tropa en plaza,
                antes de descuentos. Lo que <span className="text-zinc-400">te queda en mano</span> es
                otra historia — abajo.
              </p>
            </div>
          </div>

          {/* ── DECISIÓN (PRO): neto en mano ── */}
          <ProReveal
            from="/calculadora"
            title="Neto en mano"
            benefit="Descontá comisión, gastos y flete del bruto y mirá la plata real — en ARS, USD y $/kg neto, con la lectura de si el descuento es sano."
            placeholder={<NetbackPlaceholder />}
          >
            <div className="terminal-panel" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
              <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
                Neto en mano
              </div>
              <div className="px-panel py-6">
                <p className="text-xxs text-zinc-500 mb-4">
                  Lo que te queda después de comisión, gastos y flete. Ajustá los valores a tu operación —
                  son tuyos, no inventamos porcentajes.
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Comisión %</label>
                    <input type="number" min="0" max="15" step="0.5" value={comision}
                      onChange={(e) => setComision(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Gastos %</label>
                    <input type="number" min="0" max="15" step="0.5" value={gastos}
                      onChange={(e) => setGastos(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-1">Flete $/cab.</label>
                    <input type="number" min="0" step="500" value={fletePorCabeza}
                      onChange={(e) => setFletePorCabeza(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 tabular-nums" />
                  </div>
                </div>

                {/* Waterfall bruto → neto */}
                <div className="space-y-1.5 text-sm font-terminal tabular-nums mb-5">
                  <div className="flex justify-between text-zinc-300"><span>Bruto</span><span>{fmtCurrency(netback.bruto)}</span></div>
                  <div className="flex justify-between" style={{ color: '#f87171' }}><span>− Comisión ({comision}%)</span><span>−{fmtCurrency(netback.comisionMonto)}</span></div>
                  <div className="flex justify-between" style={{ color: '#f87171' }}><span>− Gastos ({gastos}%)</span><span>−{fmtCurrency(netback.gastosMonto)}</span></div>
                  <div className="flex justify-between" style={{ color: '#f87171' }}><span>− Flete ({fmt(totals.totalCabezas)} cab.)</span><span>−{fmtCurrency(netback.fleteMonto)}</span></div>
                </div>

                {/* Neto hero */}
                <div className="border-t border-zinc-800 pt-5">
                  <HeroNumber
                    label={`Neto estimado en mano · te queda el ${netback.retenidoPct.toFixed(1)}% del bruto`}
                    value={fmtCurrency(netback.netoARS)}
                    tone="accent"
                    size="text-3xl sm:text-4xl"
                    sub={
                      <>
                        ≈ USD {fmt(netback.netoUSD)}
                        {' · '}{fmtCurrency(netback.netoPorKg)}/kg neto
                      </>
                    }
                  />
                </div>

                {/* Reparto del bruto — barras */}
                <div className="space-y-2.5 mt-5">
                  <StatPill label="Te queda (neto)" value={Math.round(netback.retenidoPct)} tone="percentile" />
                  <StatPill label="Se va en costos" value={Math.round(netback.descuentoPct)} tone="negative" />
                </div>

                {/* ── DECISIÓN, no dato ── */}
                <div className="border-t border-zinc-800 mt-5 pt-4">
                  {(() => {
                    const d = netback.descuentoPct
                    // Banda de referencia honesta: comisión+gastos típicos rondan 4–8% del bruto;
                    // sumado al flete, > ~10% empieza a comerse el resultado.
                    const tone = d <= 8 ? '#34d399' : d <= 12 ? '#fbbf24' : '#f87171'
                    const verdict =
                      d <= 8
                        ? 'Descuento dentro de lo razonable: comisión + gastos + flete no se comen tu resultado. El neto/kg es tu piso real de negociación.'
                        : d <= 12
                        ? 'Descuento en el límite. Vale comparar comisión entre consignatarias y revisar el flete: cada punto del bruto es plata tuya.'
                        : 'Descuento alto: más del 12% del bruto se va antes de cobrar. Negociá comisión/flete o evaluá vender más cerca de plaza antes de cerrar.'
                    return (
                      <p className="text-data leading-relaxed" style={{ color: tone }}>
                        {verdict}
                      </p>
                    )
                  })()}
                  <p className="text-xxs text-zinc-600 mt-3">
                    IVA hacienda (10,5% ≈ {fmtCurrency(netback.ivaInfo)}) no se descuenta: para responsable
                    inscripto se cobra y se reintegra, es neutro al neto. Valores editables y referenciales.
                  </p>
                </div>
              </div>
            </div>
          </ProReveal>

          <div className="terminal-panel">
            <div className="px-panel py-4">
              <p className="text-xxs text-zinc-500">
                * Valores referenciales basados en precios INMAG. El precio final depende de calidad,
                ubicación, condiciones de pago y negociación. Consultá con tu consignataria de confianza.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="terminal-panel mt-6">
        <div className="px-panel py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-zinc-400">
            ¿Querés vender? Encontrá consignatarias en tu zona.
          </p>
          <Link
            href="/consignatarias"
            className="text-sm text-accent hover:text-accent-bright transition-colors whitespace-nowrap"
          >
            Ver directorio →
          </Link>
        </div>
      </div>

      {/* Share */}
      <div className="mt-6 flex justify-center">
        <a
          href="https://wa.me/?text=Mirá%20esta%20calculadora%20de%20precios%20de%20hacienda%3A%20https%3A%2F%2Fwww.consignatarias.com.ar%2Fcalculadora"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackOutboundClick('https://www.consignatarias.com.ar/calculadora', 'whatsapp')}
          className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Compartir en WhatsApp
        </a>
      </div>

      {/* Lead-gen: el productor calculó su neto en mano → pico de intención de
          venta. Conectarlo con una consignataria de su zona (cabezas y categoría
          del cálculo van como contexto para estimar el fee). */}
      <div className="mt-6">
        <LeadCapture
          source="calculadora"
          defaultIntent="vender"
          presetHeadCount={totals.totalCabezas || undefined}
          presetCategory={items[0]?.categoria}
          title="¿Querés venderla ahora?"
          subtitle="Conectate gratis con una consignataria de tu zona y cerrá la operación."
        />
      </div>
    </div>
  )
}

/**
 * Non-real placeholder shown BLURRED behind the PRO gate to free/anon users.
 * Mirrors the SHAPE of the net-back panel (inputs → waterfall → hero → bars)
 * so the gancho reads as "the decision lives here" — but carries NO real
 * numbers (would leak PRO data) and NO fabricated numbers (brand rule #1).
 * Just skeleton bars / em-dashes.
 */
function NetbackPlaceholder() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-3 gap-3 mb-5">
        {['Comisión %', 'Gastos %', 'Flete $/cab.'].map((l) => (
          <div key={l}>
            <div className="text-xxs text-zinc-600 uppercase tracking-wider mb-1">{l}</div>
            <div className="h-9 bg-zinc-900 border border-zinc-800 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5 mb-5">
        {['Bruto', '− Comisión', '− Gastos', '− Flete'].map((l) => (
          <div key={l} className="flex justify-between items-center">
            <span className="text-data text-zinc-500">{l}</span>
            <div className="h-2.5 w-24 bg-zinc-800 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 pt-5">
        <div className="text-zinc-600 text-xxs font-terminal uppercase tracking-wider mb-2">
          Neto estimado en mano
        </div>
        <div className="text-3xl font-terminal text-zinc-700 leading-none">$ — — —</div>
        <div className="text-xxs text-zinc-700 mt-1">≈ USD — · $—/kg neto</div>
      </div>
      <div className="space-y-2.5 mt-5">
        <div className="h-1.5 bg-zinc-900 border border-terminal-border" />
        <div className="h-1.5 bg-zinc-900 border border-terminal-border" />
      </div>
    </div>
  )
}
