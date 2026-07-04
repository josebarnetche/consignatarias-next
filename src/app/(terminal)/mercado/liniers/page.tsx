import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { TrendingUp, TrendingDown, Building2, MapPin, ExternalLink, BarChart3 } from 'lucide-react'
import marketData from '@/lib/data/market-prices.json'

export const metadata: Metadata = {
  title: 'Mercado de Liniers — Precios de Hacienda Hoy',
  description: 'Precios del Mercado de Liniers actualizados. Cotización de novillos, vacas, terneros y más. Referencia oficial del mercado ganadero argentino.',
  keywords: ['mercado de liniers', 'precios liniers hoy', 'hacienda liniers', 'cotización ganado', 'precios ganado argentina'],
  openGraph: {
    title: 'Mercado de Liniers — Precios de Hacienda Hoy',
    description: 'Cotización actualizada del Mercado de Liniers. Novillos, vacas, terneros y más.',
    url: 'https://www.consignatarias.com.ar/mercado/liniers',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/mercado/liniers',
  },
}

export const revalidate = false // Cost optimization: static at build time

export default function MercadoLiniersPage() {
  const inmag = marketData.inmag as { current: number; change: number; unit: string }
  const categories = marketData.categories as Record<string, { current: number; change: number; source?: string }>
  
  const isPositive = inmag.change >= 0

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/liniers" sectionName="Mercado de Liniers" />
      <TechArticleSchema
        name="Mercado de Liniers - Precios de Hacienda"
        description="Cotización actualizada del Mercado de Liniers, referencia del mercado ganadero argentino. Precios de novillos, vacas, terneros, vaquillonas y toros."
        url="https://www.consignatarias.com.ar/mercado/liniers"
      />
      <FAQPageSchema items={[
        {
          question: '¿Qué es el Mercado de Liniers?',
          answer: 'El Mercado de Liniers funcionó 117 años en el barrio de Mataderos (CABA) hasta su cierre en 2018, cuando su operatoria se mudó a Cañuelas como Mercado Agroganadero (MAG). Históricamente fue la referencia de precios de hacienda del país; hoy esa referencia es el Mercado de Cañuelas, medido por el índice INMAG.'
        },
        {
          question: '¿Cada cuánto se actualizan los precios?',
          answer: 'Los precios se actualizan diariamente a las 14:00 hora argentina, reflejando las operaciones del día anterior.'
        },
        {
          question: '¿Qué categorías de hacienda se cotizan?',
          answer: 'Las principales categorías son: novillos, novillitos, vaquillonas, vacas, toros y terneros. Cada una tiene su precio por kilogramo vivo.'
        },
        {
          question: '¿Qué es el índice INMAG?',
          answer: 'El INMAG (Índice del Mercado Agroganadero) integra datos de múltiples fuentes incluyendo operaciones del Mercado de Liniers y remates en todo el país, ofreciendo una referencia nacional del precio de la hacienda.'
        },
        {
          question: '¿Cómo se relaciona Liniers con los remates en origen?',
          answer: 'Aunque el volumen del Mercado de Liniers ha disminuido con la aparición de remates en origen y ferias locales, sigue siendo un indicador clave. Los precios de Liniers sirven como referencia para los remates regionales.'
        }
      ]} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span>/</span>
            <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
            <span>/</span>
            <span className="text-zinc-300">Liniers</span>
          </nav>
          
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
            Mercado de Liniers
          </h1>
          <p className="text-zinc-400 text-sm">
            El Mercado de Liniers cerró en 2018 y su operatoria se mudó a Cañuelas.{' '}
            <Link href="/mercado/canuelas" className="text-accent hover:text-accent-bright">
              Ver el precio del Mercado de Cañuelas hoy →
            </Link>{' '}
            Los valores de esta página son la referencia INMAG, actualizada a diario.
          </p>
        </div>

        {/* Main Price Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-accent" />
            <span className="text-zinc-400 text-sm">Índice INMAG — Referencia Nacional</span>
          </div>
          
          <div className="flex items-baseline gap-4 mb-2">
            <span className="text-4xl md:text-5xl font-bold text-zinc-100">
              ${inmag.current.toLocaleString('es-AR')}
            </span>
            <span className="text-zinc-500 text-lg">{inmag.unit}</span>
          </div>
          
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{inmag.change.toFixed(1)}% vs. día anterior
            </span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {Object.entries(categories).map(([key, data]) => {
            const labels: Record<string, string> = {
              novillos: 'Novillos',
              novillitos: 'Novillitos',
              vaquillonas: 'Vaquillonas',
              vacas: 'Vacas',
              toros: 'Toros',
              terneros: 'Terneros',
            }
            const catIsPositive = data.change >= 0
            
            return (
              <div key={key} className="bg-zinc-900/30 border border-zinc-800 rounded p-3">
                <p className="text-zinc-400 text-xs mb-1">{labels[key] || key}</p>
                <p className="text-zinc-100 text-lg font-semibold">
                  ${data.current.toLocaleString('es-AR')}
                </p>
                <p className={`text-xs ${catIsPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {catIsPositive ? '+' : ''}{data.change.toFixed(1)}%
                </p>
              </div>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Sobre el Mercado de Liniers
          </h2>
          
          <div className="text-zinc-400 text-sm space-y-4">
            <p>
              El <strong className="text-zinc-200">Mercado de Liniers</strong> (oficialmente Mercado de Hacienda de Liniers)
              fue el principal mercado concentrador de ganado de Argentina, ubicado en el barrio de Mataderos, Buenos Aires.
            </p>
            <p>
              Fundado en 1901, fue durante 117 años la referencia para la formación de precios de hacienda del país.
              Cerró en abril de 2018 y su operatoria se trasladó a Cañuelas como{' '}
              <Link href="/mercado/canuelas" className="text-zinc-200 underline underline-offset-2">Mercado Agroganadero (MAG)</Link>,
              que hoy cumple ese rol de referencia.
            </p>
            <p>
              Los precios mostrados en esta página provienen del <strong className="text-zinc-200">INMAG</strong> (Índice 
              del Mercado Agroganadero), que integra datos de múltiples fuentes incluyendo operaciones del Mercado de Liniers 
              y remates en todo el país.
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-zinc-300 font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            Más datos de mercado
          </h3>
          
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/mercado/inmag" 
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright border border-terminal-border rounded px-3 py-1.5"
            >
              INMAG en vivo <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              href="/mercado/spread" 
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright border border-terminal-border rounded px-3 py-1.5"
            >
              Spread Maíz-Novillo <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              href="/metodologia" 
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright border border-terminal-border rounded px-3 py-1.5"
            >
              Metodología <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              href="/remates" 
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright border border-terminal-border rounded px-3 py-1.5"
            >
              Calendario de remates <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <h3 className="text-zinc-300 font-medium mb-4">Preguntas frecuentes</h3>
          
          <div className="space-y-4 text-sm">
            <details className="group">
              <summary className="text-zinc-200 cursor-pointer hover:text-zinc-100">
                ¿Qué es el Mercado de Liniers?
              </summary>
              <p className="text-zinc-400 mt-2 pl-4">
                Funcionó 117 años en Mataderos (CABA) hasta 2018, cuando se mudó a Cañuelas como Mercado
                Agroganadero (MAG). Hoy la referencia de precios es el{' '}
                <Link href="/mercado/canuelas" className="text-accent hover:text-accent-bright">Mercado de Cañuelas</Link>,
                medido por el índice INMAG.
              </p>
            </details>
            
            <details className="group">
              <summary className="text-zinc-200 cursor-pointer hover:text-zinc-100">
                ¿Cada cuánto se actualizan los precios?
              </summary>
              <p className="text-zinc-400 mt-2 pl-4">
                Los precios se actualizan diariamente a las 14:00 hora argentina, reflejando las operaciones 
                del día anterior.
              </p>
            </details>
            
            <details className="group">
              <summary className="text-zinc-200 cursor-pointer hover:text-zinc-100">
                ¿Qué categorías de hacienda se cotizan?
              </summary>
              <p className="text-zinc-400 mt-2 pl-4">
                Las principales categorías son: novillos, novillitos, vaquillonas, vacas, toros y terneros. 
                Cada una tiene su precio por kilogramo vivo.
              </p>
            </details>
          </div>
        </div>
      </div>
    </>
  )
}
