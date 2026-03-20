'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema } from '@/components/seo/JsonLd'

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

export default function SpreadClient() {
  const [data, setData] = useState<SpreadData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/market/spread')
        if (res.ok) {
          setData(await res.json())
        }
      } catch (e) {
        console.error('Failed to fetch spread data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : data ? (
            <>
              {/* Main spread indicator */}
              <div className="flex flex-col items-center mb-6">
                <div className="text-6xl font-bold text-amber-400 mb-2">
                  {data.spread.toFixed(1)}:1
                </div>
                <div className={`text-sm font-medium px-3 py-1 rounded ${
                  data.isProfitable 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {data.isProfitable ? '✓ Rentable para feedlots' : '✗ Margen comprimido'}
                </div>
                <div className="text-zinc-500 text-xs mt-2">
                  Umbral de rentabilidad: {data.profitabilityThreshold}:1
                </div>
              </div>

              {/* Component breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded p-4">
                  <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Novillo (INMAG)</div>
                  <div className="text-xl text-zinc-200">${data.novilloArs.toLocaleString('es-AR')}</div>
                  <div className="text-sm text-zinc-400">ARS/kg vivo</div>
                  <div className="text-xs text-zinc-500 mt-1">≈ USD {data.novilloUsd.toFixed(2)}/kg</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded p-4">
                  <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Maíz FOB</div>
                  <div className="text-xl text-zinc-200">USD {data.cornUsd.toFixed(2)}</div>
                  <div className="text-sm text-zinc-400">USD/tonelada</div>
                  <div className="text-xs text-zinc-500 mt-1">≈ USD {(data.cornUsd / 1000).toFixed(4)}/kg</div>
                </div>
                
                <div className="bg-zinc-800/50 rounded p-4">
                  <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Dólar Blue</div>
                  <div className="text-xl text-zinc-200">${data.usdBlue.toLocaleString('es-AR')}</div>
                  <div className="text-sm text-zinc-400">ARS/USD</div>
                  <div className="text-xs text-zinc-500 mt-1">Fuente: dolarapi.com</div>
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 mb-6">
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

              {/* Feedlot economics explainer */}
              <div className="border-t border-zinc-800 pt-4">
                <h2 className="text-zinc-300 font-medium mb-3">¿Por qué importa esta relación?</h2>
                <div className="text-zinc-400 text-sm space-y-2">
                  <p>
                    • El <strong>maíz representa el 73%</strong> de los costos directos de un feedlot
                  </p>
                  <p>
                    • El margen promedio por animal es de apenas <strong>0.5%</strong> (ARS 6,000 sobre ARS 1.2M)
                  </p>
                  <p>
                    • Un ciclo de engorde típico dura <strong>130 días</strong>
                  </p>
                  <p>
                    • Cuando la relación cae por debajo de <strong>12:1</strong>, los márgenes se vuelven negativos
                  </p>
                </div>
              </div>

              <div className="text-zinc-600 text-xs mt-4 text-right">
                Última actualización: {data.lastUpdate}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              Error al cargar datos. <button onClick={() => window.location.reload()} className="text-amber-400 hover:underline">Reintentar</button>
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
