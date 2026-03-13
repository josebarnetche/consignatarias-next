'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

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

    const totalValorUSD = totalValorARS / prices.usdBlue.current

    return { totalCabezas, totalKilos, totalValorARS, totalValorUSD }
  }, [items, prices])

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault()
    
    if (email && !emailSaved) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'calculadora' }),
        })
        setEmailSaved(true)
      } catch {
        // Continue anyway
      }
    }
    
    setShowResult(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/mercado" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Ver precios de mercado
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
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
              <div key={cat.value} className="text-center">
                <div className="text-xxs text-zinc-500 uppercase">{cat.label}</div>
                <div className="text-sm text-zinc-200 font-mono">
                  {price ? fmtCurrency(price.current) : '—'}
                </div>
              </div>
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
        <div className="terminal-panel mt-6">
          <div className="terminal-panel-header text-emerald-400">Valor estimado</div>
          <div className="px-panel py-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Total cabezas</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(totals.totalCabezas)}</div>
              </div>
              <div>
                <div className="text-xxs text-zinc-500 uppercase mb-1">Total kilos</div>
                <div className="text-2xl text-zinc-100 font-mono">{fmt(totals.totalKilos)} kg</div>
              </div>
            </div>
            
            <div className="border-t border-zinc-800 pt-6">
              <div className="text-xxs text-zinc-500 uppercase mb-2">Valor estimado</div>
              <div className="text-3xl text-emerald-400 font-mono font-medium mb-1">
                {fmtCurrency(totals.totalValorARS)}
              </div>
              <div className="text-lg text-zinc-400 font-mono">
                ≈ USD {fmt(totals.totalValorUSD)} <span className="text-xxs text-zinc-500">(blue ${fmt(prices.usdBlue.current)})</span>
              </div>
            </div>

            <div className="border-t border-zinc-800 mt-6 pt-4">
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
        <div className="px-panel py-4 flex items-center justify-between">
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
    </div>
  )
}
