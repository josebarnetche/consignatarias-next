'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'

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
              <Link key={cat.value} href={`/mercado/${cat.value}`} className="text-center group">
                <div className="text-xxs text-zinc-500 uppercase group-hover:text-amber-400 transition-colors">{cat.label}</div>
                <div className="text-sm text-zinc-200 font-mono group-hover:text-amber-400 transition-colors">
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
          
          {/* PRO Upgrade Prompt */}
          <ProUpgradePrompt
            benefit="Guardá tus cálculos y accedé al historial"
            context="calculadora"
            variant="card"
          />
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
          className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Compartir en WhatsApp
        </a>
      </div>
    </div>
  )
}
