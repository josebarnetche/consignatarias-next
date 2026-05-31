import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, TechArticleSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { TrendingUp, TrendingDown, Building2, MapPin, ExternalLink, BarChart3 } from 'lucide-react'
import marketData from '@/lib/data/market-prices.json'

const inmagVal = (marketData.inmag as { current: number }).current

export const metadata: Metadata = {
  title: `Precio Mercado de Cañuelas Hoy: $${inmagVal.toLocaleString('es-AR')}/kg vivo · Hacienda MAG`,
  description: `Precio del Mercado de Cañuelas (Mercado Agroganadero, ex Liniers) hoy: novillo $${inmagVal.toLocaleString('es-AR')}/kg vivo. Cotización diaria de novillos, vacas, terneros y vaquillonas vía el índice INMAG. Referencia del mercado ganadero argentino.`,
  keywords: [
    'precio mercado de cañuelas hoy', 'mercado de cañuelas', 'mercado agroganadero canuelas',
    'precio canuelas hacienda', 'cotización cañuelas', 'precio novillo cañuelas',
    'mercado agroganadero precios', 'MAG cañuelas precios hoy',
  ],
  openGraph: {
    title: `Precio Mercado de Cañuelas Hoy: $${inmagVal.toLocaleString('es-AR')}/kg vivo`,
    description: 'Cotización diaria del Mercado de Cañuelas (Mercado Agroganadero, ex Liniers) vía índice INMAG. Novillos, vacas, terneros y más.',
    url: 'https://www.consignatarias.com.ar/mercado/canuelas',
    type: 'website',
  },
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/canuelas' },
}

export const revalidate = false // static at build time; refreshed by the daily build-trigger

const FAQS = [
  {
    question: '¿Cuál es el precio del Mercado de Cañuelas hoy?',
    answer: `Al último cierre, el novillo en el Mercado de Cañuelas (Mercado Agroganadero) cotiza a $${inmagVal.toLocaleString('es-AR')} por kilo vivo según el índice INMAG. El valor actualiza cada día hábil al cierre de operaciones.`,
  },
  {
    question: '¿Qué es el Mercado de Cañuelas?',
    answer: 'El Mercado de Cañuelas es el Mercado Agroganadero (MAG), el principal mercado concentrador de hacienda de Argentina. Opera en Cañuelas, provincia de Buenos Aires, desde 2018, cuando reemplazó al histórico Mercado de Liniers que funcionó en CABA hasta abril de ese año.',
  },
  {
    question: '¿Es lo mismo el Mercado de Cañuelas que el de Liniers?',
    answer: 'Es su continuación. El Mercado de Liniers cerró en 2018 tras 117 años en el barrio de Mataderos (CABA) y su operatoria se mudó a Cañuelas como Mercado Agroganadero. Cuando en el campo se dice "precio Liniers" hoy se refiere, en la práctica, al precio del Mercado de Cañuelas / INMAG.',
  },
  {
    question: '¿Qué es el índice INMAG?',
    answer: 'El INMAG (Índice Novillo Mercado Agroganadero) es el precio promedio ponderado por volumen del novillo operado en el Mercado de Cañuelas, publicado al cierre de cada día hábil. Es la referencia de precio más usada del mercado ganadero argentino.',
  },
  {
    question: '¿Cada cuánto se actualizan los precios de Cañuelas?',
    answer: 'Cada día hábil entre las 17 y las 19 horas (ART), después del cierre de operaciones del Mercado Agroganadero. Fines de semana y feriados no hay valor nuevo.',
  },
]

export default function MercadoCanuelasPage() {
  const inmag = marketData.inmag as { current: number; change: number; unit: string }
  const categories = marketData.categories as Record<string, { current: number; change: number; source?: string }>
  const isPositive = inmag.change >= 0

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/canuelas" sectionName="Mercado de Cañuelas" />
      <TechArticleSchema
        name="Precio del Mercado de Cañuelas - Hacienda hoy"
        description="Cotización diaria del Mercado de Cañuelas (Mercado Agroganadero, ex Liniers) vía índice INMAG. Novillos, vacas, terneros, vaquillonas y toros por kilo vivo."
        url="https://www.consignatarias.com.ar/mercado/canuelas"
        dateModified={(marketData as { lastUpdate?: string }).lastUpdate}
        citations={[
          { name: 'Mercado Agroganadero de Buenos Aires (INMAG)', url: 'https://www.mercadoagroganadero.com.ar' },
        ]}
      />
      <FAQPageSchema items={FAQS} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span>/</span>
            <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
            <span>/</span>
            <span className="text-zinc-300">Cañuelas</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
            Precio del Mercado de Cañuelas hoy
          </h1>
          {/* Answer-first lede — self-contained snippet bridging Cañuelas → MAG → INMAG */}
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            El <strong className="text-zinc-200">Mercado de Cañuelas</strong> es el Mercado Agroganadero (MAG),
            el principal mercado de hacienda de Argentina y continuador del Mercado de Liniers desde 2018. Su
            precio de referencia es el <strong className="text-zinc-200">índice INMAG</strong>, que hoy ubica al
            novillo en <strong className="text-zinc-200">${inmag.current.toLocaleString('es-AR')}/kg vivo</strong>,
            actualizado cada día hábil.
          </p>
        </div>

        {/* Main Price Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-amber-500" />
            <span className="text-zinc-400 text-sm">Mercado de Cañuelas (MAG) — Índice INMAG</span>
          </div>

          <div className="flex items-baseline gap-4 mb-2">
            <span className="text-4xl md:text-5xl font-bold text-zinc-100">
              ${inmag.current.toLocaleString('es-AR')}
            </span>
            <span className="text-zinc-500 text-lg">{inmag.unit}</span>
          </div>

          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{inmag.change.toFixed(1)}% vs. día anterior
            </span>
          </div>
          {(marketData as { lastUpdate?: string }).lastUpdate && (
            <p className="text-zinc-600 text-xs mt-3">
              Actualizado: {(marketData as { lastUpdate?: string }).lastUpdate} · Fuente: Mercado Agroganadero (INMAG)
            </p>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {Object.entries(categories).map(([key, data]) => {
            const labels: Record<string, string> = {
              novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
              vacas: 'Vacas', toros: 'Toros', terneros: 'Terneros',
            }
            const catIsPositive = data.change >= 0
            return (
              <div key={key} className="bg-zinc-900/30 border border-zinc-800 rounded p-3">
                <p className="text-zinc-400 text-xs mb-1">{labels[key] || key}</p>
                <p className="text-zinc-100 text-lg font-semibold">${data.current.toLocaleString('es-AR')}</p>
                <p className={`text-xs ${catIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {catIsPositive ? '+' : ''}{data.change.toFixed(1)}%
                </p>
              </div>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            Cañuelas, el Mercado Agroganadero (ex Liniers)
          </h2>
          <div className="text-zinc-400 text-sm space-y-4">
            <p>
              El <strong className="text-zinc-200">Mercado Agroganadero (MAG)</strong> opera en Cañuelas, provincia
              de Buenos Aires, desde 2018. Reemplazó al histórico <strong className="text-zinc-200">Mercado de
              Liniers</strong>, que funcionó 117 años en el barrio porteño de Mataderos hasta su cierre en abril de
              ese año.
            </p>
            <p>
              Es el principal mercado concentrador de hacienda del país y la referencia de formación de precios. Su
              índice, el <Link href="/mercado/inmag" className="text-amber-500 hover:text-amber-400">INMAG</Link>,
              es el promedio ponderado por volumen del novillo operado cada día hábil. Cuando en el campo se habla
              de &ldquo;precio Liniers&rdquo;, hoy se refiere en la práctica al precio de Cañuelas.
            </p>
            <p>
              Para la serie histórica desde 2015, el INMAG en dólares y la metodología completa, ver{' '}
              <Link href="/mercado/inmag" className="text-amber-500 hover:text-amber-400">la página del INMAG</Link>.
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-zinc-300 font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Más datos de mercado
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/mercado/inmag', label: 'INMAG en vivo' },
              { href: '/mercado/inmag-dolares', label: 'INMAG en dólares' },
              { href: '/mercado/liniers', label: 'Mercado de Liniers (histórico)' },
              { href: '/mercado/spread', label: 'Spread Maíz-Novillo' },
              { href: '/remates', label: 'Calendario de remates' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5">
                {l.label} <ExternalLink className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t border-zinc-800 pt-6 mt-6">
          <h3 className="text-zinc-300 font-medium mb-4">Preguntas frecuentes</h3>
          <div className="space-y-4 text-sm">
            {FAQS.map((f) => (
              <details key={f.question} className="group">
                <summary className="text-zinc-200 cursor-pointer hover:text-zinc-100">{f.question}</summary>
                <p className="text-zinc-400 mt-2 pl-4 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
